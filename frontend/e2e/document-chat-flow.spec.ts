import { expect, test } from "@playwright/test";
import { signUpNewUser } from "./helpers";

test.describe("Mutual NDA chat", () => {
  test.beforeEach(async ({ page }) => {
    await signUpNewUser(page);
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

  test("scrolls the Key Terms column to a field the AI fills in further down the form", async ({ page }) => {
    // "Jurisdiction" is near the bottom of the Mutual NDA's Key Terms list,
    // below the fold in the column's own scrollbar -- see DocumentApp.tsx's
    // handleFieldsUpdated and DocumentForm.tsx's scrollTo.
    const jurisdictionField = page.getByLabel("Jurisdiction", { exact: false });
    await expect(jurisdictionField).not.toBeInViewport();

    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      await route.fulfill({
        json: {
          reply: "Set the jurisdiction to Delaware courts.",
          updates: { jurisdiction: "courts located in New Castle, DE" },
        },
      });
    });

    await page.getByLabel("Message").fill("Jurisdiction should be Delaware courts");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(jurisdictionField).toHaveValue("courts located in New Castle, DE");
    await expect(jurisdictionField).toBeInViewport();
  });

  test("does not scroll the page back up when sending a message from a scrolled-down position", async ({ page }) => {
    // Regression test: early in a conversation the chat panel's own fixed
    // height + scrollbar isn't yet filled by its few short messages, which
    // previously made the auto-scroll fall back to scrolling the whole page
    // -- visibly snapping it back up past wherever the user had scrolled
    // down to reach the input box below the panel.
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      await route.fulfill({ json: { reply: "Got it, thanks!", updates: {} } });
    });

    // window.scrollBy rather than page.mouse.wheel: the cursor's default
    // position can land over the chat panel's own internal scrollbar, which
    // would consume the wheel scroll itself rather than scrolling the page.
    await page.evaluate(() => window.scrollBy(0, 400));
    const scrollYBeforeSend = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeSend).toBeGreaterThan(0);

    await page.getByLabel("Message").fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Got it, thanks!")).toBeVisible();

    const scrollYAfterSend = await page.evaluate(() => window.scrollY);
    expect(scrollYAfterSend).toBeGreaterThanOrEqual(scrollYBeforeSend);
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

  test("sends the fake-AI header once the testing toggle is enabled", async ({ page }) => {
    let capturedHeader: string | undefined;
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      capturedHeader = route.request().headers()["x-prelegal-fake-ai"];
      await route.fulfill({ json: { reply: "Blah, blah, blah.", updates: {} } });
    });

    await page.getByRole("checkbox", { name: "Fake AI (testing)" }).check();
    await page.getByLabel("Message").fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Blah, blah, blah.")).toBeVisible();
    expect(capturedHeader).toBe("1");
  });

  test("omits the fake-AI header while the testing toggle is off", async ({ page }) => {
    let capturedHeader: string | undefined;
    await page.route("**/api/documents/mutual-nda/chat", async (route) => {
      capturedHeader = route.request().headers()["x-prelegal-fake-ai"];
      await route.fulfill({ json: { reply: "Real reply.", updates: {} } });
    });

    await page.getByLabel("Message").fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Real reply.")).toBeVisible();
    expect(capturedHeader).toBeUndefined();
  });
});
