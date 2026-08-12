"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { postNdaChatTurn, NdaChatApiError } from "@/lib/api";
import { mergeNdaFieldUpdates, type ChatMessage } from "@/lib/nda-chat";
import type { NdaFormValues } from "@/lib/nda-form";

interface NdaChatPanelProps {
  values: NdaFormValues;
  onValuesChange: Dispatch<SetStateAction<NdaFormValues>>;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I can help you fill in this Mutual NDA. What's the purpose of the agreement?",
};

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

export default function NdaChatPanel({ values, onValuesChange }: NdaChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
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
      const { reply, updates } = await postNdaChatTurn(message, history, values);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      // Functional updater, not `mergeNdaFieldUpdates(values, updates)`: `values`
      // is a stale closure from render time, and the user may have edited the
      // form directly while this request was in flight. Merging against the
      // latest state (`current`) instead of that snapshot avoids silently
      // reverting those concurrent edits.
      onValuesChange((current) => mergeNdaFieldUpdates(current, updates));
    } catch (err) {
      setError(
        err instanceof NdaChatApiError
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
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
      >
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <textarea
            rows={2}
            placeholder="Tell me about the agreement…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="shrink-0 rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-[#209dd7] text-white" : "bg-neutral-100 text-neutral-900"
        }`}
      >
        {message.content}
      </p>
    </div>
  );
}
