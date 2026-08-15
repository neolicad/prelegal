import type { DocumentTypeSpec } from "./document-types";
import { type DocumentFormValues, type PartyInfo, getPartyValue } from "./document-form";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type PartyInfoUpdates = Partial<PartyInfo>;

/** A partial DocumentFormValues patch, as returned by the backend chat endpoint. */
export type DocumentFieldUpdates = Record<string, string | PartyInfoUpdates | null | undefined>;

function mergeParty(current: PartyInfo, updates: PartyInfoUpdates | null | undefined): PartyInfo {
  if (!updates) return current;
  const merged = { ...current };
  for (const key of Object.keys(updates) as (keyof PartyInfo)[]) {
    const value = updates[key];
    if (value) merged[key] = value;
  }
  return merged;
}

/**
 * Merges the AI's field updates into the current form values.
 *
 * Null/undefined/empty-string fields mean "no update" (the AI wasn't
 * confident, or the user's message didn't touch that field) and are left
 * untouched -- this is what lets chat and manual form edits coexist without
 * one clobbering the other's work.
 */
export function mergeDocumentFieldUpdates(
  spec: DocumentTypeSpec,
  values: DocumentFormValues,
  updates: DocumentFieldUpdates
): DocumentFormValues {
  const partyKeys = new Set(spec.parties.map((party) => party.key));
  const merged = { ...values };
  for (const [key, update] of Object.entries(updates)) {
    if (partyKeys.has(key)) {
      merged[key] = mergeParty(getPartyValue(values, key), update as PartyInfoUpdates | null | undefined);
    } else if (update) {
      merged[key] = update as string;
    }
  }
  return merged;
}
