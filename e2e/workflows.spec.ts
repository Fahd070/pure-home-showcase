import { readFileSync } from "node:fs";
import { expect, test } from "./fixtures";

test("customer search, filters and sorting", async ({ page }) => {
  await page.goto("/customers");
  await expect(page.getByTestId("customer-count")).toContainText("of 2,400");
  await page.getByTestId("customer-search").fill("Harbor Fitness");
  await expect(page.getByTestId("customer-table").locator("tbody tr").first()).toContainText("Harbor Fitness");
  await page.getByTestId("customer-search").fill("zzzz-no-match");
  await expect(page.getByText("No matching records.")).toBeVisible();
  await page.getByTestId("customer-search").fill("");
  await page.getByRole("button", { name: /^Overdue/ }).click();
  await expect(page).toHaveURL(/health=overdue/);
  const rows = page.getByTestId("customer-table").locator("tbody tr");
  await expect(rows.first()).toContainText("Overdue");
  expect(await rows.filter({ hasNotText: "Overdue" }).count()).toBe(0);
});

test("overdue customer: previous vs next service, then book the next visit", async ({ page }) => {
  await page.goto("/customers?health=overdue");
  await page.getByTestId("customer-table").locator("tbody tr").first().locator("a").click();
  const compare = page.getByTestId("service-compare");
  await expect(compare).toContainText("Previous service");
  await expect(compare).toContainText("Projected");
  await expect(compare).toContainText("days overdue");
  await page.getByTestId("book-next").click();
  // Leave the visit for dispatch so the test never depends on a technician's free slots.
  await page.getByTestId("appt-tech").selectOption("");
  await page.getByTestId("appt-date").fill("2026-11-16");
  await page.getByTestId("appt-time").selectOption("16:30");
  await page.getByTestId("appt-submit").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(compare).toContainText("Booked");
  await expect(page.getByTestId("next-date")).toContainText("16 Nov 2026");
});

test("booking validation blocks rest days, past dates and out-of-hours slots", async ({ page }) => {
  await page.goto("/customers/c-5");
  await page.getByTestId("profile-book").click();
  await page.getByTestId("appt-date").fill("2026-11-13"); // Friday
  await page.getByTestId("appt-submit").click();
  await expect(page.getByTestId("appt-problems")).toContainText("Friday is the weekly rest day");
  await page.getByTestId("appt-date").fill("2026-11-10");
  await page.getByTestId("appt-submit").click();
  await expect(page.getByTestId("appt-problems")).toContainText("The date is in the past");
  await page.getByTestId("appt-date").fill("2026-11-15");
  await page.getByTestId("appt-time").selectOption("17:30");
  await page.getByTestId("appt-submit").click();
  await expect(page.getByTestId("appt-problems")).toContainText("working hours");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("drag a visit to another day on the dispatch board", async ({ page }) => {
  await page.goto("/schedule");
  await page.getByTestId("next-week").click();
  const board = page.getByTestId("dispatch-board");
  const row = board.locator("tbody tr").nth(1);
  const chip = row.getByTestId("visit-chip").first();
  const code = await chip.getAttribute("data-visit");
  const target = row.locator("td").last(); // Saturday column of the same technician
  await chip.dragTo(target);
  const toast = page.getByRole("status");
  await expect(toast).toContainText(/Visit rescheduled|already has/);
  if ((await toast.innerText()).includes("rescheduled")) {
    await expect(target.locator(`[data-visit="${code}"]`)).toHaveCount(1);
    await target.locator(`[data-visit="${code}"]`).click();
    await expect(page.getByTestId("appointment-detail")).toContainText("Moved from");
  }
});

test("reschedule into a conflicting slot is rejected with the reason", async ({ page }) => {
  await page.goto("/schedule");
  await page.getByTestId("next-week").click();
  const row = page.getByTestId("dispatch-board").locator("tbody tr").nth(1);
  const cells = row.locator("td");
  // Pick two visits for the same technician on different days.
  const n = await cells.count();
  const withVisits: number[] = [];
  for (let i = 0; i < n; i++) if ((await cells.nth(i).getByTestId("visit-chip").count()) > 0) withVisits.push(i);
  test.skip(withVisits.length < 2, "needs two days with visits");
  const first = cells.nth(withVisits[0]).getByTestId("visit-chip").first();
  await first.click();
  const slotText = await page.getByTestId("appointment-detail").locator("dd").nth(2).innerText();
  const time = slotText.match(/(\d\d:\d\d)–/)![1];
  await page.keyboard.press("Escape");
  const dateAttr = await cells.nth(withVisits[0]).getAttribute("data-cell");
  const date = dateAttr!.split("|")[1];

  await cells.nth(withVisits[1]).getByTestId("visit-chip").first().click();
  await page.getByTestId("detail-reschedule").click();
  await page.getByTestId("appt-date").fill(date);
  await page.getByTestId("appt-time").selectOption(time);
  await page.getByTestId("appt-submit").click();
  await expect(page.getByTestId("appt-problems")).toContainText("already has");
});

test("workforce: technician completes a field checklist", async ({ page }) => {
  await page.goto("/workforce");
  const techs = page.getByTestId("tech-list").locator("li button");
  const count = await techs.count();
  for (let i = 0; i < count; i++) {
    await techs.nth(i).click();
    if ((await page.getByTestId("arrive").count()) > 0) break;
  }
  const tasks = page.getByTestId("route-task");
  let index = 0;
  while ((await tasks.nth(index).getByTestId("arrive").count()) === 0) index++;
  const task = tasks.nth(index); // positional, so it keeps matching after the status changes
  await task.getByTestId("arrive").click();
  await expect(task).toContainText("In progress");
  const steps = task.getByTestId("step");
  for (let i = 0; i < (await steps.count()); i++) await steps.nth(i).check();
  await expect(task).toContainText("Completed");
});

test("reports filter and CSV export happen locally", async ({ page, offsite }) => {
  await page.goto("/reports");
  const rate = await page.getByTestId("completion-rate").innerText();
  expect(rate).toMatch(/%$/);
  await page.locator("#report-period").selectOption("p30");
  await page.getByRole("button", { name: /show data table/i }).click();
  await expect(page.getByTestId("volume-table").locator("tbody tr")).toHaveCount(2);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  expect(download.suggestedFilename()).toMatch(/^service-visits-2026-10-14-to-2026-11-12\.csv$/);
  const csv = readFileSync((await download.path())!, "utf8");
  expect(csv.split("\r\n")[0]).toBe("\uFEFFvisit,date,start,type,status,customer_code,customer,zone,technician");
  expect(csv.split("\r\n").length).toBeGreaterThan(50);
  expect(offsite).toEqual([]);
});

test("new customer persists across reload and reset restores the dataset", async ({ page }) => {
  await page.goto("/customers");
  await page.getByTestId("add-customer").click();
  await page.getByTestId("customer-submit").click();
  await expect(page.getByText("Enter at least 3 characters.")).toBeVisible();
  await page.getByTestId("customer-name").fill("Demo Visitor");
  await page.getByTestId("customer-phone").fill("1234");
  await page.getByTestId("customer-submit").click();
  await expect(page.getByTestId("customer-title")).toHaveText("Demo Visitor");
  const url = page.url();
  await page.reload();
  await expect(page.getByTestId("customer-title")).toHaveText("Demo Visitor");

  await page.getByTestId("reset-demo").click();
  await page.getByTestId("confirm-reset").click();
  await page.goto(url);
  await expect(page.getByText("This customer does not exist in the demo dataset.")).toBeVisible();
  await page.goto("/customers");
  await expect(page.getByTestId("customer-count")).toContainText("of 2,400");
});
