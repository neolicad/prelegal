import type { NdaFormValues, PartyInfo } from "./nda-form";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type PartyInfoUpdates = Partial<PartyInfo>;

/** A partial NdaFormValues patch, as returned by the backend chat endpoint. */
export interface NdaFieldUpdates extends Partial<Omit<NdaFormValues, "party1" | "party2">> {
  party1?: PartyInfoUpdates | null;
  party2?: PartyInfoUpdates | null;
}

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
export function mergeNdaFieldUpdates(values: NdaFormValues, updates: NdaFieldUpdates): NdaFormValues {
  const merged = { ...values };
  for (const key of Object.keys(updates) as (keyof NdaFieldUpdates)[]) {
    if (key === "party1" || key === "party2") continue;
    const value = updates[key];
    if (value) merged[key] = value as never;
  }
  merged.party1 = mergeParty(values.party1, updates.party1);
  merged.party2 = mergeParty(values.party2, updates.party2);
  return merged;
}
