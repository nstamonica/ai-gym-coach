import { expect, test } from "@playwright/test";
import { alertWith, DEMO, newLifter, signIn } from "./helpers";

test("signing up from a protected page returns you to it, and signing out locks it again", async ({ page }) => {
  const lifter = newLifter();

  await page.goto("/history");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fhistory$/);

  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fhistory$/);
  await page.getByLabel("Name").fill(lifter.name);
  await page.getByLabel("Email").fill(lifter.email);
  await page.getByLabel("Password").fill(lifter.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("explains a wrong password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(alertWith(page, "don't match")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("won't create a second account for the same email", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Someone Else");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill("another-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(alertWith(page, "already exists")).toBeVisible();
});

test("ignores ?next= links that point at another site", async ({ page }) => {
  await page.goto("/sign-in?next=//evil.example/steal");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password", { exact: true }).fill(DEMO.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
});

test("signed-in visitors skip the sign-in page", async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/dashboard$/);
});
