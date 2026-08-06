/**
 * Form data shape for the Mutual NDA creator, mirroring the fillable fields
 * on the Common Paper Mutual NDA Cover Page (templates/mutual-nda-coverpage.md).
 */

export type TermChoice = "fixed" | "perpetual";

export interface PartyInfo {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
}

export interface NdaFormValues {
  purpose: string;
  effectiveDate: string; // yyyy-mm-dd, as produced by <input type="date">
  mndaTermType: TermChoice;
  mndaTermYears: string;
  confidentialityTermType: TermChoice;
  confidentialityTermYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyInfo;
  party2: PartyInfo;
}

export const emptyPartyInfo: PartyInfo = {
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
};

export const DEFAULT_PURPOSE = "Evaluating whether to enter into a business relationship with the other party.";

export const defaultFormValues: NdaFormValues = {
  purpose: DEFAULT_PURPOSE,
  effectiveDate: "",
  mndaTermType: "fixed",
  mndaTermYears: "1",
  confidentialityTermType: "fixed",
  confidentialityTermYears: "1",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: { ...emptyPartyInfo },
  party2: { ...emptyPartyInfo },
};
