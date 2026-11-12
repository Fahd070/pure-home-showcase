/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The showcase is fully offline: every record comes from the local mock data
 * layer. The production build ships a Content-Security-Policy that forbids all
 * outbound connections (fetch, XHR, WebSocket, beacons), so even an accidental
 * network call would be blocked by the browser. The dev server is excluded
 * because Vite's HMR client needs inline scripts and a WebSocket.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function cspMeta(): Plugin {
  return {
    name: "showcase-csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<!-- CSP -->",
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  build: { sourcemap: false, target: "es2022" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
