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
 * Whether a field's update value actually changes anything. A plain string
 * update is meaningful iff non-empty; a party update is an object and so is
 * always truthy on its own (e.g. `{printName: "", title: "", ...}`) even
 * when every subfield in it is empty -- checked the same subfield-by-
 * subfield way `mergeParty` above does, so "was this key updated" agrees
 * with "did merging it change anything".
 */
export function isMeaningfulFieldUpdate(update: string | PartyInfoUpdates | null | undefined): boolean {
  if (!update) return false;
  if (typeof update === "string") return true;
  return Object.values(update).some((value) => !!value);
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
