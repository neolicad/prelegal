import type { ChatMessage, NdaFieldUpdates } from "./nda-chat";
import type { NdaFormValues } from "./nda-form";

// Empty string resolves to a same-origin relative URL, which is correct in
// production (FastAPI serves this static export on the same origin). Local
// frontend dev (`next dev` on :3000) against a separately running backend
// (:8000) needs this set in frontend/.env.local -- see README.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class NdaChatApiError extends Error {}

interface ChatTurnResult {
  reply: string;
  updates: NdaFieldUpdates;
}

export async function postNdaChatTurn(
  message: string,
  history: ChatMessage[],
  values: NdaFormValues
): Promise<ChatTurnResult> {
  const response = await fetch(`${API_BASE_URL}/api/nda/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, values }),
  });

  if (response.status === 401) {
    // Full page navigation, matching LoginForm.tsx's pattern -- the backend's
    // cookie check must actually run server-side, not just a client route change.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    throw new NdaChatApiError("Not authenticated");
  }
  if (!response.ok) {
    throw new NdaChatApiError("The AI assistant is temporarily unavailable. Please try again.");
  }
  return response.json();
}
