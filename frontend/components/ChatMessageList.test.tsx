import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatMessageList from "./ChatMessageList";
import type { ChatMessage } from "@/lib/document-chat";

const scrollIntoViewMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

describe("ChatMessageList", () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
  });

  it("renders every message", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "Hello" },
    ];
    render(<ChatMessageList messages={messages} isSending={false} className="" />);

    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows a Thinking… bubble while a request is in flight", () => {
    render(<ChatMessageList messages={[]} isSending={true} className="" />);

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("scrolls to the bottom when a new message is added", () => {
    function Wrapper() {
      const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Hi" }]);
      return (
        <>
          <button onClick={() => setMessages((current) => [...current, { role: "user", content: "More" }])}>
            Add message
          </button>
          <ChatMessageList messages={messages} isSending={false} className="" />
        </>
      );
    }

    render(<Wrapper />);
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Add message" }));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
  });

  it("scrolls to the bottom when the Thinking… indicator appears or disappears", () => {
    function Wrapper() {
      const [isSending, setIsSending] = useState(false);
      return (
        <>
          <button onClick={() => setIsSending(true)}>Start sending</button>
          <ChatMessageList messages={[]} isSending={isSending} className="" />
        </>
      );
    }

    render(<Wrapper />);
    scrollIntoViewMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Start sending" }));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });
});
