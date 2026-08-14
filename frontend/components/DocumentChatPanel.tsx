"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import ChatBubble from "./ChatBubble";
import ChatInputForm from "./ChatInputForm";
import { postDocumentChatTurn, DocumentChatApiError } from "@/lib/api";
import { mergeDocumentFieldUpdates, type ChatMessage } from "@/lib/document-chat";
import type { DocumentFormValues } from "@/lib/document-form";
import type { DocumentTypeSpec } from "@/lib/document-types";

interface DocumentChatPanelProps {
  spec: DocumentTypeSpec;
  values: DocumentFormValues;
  onValuesChange: Dispatch<SetStateAction<DocumentFormValues>>;
}

export default function DocumentChatPanel({ spec, values, onValuesChange }: DocumentChatPanelProps) {
  const greeting: ChatMessage = {
    role: "assistant",
    content: `Hi! I can help you fill in this ${spec.name}. What's the first thing you'd like to tell me?`,
  };
  const [messages, setMessages] = useState<ChatMessage[]>([greeting]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    const message = input.trim();
    if (!message || isSending) return;

    const history = messages;
    setMessages([...history, { role: "user", content: message }]);
    setInput("");
    setIsSending(true);
    setError(null);
    try {
      const { reply, updates } = await postDocumentChatTurn(spec.slug, message, history, values);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      // Functional updater, not `mergeDocumentFieldUpdates(spec, values, updates)`:
      // `values` is a stale closure from render time, and the user may have
      // edited the form directly while this request was in flight. Merging
      // against the latest state (`current`) instead of that snapshot avoids
      // silently reverting those concurrent edits.
      onValuesChange((current) => mergeDocumentFieldUpdates(spec, current, updates));
    } catch (err) {
      setError(
        err instanceof DocumentChatApiError
          ? err.message
          : "The AI assistant is temporarily unavailable. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-4">
      <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {messages.map((chatMessage, index) => (
            <ChatBubble key={index} message={chatMessage} />
          ))}
          {isSending ? <ChatBubble message={{ role: "assistant", content: "Thinking…" }} /> : null}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ChatInputForm
        value={input}
        onChange={setInput}
        onSubmit={() => void sendMessage()}
        isSending={isSending}
        placeholder="Tell me about the agreement…"
      />
    </div>
  );
}
