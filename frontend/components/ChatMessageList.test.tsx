import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatMessageList from "./ChatMessageList";
import { triggerLatestResize } from "@/lib/test-support/mock-resize-observer";
import type { ChatMessage } from "@/lib/document-chat";

const scrollIntoViewMock = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;

/** Simulates a container with real internal overflow, which jsdom never has natively. */
function mockOverflow(element: Element, { scrollHeight, clientHeight }: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(element, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { configurable: true, value: clientHeight });
}

describe("ChatMessageList", () => {
  beforeEach(() => {
    scrollIntoViewMock.mockClear();
  });

  it("renders every message", () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Hi there" },
      { role: "user", content: "Hello" },
    ];
    render(<ChatMessageList messages={messages} isSending={false} className="" bounded={false} />);

    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows a Thinking… bubble while a request is in flight", () => {
    render(<ChatMessageList messages={[]} isSending={true} className="" bounded={false} />);

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
          <ChatMessageList messages={messages} isSending={false} className="" bounded={false} />
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
          <ChatMessageList messages={[]} isSending={isSending} className="" bounded={false} />
        </>
      );
    }

    render(<Wrapper />);
    scrollIntoViewMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Start sending" }));

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  describe("bounded (e.g. the document chat panel, which has its own fixed height + scrollbar)", () => {
    it("sets scrollTop directly instead of calling scrollIntoView, even without real internal overflow yet", () => {
      // Regression test: a bounded container that hasn't filled its height
      // yet (scrollHeight <= clientHeight, e.g. early in a short
      // conversation) must still scroll only itself -- inferring "unbounded"
      // from that state previously fell back to scrolling the whole page,
      // which could visibly snap the page back up past wherever the user
      // had scrolled to reach the input box below the panel.
      const { container } = render(
        <ChatMessageList messages={[{ role: "assistant", content: "Hi" }]} isSending={false} className="" bounded />
      );
      const scrollContainer = container.firstElementChild as HTMLElement;
      mockOverflow(scrollContainer, { scrollHeight: 150, clientHeight: 200 }); // not overflowing
      scrollIntoViewMock.mockClear(); // isolate from the initial mount's own scroll

      triggerLatestResize();

      expect(scrollContainer.scrollTop).toBe(150);
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });

    it("still sets scrollTop directly once content does overflow", () => {
      const { container } = render(
        <ChatMessageList messages={[{ role: "assistant", content: "Hi" }]} isSending={false} className="" bounded />
      );
      const scrollContainer = container.firstElementChild as HTMLElement;
      mockOverflow(scrollContainer, { scrollHeight: 500, clientHeight: 200 });
      scrollIntoViewMock.mockClear();

      triggerLatestResize();

      expect(scrollContainer.scrollTop).toBe(500);
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  describe("unbounded (e.g. the picker's page-level chat, with no height limit of its own)", () => {
    it("calls scrollIntoView on the container instead of setting scrollTop", () => {
      const { container } = render(
        <ChatMessageList
          messages={[{ role: "assistant", content: "Hi" }]}
          isSending={false}
          className=""
          bounded={false}
        />
      );
      const scrollContainer = container.firstElementChild as HTMLElement;
      mockOverflow(scrollContainer, { scrollHeight: 200, clientHeight: 200 });
      scrollIntoViewMock.mockClear();

      triggerLatestResize();

      expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "end" });
    });
  });

  describe("regression: content growing after the initial scroll (e.g. a late web-font swap)", () => {
    // The bug this covers: a single scroll-on-[messages, isSending]-change
    // isn't enough, because message content can keep growing after that
    // effect runs. Reproduced live against the real app by appending text to
    // the last bubble after the scroll had already settled, which left
    // scrollTop stale with the true bottom well out of view.
    it("re-scrolls when the ResizeObserver fires again for the same render", () => {
      const { container } = render(
        <ChatMessageList messages={[{ role: "assistant", content: "Hi" }]} isSending={false} className="" bounded />
      );
      const scrollContainer = container.firstElementChild as HTMLElement;
      mockOverflow(scrollContainer, { scrollHeight: 300, clientHeight: 200 });
      scrollContainer.scrollTop = 0; // simulate having not yet caught up to the first resize

      triggerLatestResize();
      expect(scrollContainer.scrollTop).toBe(300);

      // Content grows further still (e.g. the font swap actually lands a
      // moment later) -- a second, independent resize notification.
      mockOverflow(scrollContainer, { scrollHeight: 450, clientHeight: 200 });
      triggerLatestResize();

      expect(scrollContainer.scrollTop).toBe(450);
    });
  });
});
