import { DEFAULT_PURPOSE, type NdaFormValues } from "./nda-form";

/**
 * Interpolates form values into the raw Common Paper Mutual NDA templates
 * (templates/mutual-nda-coverpage.md + templates/mutual-nda.md) to produce
 * a single, filled-in markdown document.
 *
 * These functions target the exact known structure of those two files
 * rather than attempting generic markdown templating, since the source
 * documents are fixed, CC-licensed legal text (see PL-5).
 *
 * All replacements use a function replacer (`() => value`) rather than
 * passing the value directly as `String.prototype.replace`'s second
 * argument — a plain string replacement specially interprets `$&`, `$$`,
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

function renderMndaTermBlock({ mndaTermType, mndaTermYears }: NdaFormValues): string {
  const years = mndaTermYears.trim() || "1";
  return renderTermChecklist(
    mndaTermType === "fixed",
    `Expires ${years} year(s) from Effective Date.`,
    "Continues until terminated in accordance with the terms of the MNDA."
  );
}

function renderConfidentialityTermBlock({
  confidentialityTermType,
  confidentialityTermYears,
}: NdaFormValues): string {
  const years = confidentialityTermYears.trim() || "1";
  return renderTermChecklist(
    confidentialityTermType === "fixed",
    `${years} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
    "In perpetuity."
  );
}

function renderPartyTable(values: NdaFormValues): string {
  const { party1, party2 } = values;
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

/** Fills in the Cover Page template with the submitted form values. */
export function renderCoverPage(rawTemplate: string, values: NdaFormValues): string {
  // react-markdown escapes raw HTML by default (no rehype-raw plugin), so the
  // template's `<label>…</label>` hint tags must become markdown italics
  // rather than being left as literal HTML — otherwise they'd render as
  // visible "<label>…</label>" text in every document.
  return rawTemplate
    .replace(LABEL_TAG, (_, text: string) => `*${text}*`)
    .replace(
      "[Evaluating whether to enter into a business relationship with the other party.]",
      () => values.purpose.trim() || DEFAULT_PURPOSE
    )
    .replace("[Today’s date]", () => formatEffectiveDate(values.effectiveDate))
    .replace(MNDA_TERM_BLOCK, () => renderMndaTermBlock(values))
    .replace(CONFIDENTIALITY_TERM_BLOCK, () => renderConfidentialityTermBlock(values))
    .replace("Governing Law: [Fill in state]", () => `Governing Law: ${values.governingLaw.trim()}`)
    .replace(
      "Jurisdiction: [Fill in city or county and state, i.e. “courts located in New Castle, DE”]",
      () => `Jurisdiction: ${values.jurisdiction.trim()}`
    )
    .replace("List any modifications to the MNDA", () => values.modifications.trim() || "None.")
    .replace(PARTY_TABLE_BLOCK, () => `${renderPartyTable(values)}\n`);
}

/**
 * The Standard Terms reference Cover Page fields via
 * `<span class="coverpage_link">Field</span>` (a clickable jump-to-Cover-Page
 * affordance in Common Paper's product). In a single combined document the
 * resolved values are already shown on the Cover Page above, so these spans
 * are rendered as bolded defined-term references rather than paraphrased
 * inline text (which reads ungrammatically for several of the fields).
 */
export function renderStandardTerms(rawTemplate: string): string {
  return rawTemplate.replace(/<span class="coverpage_link">([^<]+)<\/span>/g, "**$1**");
}

/** Combines the filled Cover Page and Standard Terms into one document. */
export function renderNdaDocument(
  coverPageTemplate: string,
  standardTermsTemplate: string,
  values: NdaFormValues
): string {
  const coverPage = renderCoverPage(coverPageTemplate, values);
  const standardTerms = renderStandardTerms(standardTermsTemplate);
  return `${coverPage}\n\n---\n\n${standardTerms}`;
}
