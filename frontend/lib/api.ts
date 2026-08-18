import type { ChatMessage, DocumentFieldUpdates } from "./document-chat";
import type { DocumentFormValues } from "./document-form";
import { FAKE_AI_HEADER, isFakeAiEnabled } from "./fake-ai";

// Empty string resolves to a same-origin relative URL, which is correct in
// production (FastAPI serves this static export on the same origin). Local
// frontend dev (`next dev` on :3000) against a separately running backend
// (:8000) needs this set in frontend/.env.local -- see README.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * A full page load (not client-side routing) so the backend's cookie check
 * in GET / actually runs -- see backend/app/main.py. Used after login/signup
 * (to land on the now-authenticated /), sign-out (to land on /login), and a
 * 401 from any other call (below).
 */
export function navigateFullPage(path: string): void {
  window.location.href = path;
}

export class DocumentChatApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  // Chat/match/document calls should bounce to /login on a 401, matching the
  // server-side page gate. Auth calls themselves must not -- a failed login
  // or signup attempt is an inline form error, not a sign-out.
  redirectOn401?: boolean;
  // When given, always used as the error message on a non-OK response
  // instead of the server's `detail` -- e.g. chat/match failures always show
  // one reassuring message regardless of the underlying cause, while auth
  // and document calls surface the server's specific detail (bad password,
  // duplicate email, etc.) by leaving this unset.
  errorMessage?: string;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  { redirectOn401 = true, errorMessage }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (isFakeAiEnabled()) headers[FAKE_AI_HEADER] = "1";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && redirectOn401) {
    navigateFullPage("/login");
    throw new DocumentChatApiError("Not authenticated", 401);
  }
  if (!response.ok) {
    let detail: string | undefined;
    try {
      detail = (await response.json())?.detail;
    } catch {
      detail = undefined;
    }
    throw new DocumentChatApiError(errorMessage ?? detail ?? FALLBACK_ERROR_MESSAGE, response.status);
  }
  return response.json();
}

function postJson<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return request<T>("POST", path, body, options);
}

function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

interface ChatTurnResult {
  reply: string;
  updates: DocumentFieldUpdates;
}

const AI_UNAVAILABLE_MESSAGE = "The AI assistant is temporarily unavailable. Please try again.";

export function postDocumentChatTurn(
  slug: string,
  message: string,
  history: ChatMessage[],
  values: DocumentFormValues
): Promise<ChatTurnResult> {
  return postJson(
    `/api/documents/${slug}/chat`,
    { message, history, values },
    { errorMessage: AI_UNAVAILABLE_MESSAGE }
  );
}

export interface MatchResult {
  matchedSlug: string | null;
  reply: string;
}

export function postDocumentMatchTurn(message: string, history: ChatMessage[]): Promise<MatchResult> {
  return postJson("/api/documents/match", { message, history }, { errorMessage: AI_UNAVAILABLE_MESSAGE });
}

export interface CurrentUser {
  email: string;
}

export function signup(email: string, password: string): Promise<CurrentUser> {
  return postJson("/api/auth/signup", { email, password }, { redirectOn401: false });
}

export function login(email: string, password: string): Promise<CurrentUser> {
  return postJson("/api/auth/login", { email, password }, { redirectOn401: false });
}

export function logout(): Promise<void> {
  return postJson("/api/auth/logout", {}, { redirectOn401: false });
}

export function getCurrentUser(): Promise<CurrentUser> {
  return getJson("/api/auth/me", { redirectOn401: false });
}

export interface SavedDocumentSummary {
  id: number;
  slug: string;
  title: string;
  createdAt: string;
}

export interface SavedDocument extends SavedDocumentSummary {
  values: DocumentFormValues;
}

export function saveDocument(slug: string, values: DocumentFormValues): Promise<SavedDocumentSummary> {
  return postJson("/api/documents", { slug, values });
}

export function listSavedDocuments(): Promise<SavedDocumentSummary[]> {
  return getJson("/api/documents");
}

export function getSavedDocument(id: number): Promise<SavedDocument> {
  return getJson(`/api/documents/${id}`);
}
