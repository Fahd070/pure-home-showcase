import { defineConfig, devices } from "@playwright/test";

/** Set BASE_URL to run the suite against a deployed copy instead of the local production preview. */
const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  testIgnore: /screenshots\.spec\.ts/,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: remote ?? "http://localhost:4173",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    trace: "off",
  },
  // Tests run against the production build (with its Content-Security-Policy), not the dev server.
  webServer: remote
    ? undefined
    : { command: "npm run preview", url: "http://localhost:4173", reuseExistingServer: true, timeout: 60_000 },
});
