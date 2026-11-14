import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { alertWith, newLifter, signUp } from "./helpers";

test("update your profile, export your data and delete your account", async ({ page }) => {
  const lifter = newLifter();
  await signUp(page, lifter);
  await expect(page.getByRole("heading", { name: "Welcome, Jordan" })).toBeVisible();

  await page.goto("/settings");
  const name = page.getByLabel("Name");
  await name.fill("Jordan Rivers");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download my data" }).click(),
  ]);
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.account).toMatchObject({ email: lifter.email, name: "Jordan Rivers" });
  expect(exported.analyses).toEqual([]);

  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Your password").fill(lifter.password);
  await page.getByLabel('Type "delete" to confirm').fill("delete");
  await page.getByRole("button", { name: "Permanently delete account" }).click();
  await expect(page).toHaveURL(/\/$/);

  // The account is really gone.
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(lifter.email);
  await page.getByLabel("Password", { exact: true }).fill(lifter.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(alertWith(page, "don't match")).toBeVisible();
});
