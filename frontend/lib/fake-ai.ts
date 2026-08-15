/**
 * Testing-only "fake AI" mode: lets the chat UI be exercised without
 * spending real LLM calls (see components/FakeAiToggle.tsx). The choice is
 * stored in localStorage so it persists across page loads/navigations, and
 * sent as a header the backend checks per-request (see backend/app/fake_ai.py).
 */

const STORAGE_KEY = "prelegal_fake_ai";
export const FAKE_AI_HEADER = "x-prelegal-fake-ai";

const listeners = new Set<() => void>();

export function isFakeAiEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setFakeAiEnabled(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore, so components stay in sync across localStorage changes without an effect + setState. */
export function subscribeFakeAiEnabled(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
