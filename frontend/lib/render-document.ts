import type { DocumentTypeSpec } from "./document-types";
import { type DocumentFormValues, getFieldValue, getPartyValue } from "./document-form";

/**
 * Renders a document type's template(s) + form values into one filled-in
 * markdown document. Two strategies (see catalog.json's `renderer` field):
 *
 * - "nda-coverpage": the Mutual NDA's bespoke Cover Page + Standard Terms,
 *   interpolated by matching the exact known structure of those two files
 *   (see PL-9's predecessor, PL-8) rather than generic templating, since the
 *   source documents are fixed, CC-licensed legal text.
 * - "generic-keyterms": every other document type, which has no separate
 *   fillable Cover Page in this repo. A "Key Terms" block is generated from
 *   the document type's field/party schema and combined with the Standard
 *   Terms, whose Variable spans are bold-resolved the same way the NDA's
 *   Standard Terms already are.
 *
 * All replacements use a function replacer (`() => value`) rather than
 * passing the value directly as `String.prototype.replace`'s second
 * argument -- a plain string replacement specially interprets `$&`, `$$`,
 * etc., which would corrupt the output if a user typed one of those
 * sequences into a free-text field (e.g. a company name like "Foo & Bar").
 */

const LABEL_TAG = /<label>(.*?)<\/label>/g;

const MNDA_TERM_BLOCK =
  /- \[x\]     Expires \[1 year\(s\)\] from Effective Date\.\n- \[ \]     Continues until terminated in accordance with the terms of the MNDA\./;

const CONFIDENTIALITY_TERM_BLOCK =
  /- \[x\]     \[1 year\(s\)\] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws\.\n- \[ \]     In perpetuity\./;

const PARTY_TABLE_BLOCK =
  /\|\| PARTY 1 \| PARTY 2 \|\n\|:--- \| :----: \| :----: \|\n(?:\|.*\|\n?)+/;

const VARIABLE_SPAN =
  /<span class="(?:coverpage_link|orderform_link|keyterms_link|businessterms_link|sow_link)">([^<]+)<\/span>/g;

// Several Standard Terms templates (e.g. csa.md, ai-addendum.md) also use
// <span class="header_2"/"header_3" id="..."> and bare <span id="..."> for
// section-anchor markup unrelated to Variables. Left alone, react-markdown
// (no rehype-raw) would render these as literal visible HTML, so they're
// unwrapped to their inner text after Variable spans are resolved above.
const STRUCTURAL_SPAN = /<span[^>]*>([^<]*)<\/span>/g;

function formatEffectiveDate(isoDate: string): string {
  if (!isoDate) return "[Today’s date]";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function checklistItem(checked: boolean, text: string): string {
  return `- [${checked ? "x" : " "}]     ${text}`;
}

/** Renders the shared "fixed duration vs. perpetual" checklist shape used by both term fields. */
function renderTermChecklist(isFixed: boolean, fixedText: string, perpetualText: string): string {
  return [checklistItem(isFixed, fixedText), checklistItem(!isFixed, perpetualText)].join("\n");
}

function renderMndaTermBlock(values: DocumentFormValues): string {
  const years = getFieldValue(values, "mndaTermYears").trim() || "1";
  return renderTermChecklist(
    getFieldValue(values, "mndaTermType") === "fixed",
    `Expires ${years} year(s) from Effective Date.`,
    "Continues until terminated in accordance with the terms of the MNDA."
  );
}

function renderConfidentialityTermBlock(values: DocumentFormValues): string {
  const years = getFieldValue(values, "confidentialityTermYears").trim() || "1";
  return renderTermChecklist(
    getFieldValue(values, "confidentialityTermType") === "fixed",
    `${years} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
    "In perpetuity."
  );
}

function renderPartyTable(spec: DocumentTypeSpec, values: DocumentFormValues): string {
  const [role1, role2] = spec.parties;
  const party1 = getPartyValue(values, role1.key);
  const party2 = getPartyValue(values, role2.key);
  const row = (label: string, v1: string, v2: string) => `| ${label} | ${v1} | ${v2} |`;
  return [
    "|| PARTY 1 | PARTY 2 |",
    "|:--- | :----: | :----: |",
    row("Signature", "", ""),
    row("Print Name", party1.printName, party2.printName),
    row("Title", party1.title, party2.title),
    row("Company", party1.company, party2.company),
    row("Notice Address *Use either email or postal address*", party1.noticeAddress, party2.noticeAddress),
    row("Date", "", ""),
  ].join("\n");
}

/** Fills in the Mutual NDA Cover Page template with the submitted form values. */
function renderNdaCoverPage(rawTemplate: string, spec: DocumentTypeSpec, values: DocumentFormValues): string {
  const purposeDefault = spec.fields.find((field) => field.key === "purpose")?.default ?? "";
  // react-markdown escapes raw HTML by default (no rehype-raw plugin), so the
  // template's `<label>…</label>` hint tags must become markdown italics
  // rather than being left as literal HTML — otherwise they'd render as
  // visible "<label>…</label>" text in every document.
  return rawTemplate
    .replace(LABEL_TAG, (_, text: string) => `*${text}*`)
    .replace(
      "[Evaluating whether to enter into a business relationship with the other party.]",
      () => getFieldValue(values, "purpose").trim() || purposeDefault
    )
    .replace("[Today’s date]", () => formatEffectiveDate(getFieldValue(values, "effectiveDate")))
    .replace(MNDA_TERM_BLOCK, () => renderMndaTermBlock(values))
    .replace(CONFIDENTIALITY_TERM_BLOCK, () => renderConfidentialityTermBlock(values))
    .replace("Governing Law: [Fill in state]", () => `Governing Law: ${getFieldValue(values, "governingLaw").trim()}`)
    .replace(
      "Jurisdiction: [Fill in city or county and state, i.e. “courts located in New Castle, DE”]",
      () => `Jurisdiction: ${getFieldValue(values, "jurisdiction").trim()}`
    )
    .replace("List any modifications to the MNDA", () => getFieldValue(values, "modifications").trim() || "None.")
    .replace(PARTY_TABLE_BLOCK, () => `${renderPartyTable(spec, values)}\n`);
}

/** Bold-resolves a Standard Terms template's Variable spans, then strips any other structural spans. */
function renderStandardTerms(rawTemplate: string): string {
  return rawTemplate.replace(VARIABLE_SPAN, "**$1**").replace(STRUCTURAL_SPAN, "$1");
}

/** Builds a generic "Key Terms" block from a document type's field/party schema. */
function renderKeyTermsBlock(spec: DocumentTypeSpec, values: DocumentFormValues): string {
  const lines = ["## Key Terms", ""];
  for (const field of spec.fields) {
    const value = getFieldValue(values, field.key).trim();
    lines.push(`**${field.label}:** ${value || "_Not yet specified_"}`, "");
  }
  for (const party of spec.parties) {
    const info = getPartyValue(values, party.key);
    const name = [info.printName, info.title].filter(Boolean).join(", ");
    lines.push(`**${party.label}:** ${info.company || "_Not yet specified_"}${name ? ` (${name})` : ""}`);
    lines.push(`Notice Address: ${info.noticeAddress || "_Not yet specified_"}`, "");
  }
  return lines.join("\n").trimEnd();
}

export interface DocumentTemplates {
  standardTerms: string;
  coverPage?: string;
}

// Baked into the rendered output (not just shown in the web UI) so it
// survives into the downloaded PDF, which is captured straight from this
// same rendered markdown -- see DocumentApp.tsx's handleDownload.
export const DRAFT_DISCLAIMER =
  "*This document was generated by Prelegal and is a draft only. It has not been reviewed by an attorney -- have qualified legal counsel review it before signing or relying on it.*";

/** Combines a document type's template(s) and form values into one rendered document. */
export function renderDocument(
  spec: DocumentTypeSpec,
  templates: DocumentTemplates,
  values: DocumentFormValues
): string {
  const standardTerms = renderStandardTerms(templates.standardTerms);
  const body =
    spec.renderer === "nda-coverpage" && templates.coverPage
      ? renderNdaCoverPage(templates.coverPage, spec, values)
      : renderKeyTermsBlock(spec, values);
  return `${body}\n\n---\n\n${standardTerms}\n\n---\n\n${DRAFT_DISCLAIMER}`;
}
