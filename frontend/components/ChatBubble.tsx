import type { ChatMessage } from "@/lib/document-chat";

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
          isUser ? "bg-brand-blue text-white" : "bg-neutral-100 text-neutral-900"
        }`}
      >
        {message.content}
      </p>
    </div>
  );
}
