import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFParse } from "pdf-parse";
import { signUpNewUser } from "./helpers";

test("redirects to the login screen when not signed in", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to Prelegal" })).toBeVisible();
});

test.describe("Mutual NDA creator", () => {
  test.beforeEach(async ({ page }) => {
    await signUpNewUser(page);

    await page.getByRole("link", { name: /Mutual Non-Disclosure Agreement/ }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement Creator" })
    ).toBeVisible();
  });

  test("fills the form, updates the live preview, and downloads a real PDF", async ({ page }) => {
    await page.getByLabel(/^Effective Date/).fill("2026-08-06");
    await page.getByLabel("Governing Law", { exact: false }).fill("Delaware");
    await page.getByLabel("Jurisdiction", { exact: false }).fill("courts located in New Castle, DE");
    // Deliberately includes the exact adversarial pattern (`$&`) that would
    // corrupt String.prototype.replace()'s output if a bare string were
    // ever used as a replacer again — a regression guard for that bug.
    await page.getByLabel("Modifications", { exact: false }).fill("Cap liability at $100,000");

    const printNameFields = page.getByLabel("Print Name", { exact: false });
    const titleFields = page.getByLabel("Title", { exact: false });
    const companyFields = page.getByLabel("Company", { exact: false });
    const noticeAddressFields = page.getByLabel("Notice Address", { exact: false });

    await printNameFields.nth(0).fill("Alice Smith");
    await titleFields.nth(0).fill("CEO");
    await companyFields.nth(0).fill("Foo $& Bar Inc.");
    await noticeAddressFields.nth(0).fill("alice@foobar.com");

    await printNameFields.nth(1).fill("Bob Jones");
    await titleFields.nth(1).fill("COO");
    await companyFields.nth(1).fill("Globex Inc.");
    await noticeAddressFields.nth(1).fill("bob@globex.com");

    // Content correctness (including both bugs found in review — raw HTML
    // escaping and the $-pattern replace() corruption) is verified against
    // the live preview DOM here, not the downloaded PDF: html2pdf.js
    // rasterizes this exact DOM into page images via html2canvas, so the
    // PDF has no extractable text layer to assert against (confirmed by
    // pdf-parse returning empty text for it). The PDF checks below instead
    // verify that generation actually produced a real, non-trivial,
    // multi-page document from that DOM.
    const preview = page.locator(".legal-document");
    await expect(preview).toContainText("Governing Law: Delaware");
    await expect(preview).toContainText("Alice Smith");
    await expect(preview).toContainText("Bob Jones");
    await expect(preview).toContainText("Foo $& Bar Inc.");
    await expect(preview).not.toContainText("<label>");
    // A repeat of the table header would indicate the $-pattern replace()
    // bug regressed and re-inserted a second, unfilled copy of the table.
    expect(await preview.getByText("PARTY 1", { exact: false }).count()).toBe(1);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("foo-bar-inc-globex-inc-mutual-nda.pdf");

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const buffer = await fs.readFile(downloadPath!);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // A near-empty file would indicate html2canvas/jsPDF silently produced
    // a blank or broken document instead of the full multi-page render.
    expect(buffer.byteLength).toBeGreaterThan(50_000);

    const parser = new PDFParse({ data: buffer });
    try {
      const info = await parser.getInfo();
      expect(info.total).toBeGreaterThanOrEqual(3);
    } finally {
      await parser.destroy();
    }
  });

  test("downloads a PDF even when every field is left blank", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;

    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const buffer = await fs.readFile(downloadPath!);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

test.describe("Cloud Service Agreement creator (generic-keyterms renderer)", () => {
  test.beforeEach(async ({ page }) => {
    await signUpNewUser(page);
    await page.getByRole("link", { name: /^Cloud Service Agreement/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cloud Service Agreement Creator" })).toBeVisible();
  });

  test("fills a field via the form and sees it reflected in the generic Key Terms preview", async ({ page }) => {
    await page.getByLabel("Governing Law", { exact: false }).fill("Delaware");

    const preview = page.locator(".legal-document");
    await expect(preview).toContainText("Key Terms");
    await expect(preview).toContainText("Governing Law: Delaware");
    await expect(preview).not.toContainText("<span");
  });
});
