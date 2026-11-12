#!/usr/bin/env node
/**
 * Public-release safety scan for the showcase repository.
 *
 * Scans every tracked file (plus untracked, non-ignored files) and, when
 * present, the production build in dist/ for credentials, private
 * infrastructure references, personal data patterns and remote URLs.
 * Findings are reported as file:line + rule name. Matched values are NEVER
 * printed, so the report itself cannot leak a secret.
 *
 * Exit code 1 when anything is found.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

const RULES = [
  // Credentials
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["aws-access-key", /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["github-token", /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|github_pat_[A-Za-z0-9_]{40,}/],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["stripe-key", /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["vercel-token", /\bvercel_[A-Za-z0-9]{20,}|VERCEL_TOKEN\s*=/i],
  ["supabase-key", /\bsb[ps]_[A-Za-z0-9_-]{20,}|SUPABASE_(SERVICE_ROLE|ANON)_KEY/i],
  ["db-connection-string", /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s"'`]+/i],
  ["credential-assignment", /\b(api[_-]?key|secret|password|passwd|token|auth[_-]?token|client[_-]?secret|jwt[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{8,}["']/i],
  ["env-file-content", /^\s*(DATABASE_URL|DIRECT_URL|JWT_SECRET|SESSION_SECRET|NEXTAUTH_SECRET)\s*=/m],
  // Private infrastructure / implementation references
  ["production-host", /\b[a-z0-9-]+\.(onrender\.com|supabase\.(co|in)|vercel\.app|herokuapp\.com|azurewebsites\.net)\b/i],
  ["internal-domain", /\b[a-z0-9.-]+\.(local|internal|corp|lan)\b/i],
  ["private-repo-reference", /\bFahd070\/pure-home(?!-showcase)\b|WFM-System|@wfm\/|water-filter-maintenance/i],
  ["private-stack-reference", /\bprisma\b|_prisma_migrations|socket\.io|electron-builder|render\.yaml/i],
  // Personal data patterns
  ["email-address", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ["full-phone-number", /(\+?966[\s-]?|\b0)5\d[\s-]?\d{3}[\s-]?\d{4}\b/],
  ["national-id-like", /\b[12]\d{9}\b/],
  ["iban", /\bSA\d{2}[0-9A-Z]{20}\b/],
  // Network surface
  ["remote-url", /\b(?:https?|wss?):\/\/[^\s"'`)<>]+/i],
];

/** Hosts that may legitimately appear (documentation links and XML namespaces). */
const URL_ALLOW = [
  /^https?:\/\/www\.w3\.org\//,
  /^https:\/\/openapi\.vercel\.sh\/vercel\.json$/,
  /^https?:\/\/localhost(:\d+)?\b/,
  /^https:\/\/(react\.dev|vite\.dev|vitejs\.dev|tailwindcss\.com|playwright\.dev|vitest\.dev|www\.typescriptlang\.org|reactrouter\.com)\b/,
];

/** Rule exceptions that are known-safe, keyed as `file:rule`. Keep this list short and justified. */
const EXCEPTIONS = new Set([
  "scripts/public-safety-scan.mjs:*", // this file contains the patterns themselves
  "tests/isolation.test.ts:remote-url", // a regex that asserts the absence of URLs
  "e2e/smoke.spec.ts:remote-url", // the CSP test deliberately attempts a request and asserts it is blocked
]);

// React's production bundle contains reactjs.org error-decoder URLs and the SVG namespace.
// Library strings that are never requested: React/React Router error-message documentation links,
// XML namespaces, and the `http://localhost` base React Router uses to parse relative URLs.
const DIST_URL_ALLOW = [
  /^https:\/\/react\.dev\/errors\//,
  /^https:\/\/reactjs\.org\/docs\/error-decoder/,
  /^http:\/\/www\.w3\.org\//,
  /^http:\/\/localhost$/,
  /^https:\/\/reactrouter\.com\/en\/main\//,
  /^https:\/\/github\.com\/ungap\/url-search-params\.?$/,
];

/** Exact, explained values that minified library code is known to contain. Anything else still fails. */
const DIST_VALUE_ALLOW = {
  // React scheduler lane constants (2^30 - 1, 2^30, 2^30 + 1) and the mulberry32 PRNG increment 0x6D2B79F5.
  "national-id-like": /^(1073741823|1073741824|1073741825|1831565813)$/,
  // React Router's ErrorResponse `internal` flag accessed on a minified identifier (e.g. `i.internal`).
  "internal-domain": /^([a-z]|this)\.internal$/,
};

const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip|gz|pdf)$/i;

function gitFiles() {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return walk(ROOT).map((p) => relative(ROOT, p).replace(/\\/g, "/")).filter((p) => !/^(node_modules|dist|\.git)\//.test(p));
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * The lockfile legitimately lists package tarball and funding URLs. Instead of
 * the generic URL rule it gets a stricter one: every resolved package must come
 * from the public npm registry (no private registries or git dependencies).
 */
function scanLockfile(file, text) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const m = line.match(/"resolved":\s*"([^"]+)"/);
    if (m && !m[1].startsWith("https://registry.npmjs.org/")) findings.push({ file, line: i + 1, rule: "non-public-registry", length: m[1].length });
    for (const [rule, re] of RULES) {
      if (rule === "remote-url" || rule === "national-id-like") continue; // integrity hashes and versions are not IDs
      if (re.test(line)) findings.push({ file, line: i + 1, rule, length: 0 });
    }
  });
  return findings;
}

function scanText(file, text, { dist = false } = {}) {
  if (file === "package-lock.json") return scanLockfile(file, text);
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [rule, re] of RULES) {
      if (EXCEPTIONS.has(`${file}:*`) || EXCEPTIONS.has(`${file}:${rule}`)) continue;
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      for (const m of line.matchAll(g)) {
        const value = m[0];
        if (rule === "remote-url") {
          const allow = dist ? DIST_URL_ALLOW : URL_ALLOW;
          if (allow.some((a) => a.test(value))) continue;
        }
        if (dist && DIST_VALUE_ALLOW[rule]?.test(value)) continue;
        // Showcase phones are always masked ("+966 5• ••• 1234") and never match full-phone-number.
        findings.push({ file, line: i + 1, rule, length: value.length });
      }
    }
  });
  return findings;
}

function scanImageMetadata(file) {
  // PNG screenshots are generated by Playwright; flag any text chunk (tEXt/iTXt/zTXt) or EXIF payload.
  const buf = readFileSync(join(ROOT, file));
  const findings = [];
  if (buf.subarray(1, 4).toString() === "PNG") {
    let off = 8;
    while (off < buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.subarray(off + 4, off + 8).toString("latin1");
      if (["tEXt", "iTXt", "zTXt", "eXIf"].includes(type)) findings.push({ file, line: 0, rule: `image-metadata:${type}`, length: len });
      off += 12 + len;
    }
  } else if (/\.(jpe?g)$/i.test(file) && buf.includes(Buffer.from("Exif"))) {
    findings.push({ file, line: 0, rule: "image-metadata:exif", length: 0 });
  }
  return findings;
}

/**
 * `--history`: scan every blob reachable from any ref (all commits, branches,
 * tags), not just the working tree, and audit commit identities, refs and
 * remotes. A clean working tree alone is not evidence that history is clean.
 */
if (process.argv.includes("--history")) {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const out = [];
  const objects = git("rev-list", "--all", "--objects").split("\n").filter(Boolean);
  let blobs = 0;
  for (const row of objects) {
    const [sha, ...rest] = row.split(" ");
    const path = rest.join(" ");
    if (!path || git("cat-file", "-t", sha).trim() !== "blob") continue;
    blobs++;
    const name = path.split("/").pop();
    if (/^(\.env.*|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_rsa.*)$/i.test(name)) out.push({ file: `${path}@${sha.slice(0, 8)}`, line: 0, rule: "sensitive-filename", length: 0 });
    if (BINARY.test(path)) continue;
    out.push(...scanText(path, git("cat-file", "-p", sha)).map((f) => ({ ...f, file: `${f.file}@${sha.slice(0, 8)}` })));
  }
  const commits = git("rev-list", "--all").split("\n").filter(Boolean);
  const idents = new Set(git("log", "--all", "--format=%an <%ae>|%cn <%ce>").split("\n").filter(Boolean).flatMap((l) => l.split("|")));
  for (const id of idents) {
    if (!/@users\.noreply\.github\.com>$|<noreply@anthropic\.com>$/.test(id)) out.push({ file: "commit-identity", line: 0, rule: "non-noreply-email", length: id.length });
  }
  const refs = git("for-each-ref", "--format=%(refname)").split("\n").filter(Boolean);
  const remotes = git("remote").split("\n").filter(Boolean);
  console.log(`History scan: ${commits.length} commit(s), ${blobs} blob(s), refs: ${refs.join(", ") || "none"}, remotes: ${remotes.join(", ") || "none"}`);
  console.log(`  identities: ${[...idents].map((i) => i.replace(/<[^>]*>/, (e) => (/noreply/.test(e) ? e : "<withheld>"))).join("; ")}`);
  if (out.length) {
    for (const f of out) console.log(`  ✗ ${f.file}:${f.line}  [${f.rule}]  (value withheld, ${f.length} chars)`);
    process.exit(1);
  }
  console.log("  ✓ No findings in history.");
  process.exit(0);
}

const findings = [];
const files = gitFiles();
let scanned = 0;
for (const f of files) {
  if (!existsSync(join(ROOT, f))) continue;
  if (/^(\.env|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_rsa.*)$/i.test(f.split("/").pop())) {
    findings.push({ file: f, line: 0, rule: "sensitive-filename", length: 0 });
    continue;
  }
  if (BINARY.test(f)) {
    if (/\.(png|jpe?g)$/i.test(f)) findings.push(...scanImageMetadata(f));
    scanned++;
    continue;
  }
  findings.push(...scanText(f, readFileSync(join(ROOT, f), "utf8")));
  scanned++;
}

let distScanned = 0;
if (existsSync(join(ROOT, "dist"))) {
  for (const p of walk(join(ROOT, "dist"))) {
    const rel = relative(ROOT, p).replace(/\\/g, "/");
    if (p.endsWith(".map")) findings.push({ file: rel, line: 0, rule: "source-map-in-build", length: 0 });
    if (BINARY.test(p)) continue;
    findings.push(...scanText(rel, readFileSync(p, "utf8"), { dist: true }));
    distScanned++;
  }
}

console.log(`Public safety scan: ${scanned} repository files, ${distScanned} build files.`);
if (findings.length) {
  for (const f of findings) console.log(`  ✗ ${f.file}:${f.line}  [${f.rule}]  (value withheld, ${f.length} chars)`);
  console.log(`${findings.length} finding(s).`);
  process.exit(1);
}
console.log("  ✓ No findings.");
