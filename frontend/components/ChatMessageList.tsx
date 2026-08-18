"use client";

import { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import type { ChatMessage } from "@/lib/document-chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  className: string;
  // Whether `className` gives this list its own fixed height + internal
  // scrollbar (e.g. the document chat panel) vs. letting it grow with the
  // page, with no scrollbar of its own (e.g. the picker's page-level chat).
  // Explicit rather than inferred from current scrollHeight > clientHeight:
  // a *bounded* container that simply hasn't filled its height yet (e.g.
  // early in a conversation) would otherwise be misread as unbounded, and
  // fall back to scrolling the whole page -- which can visibly jump the page
  // back up past wherever the user had scrolled to reach the input box.
  bounded: boolean;
}

/** Renders a chat's messages and keeps the latest one scrolled into view. */
export default function ChatMessageList({ messages, isSending, className, bounded }: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (!scrollContainer || !content) return;

    const scrollToBottom = () => {
      if (bounded) {
        // Has its own fixed height + scrollbar -- scroll only it, regardless
        // of whether it's currently filled enough to actually overflow.
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      } else {
        // Grows with the page and has no scrollbar of its own -- fall back
        // to scrolling whichever ancestor does overflow, typically the page.
        scrollContainer.scrollIntoView({ block: "end" });
      }
    };

    scrollToBottom();

    // A single scroll-on-change isn't enough: the relevant heights can keep
    // changing after this effect runs, for two different reasons that need
    // two different observation targets:
    // - `content`'s own height grows when bubble text reflows taller after
    //   the fact (e.g. a web font finishing its swap) -- the scroll
    //   container's box stays a fixed size in this case, so observing it
    //   alone would miss this.
    // - `scrollContainer`'s available height can shrink independently (e.g.
    //   the window resizing) without `content` changing at all.
    const resizeObserver = new ResizeObserver(scrollToBottom);
    resizeObserver.observe(content);
    resizeObserver.observe(scrollContainer);
    return () => resizeObserver.disconnect();
  }, [messages, isSending, bounded]);

  return (
    <div ref={scrollContainerRef} className={className}>
      <div ref={contentRef} className="flex flex-col gap-3">
        {messages.map((message, index) => (
          <ChatBubble key={index} message={message} />
        ))}
        {isSending ? <ChatBubble message={{ role: "assistant", content: "Thinking…" }} /> : null}
      </div>
    </div>
  );
}
