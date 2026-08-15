import { expect, test } from "@playwright/test";

test.describe("Mutual NDA chat", () => {
  test.beforeEach(async ({ page }) => {
    // No real authentication yet -- any credentials sign you in (PL-7).
    await page.goto("/login");
    await page.getByLabel("Email").fill("alice@example.com");
    await page.getByLabel("Password").fill("hunter2");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("link", { name: /Mutual Non-Disclosure Agreement/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement Creator" })
    ).toBeVisible();
  });

  test("sends a chat message and updates the live preview from the AI's reply", async ({ page }) => {
    // Mocks the real LLM call at the network boundary rather than hitting
    // OpenRouter/Cerebras -- deterministic, no API key needed in CI. The
    // real end-to-end LLM call is validated manually (see PR description).
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      await route.fulfill({
        json: {
          reply: "Got it — governing law is set to Delaware.",
          updates: { governingLaw: "Delaware" },
        },
      });
    });

    await page.getByLabel("Message").fill("Governing law should be Delaware");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Got it — governing law is set to Delaware.")).toBeVisible();
    // The chat's structured update must flow through to the shared form
    // state and the live document preview, not just appear as chat text.
    await expect(page.getByLabel("Governing Law", { exact: false })).toHaveValue("Delaware");
    await expect(page.locator(".legal-document")).toContainText("Governing Law: Delaware");
  });

  test("shows an error message when the chat request fails", async ({ page }) => {
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      await route.fulfill({ status: 502, json: { detail: "AI unavailable" } });
    });

    await page.getByLabel("Message").fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(
      page.getByText("The AI assistant is temporarily unavailable. Please try again.")
    ).toBeVisible();
  });

  test("auto-scrolls the chat panel to the latest message once it overflows", async ({ page }) => {
    let replyCount = 0;
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      replyCount += 1;
      await route.fulfill({ json: { reply: `Reply number ${replyCount}.`, updates: {} } });
    });

    // Enough turns to overflow the panel's fixed height and require scrolling.
    // The first reply's bubble is asserted out of the viewport below, so the
    // panel must genuinely overflow -- not just happen to fit everything.
    for (let i = 1; i <= 10; i++) {
      await page.getByLabel("Message").fill(`Message ${i}`);
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByText(`Reply number ${i}.`)).toBeVisible();
    }

    await expect(page.getByText("Reply number 1.")).not.toBeInViewport();
    await expect(page.getByText("Reply number 10.")).toBeInViewport();
  });
});
