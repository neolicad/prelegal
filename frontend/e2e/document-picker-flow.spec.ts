import { expect, test } from "@playwright/test";

test.describe("Document picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "What do you need to create?" })).toBeVisible();
  });

  test("lists every supported document type as a link to its creator", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Mutual Non-Disclosure Agreement/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Cloud Service Agreement/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /AI Addendum/ })).toBeVisible();
  });

  test("routes to the matched document type from a free-text chat description", async ({ page }) => {
    // Mocks the real LLM call at the network boundary -- deterministic, no
    // API key needed in CI. The real end-to-end LLM call (including the
    // "unsupported document, suggest closest" behavior) is validated
    // manually (see PR description).
    await page.route("**/api/documents/match", async (route) => {
      await route.fulfill({
        json: { matchedSlug: "csa", reply: "Sounds like a Cloud Service Agreement." },
      });
    });

    await page.getByLabel("Message").fill("I sell SaaS and need a contract for my customers");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page).toHaveURL(/\/documents\/csa$/);
    await expect(page.getByRole("heading", { level: 1, name: "Cloud Service Agreement Creator" })).toBeVisible();
  });

  test("stays on the picker and explains when nothing matches", async ({ page }) => {
    await page.route("**/api/documents/match", async (route) => {
      await route.fulfill({
        json: {
          matchedSlug: null,
          reply: "We don't have a template for that. The closest option is a Professional Services Agreement.",
        },
      });
    });

    await page.getByLabel("Message").fill("I need an employment contract for a new hire");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByText("We don't have a template for that. The closest option is a Professional Services Agreement.")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
