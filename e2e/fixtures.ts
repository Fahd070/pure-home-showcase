import { test as base, expect, type Page } from "@playwright/test";

/** Thursday 11:30 local — a working day, so "today" always has field activity. */
export const DEMO_NOW = new Date(2026, 10, 12, 11, 30);

export const ROUTES = ["/", "/customers", "/customers/c-1", "/schedule", "/workforce", "/reports", "/about"];

type Fixtures = { offsite: string[]; consoleErrors: string[] };

/**
 * Every test gets a frozen clock, a clean localStorage, and two recorders:
 * requests that leave localhost, and console errors. Both must stay empty.
 */
export const test = base.extend<Fixtures>({
  offsite: async ({ page }, use) => {
    const hits: string[] = [];
    // The app's own origin is the local preview, or the deployment under test when BASE_URL is set.
    const own = new Set(["localhost", "127.0.0.1", ...(process.env.BASE_URL ? [new URL(process.env.BASE_URL).hostname] : [])]);
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (!own.has(u.hostname) && !["data:", "blob:"].includes(u.protocol)) hits.push(r.url());
    });
    await use(hits);
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    await use(errors);
  },
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(DEMO_NOW);
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("__e2e_init")) {
        localStorage.clear();
        sessionStorage.setItem("__e2e_init", "1");
      }
    });
    await use(page);
  },
});

export { expect };

export async function setArabic(page: Page) {
  await page.getByTestId("toggle-language").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
}
