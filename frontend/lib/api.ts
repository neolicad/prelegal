import type { ChatMessage, DocumentFieldUpdates } from "./document-chat";
import type { DocumentFormValues } from "./document-form";
import { FAKE_AI_HEADER, isFakeAiEnabled } from "./fake-ai";

// Empty string resolves to a same-origin relative URL, which is correct in
// production (FastAPI serves this static export on the same origin). Local
// frontend dev (`next dev` on :3000) against a separately running backend
// (:8000) needs this set in frontend/.env.local -- see README.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class DocumentChatApiError extends Error {}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isFakeAiEnabled()) headers[FAKE_AI_HEADER] = "1";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    // Full page navigation, matching LoginForm.tsx's pattern -- the backend's
    // cookie check must actually run server-side, not just a client route change.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new DocumentChatApiError("Not authenticated");
  }
  if (!response.ok) {
    throw new DocumentChatApiError("The AI assistant is temporarily unavailable. Please try again.");
  }
  return response.json();
}

interface ChatTurnResult {
  reply: string;
  updates: DocumentFieldUpdates;
}

export function postDocumentChatTurn(
  slug: string,
  message: string,
  history: ChatMessage[],
  values: DocumentFormValues
): Promise<ChatTurnResult> {
  return postJson(`/api/documents/${slug}/chat`, { message, history, values });
}

export interface MatchResult {
  matchedSlug: string | null;
  reply: string;
}

export function postDocumentMatchTurn(message: string, history: ChatMessage[]): Promise<MatchResult> {
  return postJson("/api/documents/match", { message, history });
}
