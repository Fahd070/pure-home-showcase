import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { ar } from "../src/i18n/ar";

const ROOT = join(__dirname, "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const sources = walk(join(ROOT, "src")).filter((p) => /\.(ts|tsx|css)$/.test(p));

describe("mock data isolation", () => {
  it("source code contains no network APIs", () => {
    const forbidden = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.sendBeacon|io\()\s*\(/;
    for (const file of sources) {
      expect(forbidden.test(readFileSync(file, "utf8")), file).toBe(false);
    }
  });

  it("source code references no remote URLs", () => {
    // Only the SVG namespace may appear; it is an identifier, never requested.
    const url = /\b(?:https?|wss?):\/\/(?!www\.w3\.org\/2000\/svg)[^\s"'`)]+/g;
    for (const file of sources) {
      expect(readFileSync(file, "utf8").match(url), file).toBeNull();
    }
  });

  it("index.html loads nothing from another origin", () => {
    const html = readFileSync(join(ROOT, "index.html"), "utf8");
    expect(html).not.toMatch(/(src|href)=["']https?:/);
  });

  it("depends on no data-fetching, auth or backend SDKs", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps.sort()).toEqual(["react", "react-dom", "react-router-dom"]);
  });
});

describe("localisation", () => {
  function keys(o: unknown, prefix = ""): string[] {
    if (typeof o === "string") return [prefix];
    if (Array.isArray(o)) return [`${prefix}[${o.length}]`];
    return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  }

  it("Arabic and English dictionaries have identical keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("interpolation placeholders match between languages", () => {
    const flat = (o: unknown, p = ""): [string, string][] =>
      typeof o === "string" ? [[p, o]] : Array.isArray(o) ? [] : Object.entries(o as object).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));
    const arMap = new Map(flat(ar));
    for (const [k, v] of flat(en)) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(ph(arMap.get(k)!), k).toEqual(ph(v));
    }
  });

  it("every Arabic string is translated (not copied from English)", () => {
    const flat = (o: unknown, p = ""): [string, string][] =>
      typeof o === "string" ? [[p, o]] : Array.isArray(o) ? [] : Object.entries(o as object).flatMap(([k, v]) => flat(v, p ? `${p}.${k}` : k));
    const enMap = new Map(flat(en));
    // Brand name and technical tokens are intentionally identical.
    const allowed = new Set(["app.name", "reports.exportName"]);
    for (const [k, v] of flat(ar)) {
      if (!allowed.has(k)) expect(v, k).not.toBe(enMap.get(k));
    }
  });
});
