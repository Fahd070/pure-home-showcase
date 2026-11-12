import { expect, setArabic, test } from "./fixtures";

const OUT = "docs/screenshots";
const shots: { name: string; path: string; lang?: "ar"; theme?: "dark"; mobile?: boolean; prep?: (p: import("@playwright/test").Page) => Promise<void> }[] = [
  { name: "overview", path: "/" },
  { name: "customers", path: "/customers" },
  { name: "customer-profile", path: "/customers/c-1" },
  { name: "scheduling", path: "/schedule" },
  { name: "workforce", path: "/workforce" },
  { name: "reports", path: "/reports" },
  { name: "overview-ar", path: "/", lang: "ar" },
  { name: "scheduling-ar", path: "/schedule", lang: "ar" },
  { name: "overview-dark", path: "/", theme: "dark" },
  { name: "mobile-customers", path: "/customers", mobile: true },
  { name: "mobile-profile-ar", path: "/customers/c-1", mobile: true, lang: "ar" },
];

for (const s of shots) {
  test(s.name, async ({ page }) => {
    if (s.mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: s.theme === "dark" ? "dark" : "light", reducedMotion: "reduce" });
    await page.goto("/");
    if (s.lang === "ar") await setArabic(page);
    await page.goto(s.path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
  });
}
