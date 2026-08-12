import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NdaChatPanel from "./NdaChatPanel";
import { NdaChatApiError } from "@/lib/api";
import { defaultFormValues, type NdaFormValues } from "@/lib/nda-form";

const { postNdaChatTurnMock } = vi.hoisted(() => ({ postNdaChatTurnMock: vi.fn() }));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, postNdaChatTurn: postNdaChatTurnMock };
});

async function sendMessage(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(screen.getByLabelText("Message"), text);
  await user.click(screen.getByRole("button", { name: "Send" }));
}

describe("NdaChatPanel", () => {
  beforeEach(() => {
    postNdaChatTurnMock.mockReset();
  });

  it("shows a greeting from the assistant on load", () => {
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);
    expect(screen.getByText(/What's the purpose of the agreement\?/)).toBeInTheDocument();
  });

  it("sends the typed message and appends the assistant's reply", async () => {
    postNdaChatTurnMock.mockResolvedValue({ reply: "Got it, thanks!", updates: {} });
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Evaluating a partnership");

    expect(screen.getByText("Evaluating a partnership")).toBeInTheDocument();
    expect(await screen.findByText("Got it, thanks!")).toBeInTheDocument();
  });

  it("merges returned field updates into the parent's values via onValuesChange", async () => {
    postNdaChatTurnMock.mockResolvedValue({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    const onValuesChange = vi.fn();
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={onValuesChange} />);

    await sendMessage(user, "Governing law is Delaware");

    await waitFor(() => expect(onValuesChange).toHaveBeenCalled());
    // onValuesChange receives a functional updater (not the merged object
    // directly) so it always merges against the latest state rather than a
    // stale closure -- see NdaChatPanel.tsx's sendMessage.
    const updater = onValuesChange.mock.calls[0][0] as (current: typeof defaultFormValues) => typeof defaultFormValues;
    expect(updater(defaultFormValues)).toEqual(
      expect.objectContaining({ governingLaw: "Delaware" })
    );
  });

  it("does not drop a concurrent manual edit made while a chat request is in flight", async () => {
    // Regression test for a stale-closure bug: sendMessage must merge
    // against the latest values (via a functional updater), not a snapshot
    // captured when the request started, or a manual form edit made while
    // waiting for the AI's reply gets silently reverted.
    let resolveTurn: (value: { reply: string; updates: { governingLaw: string } }) => void = () => {};
    postNdaChatTurnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTurn = resolve;
        })
    );

    function Wrapper() {
      const [values, setValues] = useState<NdaFormValues>(defaultFormValues);
      return (
        <>
          <button onClick={() => setValues((current) => ({ ...current, jurisdiction: "courts located in New Castle, DE" }))}>
            Simulate manual edit
          </button>
          <NdaChatPanel values={values} onValuesChange={setValues} />
          <p data-testid="jurisdiction">{values.jurisdiction}</p>
          <p data-testid="governing-law">{values.governingLaw}</p>
        </>
      );
    }

    const user = userEvent.setup();
    render(<Wrapper />);

    await sendMessage(user, "Governing law is Delaware");
    // While the chat request is still pending, the user edits the form directly.
    await user.click(screen.getByRole("button", { name: "Simulate manual edit" }));
    expect(screen.getByTestId("jurisdiction")).toHaveTextContent("courts located in New Castle, DE");

    resolveTurn({ reply: "Noted.", updates: { governingLaw: "Delaware" } });
    await waitFor(() => expect(screen.getByTestId("governing-law")).toHaveTextContent("Delaware"));

    // Both the concurrent manual edit and the chat's update must survive.
    expect(screen.getByTestId("jurisdiction")).toHaveTextContent("courts located in New Castle, DE");
  });

  it("clears the input after sending", async () => {
    postNdaChatTurnMock.mockResolvedValue({ reply: "Noted.", updates: {} });
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Hello");

    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("shows an error message when the API call fails", async () => {
    postNdaChatTurnMock.mockRejectedValue(new NdaChatApiError("The AI assistant is temporarily unavailable. Please try again."));
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);

    await sendMessage(user, "Hello");

    expect(
      await screen.findByText("The AI assistant is temporarily unavailable. Please try again.")
    ).toBeInTheDocument();
  });

  it("disables the send button while a request is in flight", async () => {
    let resolveTurn: (value: { reply: string; updates: Record<string, never> }) => void = () => {};
    postNdaChatTurnMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTurn = resolve;
        })
    );
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    resolveTurn({ reply: "Noted.", updates: {} });
    await screen.findByText("Noted.");

    // Once the request settles, typing again re-enables the button --
    // it wasn't left permanently disabled by the in-flight request.
    await user.type(screen.getByLabelText("Message"), "More info");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("does not send an empty or whitespace-only message", async () => {
    const user = userEvent.setup();
    render(<NdaChatPanel values={defaultFormValues} onValuesChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Message"), "   ");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(postNdaChatTurnMock).not.toHaveBeenCalled();
  });
});
