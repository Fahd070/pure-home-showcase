import { ROUTES, expect, setArabic, test } from "./fixtures";

test.describe("navigation & isolation", () => {
  for (const route of ROUTES) {
    test(`${route} renders offline with no errors`, async ({ page, offsite, consoleErrors }) => {
      await page.goto(route);
      await expect(page.getByTestId("demo-notice")).toContainText("All displayed information is fictional");
      await expect(page.locator("main h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(offsite).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test("sidebar navigation reaches every module", async ({ page }) => {
    await page.goto("/");
    for (const [label, heading] of [["Customers", "Customers"], ["Scheduling", "Scheduling"], ["Workforce", "Workforce"], ["Reports", "Reports"], ["Overview", "Overview"]]) {
      await page.getByRole("link", { name: new RegExp(`^${label}`) }).first().click();
      await expect(page.locator("main h1")).toHaveText(heading);
    }
  });

  test("Content-Security-Policy blocks any outbound request", async ({ page, offsite }) => {
    await page.goto("/");
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
    expect(csp).toContain("connect-src 'none'");
    const result = await page.evaluate(() => window["fetch"]("https://example.com/").then(() => "sent", () => "blocked"));
    expect(result).toBe("blocked");
    expect(offsite).toEqual([]);
  });

  test("the dataset is identical on every fresh load (op-log replay depends on it)", async ({ page }) => {
    const read = async () => {
      await page.goto("/about");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/");
      return Promise.all(["kpi-customers", "kpi-today", "kpi-month", "kpi-overdue"].map((id) => page.getByTestId(id).innerText()));
    };
    const first = await read();
    for (let i = 0; i < 4; i++) expect(await read()).toEqual(first);
  });

  test("unknown routes show a not-found state", async ({ page }) => {
    await page.goto("/does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
  });
});

test.describe("localisation", () => {
  test("Arabic switches the whole layout to RTL and persists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await setArabic(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("main h1")).toHaveText("نظرة عامة");
    await expect(page.getByTestId("demo-notice")).toContainText("جميع البيانات المعروضة وهمية");
    // Navigation rail sits on the right in RTL.
    const rail = await page.locator("aside").first().boundingBox();
    expect(rail!.x).toBeGreaterThan(700);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("main h1").first()).toBeVisible();
      // No untranslated English nav labels leak into Arabic pages.
      await expect(page.getByRole("link", { name: "Customers", exact: true })).toHaveCount(0);
    }
    await page.getByTestId("toggle-language").click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("dark theme toggles and persists", async ({ page }) => {
    await page.goto("/");
    const before = await page.locator("html").getAttribute("data-theme");
    await page.getByTestId("toggle-theme").click();
    const after = await page.locator("html").getAttribute("data-theme");
    expect(after).not.toBe(before);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", after!);
  });
});

test.describe("responsive", () => {
  for (const width of [375, 768, 1024]) {
    test(`no horizontal page overflow at ${width}px (EN + AR)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 860 });
      for (const lang of ["en", "ar"]) {
        await page.goto("/");
        if (lang === "ar") await setArabic(page);
        for (const route of ROUTES) {
          await page.goto(route);
          await expect(page.locator("main h1").first()).toBeVisible();
          const overflow = await page.evaluate(() => {
            const main = document.getElementById("main")!;
            return {
              doc: document.documentElement.scrollWidth - window.innerWidth,
              main: main.scrollWidth - main.clientWidth,
            };
          });
          expect(overflow.doc, `${lang} ${route} document`).toBeLessThanOrEqual(0);
          expect(overflow.main, `${lang} ${route} main`).toBeLessThanOrEqual(0);
        }
      }
    });
  }

  test("mobile drawer opens, navigates and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page.locator("main h1")).toHaveText("Reports");
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
  });
});
