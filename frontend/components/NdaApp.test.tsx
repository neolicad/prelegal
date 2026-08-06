import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaApp from "./NdaApp";
import { loadNdaTemplates } from "@/lib/test-support/load-templates";

const { coverPageTemplate, standardTermsTemplate } = loadNdaTemplates();

// html2pdf.js is a browser-only library (touches `window`/canvas), so we
// mock it entirely rather than exercising the real thing in jsdom. The
// mock preserves its chainable `.set().from().save()` API so NdaApp's
// usage is exercised faithfully.
const html2pdfWorker = {
  set: vi.fn(),
  from: vi.fn(),
  save: vi.fn(),
};
html2pdfWorker.set.mockImplementation(() => html2pdfWorker);
html2pdfWorker.from.mockImplementation(() => html2pdfWorker);

const html2pdfFactory = vi.fn(() => html2pdfWorker);

vi.mock("html2pdf.js", () => ({
  default: () => html2pdfFactory(),
}));

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  // userEvent.type doesn't support jsdom's <input type="date"> (there's no
  // native segmented date control to simulate keystrokes into), so we set
  // its value directly the way a real browser's date input would.
  fireEvent.change(screen.getByLabelText("Effective Date"), { target: { value: "2026-08-06" } });
  await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");
  await user.type(
    screen.getByLabelText("Jurisdiction", { exact: false }),
    "courts located in New Castle, DE"
  );
  const [party1Name, party2Name] = screen.getAllByLabelText("Print Name");
  const [party1Title, party2Title] = screen.getAllByLabelText("Title");
  const [party1Company, party2Company] = screen.getAllByLabelText("Company");
  const [party1Notice, party2Notice] = screen.getAllByLabelText("Notice Address", { exact: false });
  await user.type(party1Name, "Alice Smith");
  await user.type(party1Title, "CEO");
  await user.type(party1Company, "Foo $& Bar Inc.");
  await user.type(party1Notice, "alice@foobar.com");
  await user.type(party2Name, "Bob Jones");
  await user.type(party2Title, "COO");
  await user.type(party2Company, "Globex Inc.");
  await user.type(party2Notice, "bob@globex.com");
}

describe("NdaApp", () => {
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
    render(<NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />);
    expect(screen.getByRole("heading", { level: 1, name: "Mutual NDA Creator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mutual Non-Disclosure Agreement" })).toBeInTheDocument();
  });

  it("updates the live preview as the user types into the form", async () => {
    const user = userEvent.setup();
    render(<NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />);

    await user.type(screen.getByLabelText("Governing Law", { exact: false }), "Delaware");

    expect(screen.getByText("Governing Law: Delaware")).toBeInTheDocument();
  });

  it("does not attempt PDF generation when required fields are missing", async () => {
    const user = userEvent.setup();
    render(<NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />);

    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(html2pdfFactory).not.toHaveBeenCalled();
  });

  it("generates a PDF with a correctly slugified filename once the form is valid", async () => {
    html2pdfWorker.save.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { container } = render(
      <NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />
    );

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => expect(html2pdfWorker.save).toHaveBeenCalled());

    expect(html2pdfWorker.set).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "foo-bar-inc-globex-inc-mutual-nda.pdf" })
    );
    // Must capture the rendered *document preview*, not the form or some
    // other element — a regression swapping in the wrong ref would still
    // satisfy a bare toHaveBeenCalled() check.
    expect(html2pdfWorker.from).toHaveBeenCalledWith(container.querySelector(".nda-document"));
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
    render(<NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByRole("button", { name: "Preparing PDF…" })).toBeDisabled();

    resolveSave();

    expect(await screen.findByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("shows an error message and re-enables the button when PDF generation fails", async () => {
    html2pdfWorker.save.mockRejectedValue(new Error("html2canvas exploded"));
    const user = userEvent.setup();
    render(<NdaApp coverPageTemplate={coverPageTemplate} standardTermsTemplate={standardTermsTemplate} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(
      await screen.findByText("Something went wrong generating the PDF. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });
});
