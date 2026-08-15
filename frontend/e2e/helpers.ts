import { expect, type Page } from "@playwright/test";

/**
 * Real signup/login (PL-10) persists to a database shared by every test in
 * this run (see playwright.config.ts's single webServer) -- each test needs
 * its own account rather than reusing a fixed email, or a second signup
 * with the same address would 409.
 */
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function signUpNewUser(page: Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("hunter2hunter2");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "What do you need to create?" })).toBeVisible();
  return email;
}
