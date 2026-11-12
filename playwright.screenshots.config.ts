import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** Regenerates the README screenshots in docs/screenshots (fixed clock, fictional data). */
export default defineConfig({
  ...base,
  testIgnore: undefined,
  testMatch: /screenshots\.spec\.ts/,
  workers: 2,
  use: { ...base.use, ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
});
