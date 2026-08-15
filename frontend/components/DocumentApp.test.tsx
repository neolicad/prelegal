import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentApp from "./DocumentApp";
import { loadDocumentTypeFixture } from "@/lib/test-support/load-document-type";

const { spec: ndaSpec, templates: ndaTemplates } = loadDocumentTypeFixture("mutual-nda");
const { spec: addendumSpec, templates: addendumTemplates } = loadDocumentTypeFixture("ai-addendum");

// html2pdf.js is a browser-only library (touches `window`/canvas), so we
// mock it entirely rather than exercising the real thing in jsdom. The
// mock preserves its chainable `.set().from().save()` API so DocumentApp's
// usage is exercised faithfully.
const html2pdfWorker = { set: vi.fn(), from: vi.fn(), save: vi.fn() };
html2pdfWorker.set.mockImplementation(() => html2pdfWorker);
html2pdfWorker.from.mockImplementation(() => html2pdfWorker);

const html2pdfFactory = vi.fn(() => html2pdfWorker);

vi.mock("html2pdf.js", () => ({ default: () => html2pdfFactory() }));

// DocumentChatPanel renders alongside the form; these tests exercise the
// form/preview/PDF flow only, so the chat's network calls are mocked out
// rather than exercised here (see DocumentChatPanel.test.tsx for that).
vi.mock("@/lib/api", () => ({
  postDocumentChatTurn: vi.fn().mockResolvedValue({ reply: "", updates: {} }),
  postDocumentMatchTurn: vi.fn(),
  DocumentChatApiError: class DocumentChatApiError extends Error {},
}));

async function fillRequiredNdaFields(user: ReturnType<typeof userEvent.setup>) {
  // userEvent.type doesn't support jsdom's <input type="date"> (there's no
  // native segmented date control to simulate keystrokes into), so we set
  // its value directly the way a real browser's date input would.
  // Both MNDA-term and confidentiality-term radio choices also mention
  // "Effective Date" in their own label text (e.g. "Expires N year(s) from
  // Effective Date"), so this anchors to the start of the label to find the
  // actual date field rather than one of those radios.
  fireEvent.change(screen.getByLabelText(/^Effective Date/), { target: { value: "2026-08-06" } });
  await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");
  const [party1Company, party2Company] = screen.getAllByLabelText("Company");
  await user.type(party1Company, "Foo $& Bar Inc.");
  await user.type(party2Company, "Globex Inc.");
}

describe("DocumentApp", () => {
  beforeEach(() => {
    // Explicit, targeted resets rather than vi.clearAllMocks()/restoreAllMocks():
    // `set`/`from` must keep their chainable mockImplementation (set once,
    // above) across tests, while `save`'s implementation is intentionally
    // reset so each test must configure its own resolve/reject behavior.
    html2pdfWorker.set.mockClear();
    html2pdfWorker.from.mockClear();
    html2pdfWorker.save.mockReset();
    html2pdfFactory.mockClear();
  });

  it("renders the form and a live preview of the default document", () => {
    render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement Creator" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
  });

  it("updates the live preview as the user types into the form", async () => {
    const user = userEvent.setup();
    render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);

    await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");

    expect(screen.getByText("Governing Law: Delaware")).toBeInTheDocument();
  });

  it("renders the generic Key Terms preview for a generic-keyterms document type", () => {
    render(<DocumentApp spec={addendumSpec} templates={addendumTemplates} />);
    // The form's own "Key Terms" fieldset legend also matches this text, so
    // scope to the rendered preview's heading specifically.
    expect(screen.getByRole("heading", { name: "Key Terms" })).toBeInTheDocument();
  });

  it("attempts PDF generation even when every field is left blank", async () => {
    html2pdfWorker.save.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(html2pdfWorker.save).toHaveBeenCalled());
    expect(html2pdfFactory).toHaveBeenCalled();
  });

  it("generates a PDF with a filename slugified from every party's company plus the doc slug", async () => {
    html2pdfWorker.save.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);

    await fillRequiredNdaFields(user);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(html2pdfWorker.save).toHaveBeenCalled());

    expect(html2pdfWorker.set).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "foo-bar-inc-globex-inc-mutual-nda.pdf" })
    );
    // Must capture the rendered *document preview*, not the form or some
    // other element — a regression swapping in the wrong ref would still
    // satisfy a bare toHaveBeenCalled() check.
    expect(html2pdfWorker.from).toHaveBeenCalledWith(container.querySelector(".legal-document"));
  });

  it('shows "Preparing PDF…" while generation is pending, then reverts', async () => {
    let resolveSave: () => void = () => {};
    html2pdfWorker.save.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );
    const user = userEvent.setup();
    render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("button", { name: "Preparing PDF…" })).toBeDisabled();

    resolveSave();

    expect(await screen.findByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("shows an error message and re-enables the button when PDF generation fails", async () => {
    html2pdfWorker.save.mockRejectedValue(new Error("html2canvas exploded"));
    const user = userEvent.setup();
    render(<DocumentApp spec={ndaSpec} templates={ndaTemplates} />);

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(
      await screen.findByText("Something went wrong generating the PDF. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });
});
