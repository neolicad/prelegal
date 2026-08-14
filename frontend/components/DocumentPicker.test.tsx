import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentPicker from "./DocumentPicker";
import { DocumentChatApiError } from "@/lib/api";
import type { DocumentTypeSpec } from "@/lib/document-types";

const { postDocumentMatchTurnMock, pushMock } = vi.hoisted(() => ({
  postDocumentMatchTurnMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, postDocumentMatchTurn: postDocumentMatchTurnMock };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const DOCUMENT_TYPES: DocumentTypeSpec[] = [
  {
    slug: "mutual-nda",
    name: "Mutual Non-Disclosure Agreement",
    description: "Exchange confidential information for a stated purpose.",
    renderer: "nda-coverpage",
    standardTermsFilename: "templates/mutual-nda.md",
    coverPageFilename: "templates/mutual-nda-coverpage.md",
    parties: [],
    fields: [],
  },
  {
    slug: "csa",
    name: "Cloud Service Agreement",
    description: "Sell and buy cloud software and SaaS products.",
    renderer: "generic-keyterms",
    standardTermsFilename: "templates/csa.md",
    parties: [],
    fields: [],
  },
];

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("DocumentPicker", () => {
  beforeEach(() => {
    postDocumentMatchTurnMock.mockReset();
    pushMock.mockReset();
  });

  it("lists every supported document type as a link to its creator page", () => {
    render(<DocumentPicker documentTypes={DOCUMENT_TYPES} />);

    expect(screen.getByRole("link", { name: /Mutual Non-Disclosure Agreement/ })).toHaveAttribute(
      "href",
      "/documents/mutual-nda"
    );
    expect(screen.getByRole("link", { name: /Cloud Service Agreement/ })).toHaveAttribute(
      "href",
      "/documents/csa"
    );
  });

  it("navigates to the matched document type when the AI recognizes the request", async () => {
    postDocumentMatchTurnMock.mockResolvedValue({ matchedSlug: "csa", reply: "Sounds like a CSA." });
    const user = userEvent.setup();
    render(<DocumentPicker documentTypes={DOCUMENT_TYPES} />);

    await sendMessage(user, "I sell SaaS and need a contract for customers");

    expect(await screen.findByText("Sounds like a CSA.")).toBeInTheDocument();
    expect(pushMock).toHaveBeenCalledWith("/documents/csa");
  });

  it("does not navigate when nothing matches, and shows the explanation instead", async () => {
    postDocumentMatchTurnMock.mockResolvedValue({
      matchedSlug: null,
      reply: "We don't support that, but a CSA might be close.",
    });
    const user = userEvent.setup();
    render(<DocumentPicker documentTypes={DOCUMENT_TYPES} />);

    await sendMessage(user, "I need an employment contract");

    expect(await screen.findByText("We don't support that, but a CSA might be close.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows an error message when the match request fails", async () => {
    postDocumentMatchTurnMock.mockRejectedValue(
      new DocumentChatApiError("The AI assistant is temporarily unavailable. Please try again.")
    );
    const user = userEvent.setup();
    render(<DocumentPicker documentTypes={DOCUMENT_TYPES} />);

    await sendMessage(user, "Hello");

    expect(
      await screen.findByText("The AI assistant is temporarily unavailable. Please try again.")
    ).toBeInTheDocument();
  });
});
