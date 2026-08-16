import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocumentChatPanel from "./DocumentChatPanel";
import { DocumentChatApiError } from "@/lib/api";
import { defaultFormValues, type DocumentFormValues } from "@/lib/document-form";
import { loadDocumentTypeFixture } from "@/lib/test-support/load-document-type";

const { postDocumentChatTurnMock } = vi.hoisted(() => ({ postDocumentChatTurnMock: vi.fn() }));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, postDocumentChatTurn: postDocumentChatTurnMock };
});

const { spec: ndaSpec } = loadDocumentTypeFixture("mutual-nda");
const values = defaultFormValues(ndaSpec);

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("DocumentChatPanel", () => {
  beforeEach(() => {
    postDocumentChatTurnMock.mockReset();
  });

  it("shows a greeting naming the document type on load", () => {
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={vi.fn()} />);
    expect(screen.getByText(/Mutual Non-Disclosure Agreement/)).toBeInTheDocument();
  });

  it("sends the typed message and appends the assistant's reply", async () => {
    postDocumentChatTurnMock.mockResolvedValue({ reply: "Got it, thanks!", updates: {} });
    const user = userEvent.setup();
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Evaluating a partnership");

    expect(screen.getByText("Evaluating a partnership")).toBeInTheDocument();
    expect(await screen.findByText("Got it, thanks!")).toBeInTheDocument();
    expect(postDocumentChatTurnMock).toHaveBeenCalledWith(
      "mutual-nda",
      "Evaluating a partnership",
      expect.any(Array),
      values
    );
    // Regression test: the panel has its own fixed height + scrollbar, so
    // following new messages must scroll only itself (scrollIntoView would
    // instead scroll the whole page, which can visibly snap the page back up
    // past wherever the user had scrolled to reach the input box below it --
    // see ChatMessageList.test.tsx for the underlying scroll behavior in
    // isolation, and its `bounded` prop).
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("merges returned field updates into the parent's values via onValuesChange", async () => {
    postDocumentChatTurnMock.mockResolvedValue({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    const onValuesChange = vi.fn();
    const user = userEvent.setup();
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={onValuesChange} />);

    await sendMessage(user, "Governing law is Delaware");

    await waitFor(() => expect(onValuesChange).toHaveBeenCalled());
    // onValuesChange receives a functional updater (not the merged object
    // directly) so it always merges against the latest state rather than a
    // stale closure -- see DocumentChatPanel.tsx's sendMessage.
    const updater = onValuesChange.mock.calls[0][0] as (current: DocumentFormValues) => DocumentFormValues;
    expect(updater(values)).toEqual(expect.objectContaining({ governingLaw: "Delaware" }));
  });

  it("calls onFieldsUpdated with the turn's raw updates, so the form column can scroll to them", async () => {
    postDocumentChatTurnMock.mockResolvedValue({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    const onFieldsUpdated = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentChatPanel
        spec={ndaSpec}
        values={values}
        onValuesChange={vi.fn()}
        onFieldsUpdated={onFieldsUpdated}
      />
    );

    await sendMessage(user, "Governing law is Delaware");

    await waitFor(() => expect(onFieldsUpdated).toHaveBeenCalledWith({ governingLaw: "Delaware" }));
  });

  it("does not drop a concurrent manual edit made while a chat request is in flight", async () => {
    // Regression test for a stale-closure bug: sendMessage must merge
    // against the latest values (via a functional updater), not a snapshot
    // captured when the request started, or a manual form edit made while
    // waiting for the AI's reply gets silently reverted.
    let resolveTurn: (value: { reply: string; updates: { governingLaw: string } }) => void = () => {};
    postDocumentChatTurnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTurn = resolve;
        })
    );

    function Wrapper() {
      const [state, setState] = useState<DocumentFormValues>(values);
      return (
        <>
          <button onClick={() => setState((current) => ({ ...current, jurisdiction: "courts located in New Castle, DE" }))}>
            Simulate manual edit
          </button>
          <DocumentChatPanel spec={ndaSpec} values={state} onValuesChange={setState} />
          <p data-testid="jurisdiction">{state.jurisdiction as string}</p>
          <p data-testid="governing-law">{state.governingLaw as string}</p>
        </>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await sendMessage(user, "Governing law is Delaware");
    await user.click(screen.getByRole("button", { name: "Simulate manual edit" }));
    expect(screen.getByTestId("jurisdiction")).toHaveTextContent("courts located in New Castle, DE");

    resolveTurn({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    await waitFor(() => expect(screen.getByTestId("governing-law")).toHaveTextContent("Delaware"));

    expect(screen.getByTestId("jurisdiction")).toHaveTextContent("courts located in New Castle, DE");
  });

  it("clears the input after sending", async () => {
    postDocumentChatTurnMock.mockResolvedValue({ reply: "Noted.", updates: {} });
    const user = userEvent.setup();
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Hello");

    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("shows an error message when the API call fails", async () => {
    postDocumentChatTurnMock.mockRejectedValue(
      new DocumentChatApiError("The AI assistant is temporarily unavailable. Please try again.")
    );
    const user = userEvent.setup();
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Hello");

    expect(
      await screen.findByText("The AI assistant is temporarily unavailable. Please try again.")
    ).toBeInTheDocument();
  });

  it("does not send an empty or whitespace-only message", async () => {
    const user = userEvent.setup();
    render(<DocumentChatPanel spec={ndaSpec} values={values} onValuesChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Message"), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(postDocumentChatTurnMock).not.toHaveBeenCalled();
  });
});
