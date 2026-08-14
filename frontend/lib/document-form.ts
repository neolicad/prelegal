import type { DocumentTypeSpec } from "./document-types";

/** Form data shape shared by every document type -- generalizes the old NdaFormValues. */

export interface PartyInfo {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export const emptyPartyInfo: PartyInfo = {
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
};

/**
 * Every document type's fields and party roles become sibling top-level
 * keys (matching backend/app/dynamic_schemas.py's flat FormValues model),
 * so which keys are plain strings vs. PartyInfo objects varies by document
 * type -- use getFieldValue/getPartyValue to read a value safely.
 */
export type DocumentFormValues = Record<string, string | PartyInfo>;

export function defaultFormValues(spec: DocumentTypeSpec): DocumentFormValues {
  const values: DocumentFormValues = {};
  for (const field of spec.fields) values[field.key] = field.default ?? "";
  for (const party of spec.parties) values[party.key] = { ...emptyPartyInfo };
  return values;
}

export function getFieldValue(values: DocumentFormValues, key: string): string {
  const value = values[key];
  return typeof value === "string" ? value : "";
}

export function getPartyValue(values: DocumentFormValues, key: string): PartyInfo {
  const value = values[key];
  return value && typeof value === "object" ? value : emptyPartyInfo;
}
