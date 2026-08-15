"use client";

import { useEffect, useRef } from "react";
import ChatBubble from "./ChatBubble";
import type { ChatMessage } from "@/lib/document-chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isSending: boolean;
  className: string;
}

/** Renders a chat's messages and keeps the latest one scrolled into view. */
export default function ChatMessageList({ messages, isSending, className }: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (!scrollContainer || !content) return;

    const scrollToBottom = () => {
      if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
        // The scroll container itself has internal overflow (e.g. the
        // fixed-height document chat panel) -- scroll only it.
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      } else {
        // No internal overflow (e.g. the picker's page-level chat, which has
        // no height limit of its own) -- fall back to scrolling whichever
        // ancestor does overflow, typically the page itself.
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
  }, [messages, isSending]);

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
