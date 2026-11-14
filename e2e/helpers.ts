import { expect, type Page } from "@playwright/test";

/** Created by `npm run db:seed` before the test server starts. */
export const DEMO = { name: "Alex Rivera", email: "demo@example.com", password: "demo-lifter-2026" };

export function newLifter() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return { name: "Jordan Lee", email: `jordan-${id}@example.com`, password: "a-strong-password-1" };
}

/** An error message on the page. (Next.js's route announcer is also role="alert", so match by text.) */
export function alertWith(page: Page, text: string | RegExp) {
  return page.getByRole("alert").filter({ hasText: text });
}

export async function signUp(page: Page, lifter: { name: string; email: string; password: string }) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(lifter.name);
  await page.getByLabel("Email").fill(lifter.email);
  await page.getByLabel("Password").fill(lifter.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
