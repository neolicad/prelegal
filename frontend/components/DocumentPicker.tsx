"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ChatInputForm from "./ChatInputForm";
import ChatMessageList from "./ChatMessageList";
import { postDocumentMatchTurn, DocumentChatApiError } from "@/lib/api";
import type { ChatMessage } from "@/lib/document-chat";
import type { DocumentTypeSpec } from "@/lib/document-types";

interface DocumentPickerProps {
  documentTypes: DocumentTypeSpec[];
}

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! Tell me what kind of legal document you need, and I'll point you to the right one.",
};

/**
 * The catalog landing page (PL-9): lists every supported document type, and
 * lets the user instead describe what they need in free text -- the AI maps
 * that to the closest supported type, or explains why nothing fits.
 */
export default function DocumentPicker({ documentTypes }: DocumentPickerProps) {
  const router = useRouter();
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
      const { reply, matchedSlug } = await postDocumentMatchTurn(message, history);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (matchedSlug) router.push(`/documents/${matchedSlug}`);
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
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold text-[#032147]">What do you need to create?</h1>
        <p className="mt-2 text-sm text-[#888888]">
          Pick a document below, or describe what you need and I&rsquo;ll point you to the right one.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <ChatMessageList messages={messages} isSending={isSending} className="" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <ChatInputForm
          value={input}
          onChange={setInput}
          onSubmit={() => void sendMessage()}
          isSending={isSending}
          placeholder="e.g. I need to share confidential info with a partner…"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documentTypes.map((spec) => (
          <Link
            key={spec.slug}
            href={`/documents/${spec.slug}`}
            className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-[#209dd7] hover:shadow-md"
          >
            <h2 className="text-sm font-semibold text-[#032147]">{spec.name}</h2>
            <p className="text-xs text-[#888888]">{spec.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
