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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  return (
    <div className={className}>
      {messages.map((message, index) => (
        <ChatBubble key={index} message={message} />
      ))}
      {isSending ? <ChatBubble message={{ role: "assistant", content: "Thinking…" }} /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
