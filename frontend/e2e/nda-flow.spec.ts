import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFParse } from "pdf-parse";

test.describe("Mutual NDA creator", () => {
  test("fills the form, updates the live preview, and downloads a real PDF", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Mutual NDA Creator" })).toBeVisible();

    await page.getByLabel("Effective Date", { exact: true }).fill("2026-08-06");
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
    const preview = page.locator(".nda-document");
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

  test("does not attempt a download when required fields are left blank", async ({ page }) => {
    await page.goto("/");

    let downloadFired = false;
    page.once("download", () => {
      downloadFired = true;
    });

    await page.getByRole("button", { name: "Download PDF" }).click();
    // Give the (native browser validation) a moment to have fired if it
    // were going to; there is no download event to await here since none
    // should occur.
    await page.waitForTimeout(500);

    expect(downloadFired).toBe(false);
    // The browser's native constraint-validation bubble should point at
    // the first invalid required field (Effective Date, since Purpose
    // already has a default value).
    await expect(page.getByLabel("Effective Date", { exact: true })).toBeFocused();
  });
});
