import { expect, test } from "@playwright/test";
import { DEMO, signIn } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
});

test("the dashboard summarizes progress and charts each lift", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Welcome back, Alex" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("14");

  const deadlift = page.getByRole("button", { name: /^Deadlift/ });
  await deadlift.click();
  await expect(deadlift).toHaveAttribute("aria-pressed", "true");
  const chart = page.getByRole("img", { name: /Deadlift: form grade over 4 sessions, from D to B/ });
  await expect(chart).toBeVisible();

  // Keyboard users can step through sessions.
  await chart.focus();
  await page.keyboard.press("Home");
  await expect(page.getByText(/grade D, Injury risk/)).toBeAttached();

  await page.getByRole("button", { name: "Show as table" }).click();
  await expect(page.getByRole("table")).toContainText("Conventional deadlift");
});

test("history filters by lift and opens a review with progress notes", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByText("14 form checks")).toBeVisible();

  await page.getByRole("navigation", { name: "Filter by lift" }).getByRole("link", { name: /Overhead press/ }).click();
  await expect(page.getByText("2 form checks for this lift")).toBeVisible();

  await page.getByRole("link", { name: /Standing overhead press/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Standing overhead press" })).toBeVisible();
  await expect(page.getByText("Since last time")).toBeVisible();
  await expect(page.getByText(/Up from C/)).toBeVisible();
});

test("a share link works for signed-out visitors until it's turned off", async ({ page, browser }) => {
  await page.goto("/history?exercise=bench_press");
  await page.getByRole("link", { name: /Barbell bench press/ }).first().click();

  const toggle = page.getByRole("switch", { name: "Share link" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  const link = await page.getByRole("textbox", { name: "Share link" }).inputValue();
  expect(link).toMatch(/\/share\/[A-Za-z0-9_-]{24}$/);

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(link);
  await expect(visitor.getByRole("heading", { level: 1, name: "Barbell bench press" })).toBeVisible();
  await expect(visitor.getByText("Alex's form check")).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  const response = await visitor.goto(link);
  expect(response?.status()).toBe(404);
});
