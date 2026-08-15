import { describe, expect, it } from "vitest";
import { renderDocument } from "./render-document";
import { defaultFormValues, emptyPartyInfo, type DocumentFormValues } from "./document-form";
import { loadDocumentTypeFixture } from "./test-support/load-document-type";

// Read the real, CC-licensed templates (added in PL-5) rather than synthetic
// fixtures, so these tests fail loudly if the templates ever change in a way
// that breaks the targeted string/regex replacements in render-document.ts —
// exactly the class of bug these tests exist to catch.
const { spec: ndaSpec, templates: ndaTemplates } = loadDocumentTypeFixture("mutual-nda");
const purposeDefault = ndaSpec.fields.find((field) => field.key === "purpose")?.default ?? "";

function ndaValues(overrides: Record<string, unknown> = {}): DocumentFormValues {
  return { ...defaultFormValues(ndaSpec), ...overrides } as DocumentFormValues;
}

function filledNdaValues(): DocumentFormValues {
  return ndaValues({
    purpose: "Evaluating a joint venture.",
    effectiveDate: "2026-08-06",
    mndaTermType: "fixed",
    mndaTermYears: "2",
    confidentialityTermType: "fixed",
    confidentialityTermYears: "3",
    governingLaw: "Delaware",
    jurisdiction: "courts located in New Castle, DE",
    modifications: "None beyond the Standard Terms.",
    party1: { printName: "Alice Smith", title: "CEO", company: "Acme Corp", noticeAddress: "alice@acme.com" },
    party2: { printName: "Bob Jones", title: "COO", company: "Globex Inc.", noticeAddress: "bob@globex.com" },
  });
}

function renderNda(values: DocumentFormValues): string {
  return renderDocument(ndaSpec, ndaTemplates, values);
}

describe("renderDocument (nda-coverpage renderer)", () => {
  describe("purpose", () => {
    it("falls back to the default purpose when purpose is blank", () => {
      const out = renderNda(ndaValues({ purpose: "" }));
      expect(out).toContain(purposeDefault);
      expect(out).not.toContain("[Evaluating whether to enter into a business relationship");
    });

    it("falls back to the default purpose when purpose is only whitespace", () => {
      const out = renderNda(ndaValues({ purpose: "   " }));
      expect(out).toContain(purposeDefault);
    });

    it("fills in a custom purpose", () => {
      const out = renderNda(ndaValues({ purpose: "Evaluating a joint venture." }));
      expect(out).toContain("Evaluating a joint venture.");
      expect(out).not.toContain(purposeDefault);
    });
  });

  describe("effective date", () => {
    it("shows the placeholder when effectiveDate is blank", () => {
      const out = renderNda(ndaValues({ effectiveDate: "" }));
      expect(out).toContain("[Today’s date]");
    });

    it("formats a valid ISO date as a long-form date", () => {
      const out = renderNda(ndaValues({ effectiveDate: "2026-08-06" }));
      expect(out).toContain("August 6, 2026");
      expect(out).not.toContain("[Today’s date]");
    });

    it("does not shift the date across a UTC day boundary (local-time parsing)", () => {
      const out = renderNda(ndaValues({ effectiveDate: "2026-01-01" }));
      expect(out).toContain("January 1, 2026");
    });

    it("falls back to the raw string for an unparseable date rather than crashing", () => {
      const out = renderNda(ndaValues({ effectiveDate: "not-a-date" }));
      expect(out).toContain("not-a-date");
    });
  });

  describe("MNDA term", () => {
    it("checks the fixed-term box and fills in the year count", () => {
      const out = renderNda(ndaValues({ mndaTermType: "fixed", mndaTermYears: "5" }));
      expect(out).toContain("- [x]     Expires 5 year(s) from Effective Date.");
      expect(out).toContain("- [ ]     Continues until terminated in accordance with the terms of the MNDA.");
    });

    it("checks the perpetual box instead when mndaTermType is perpetual", () => {
      const out = renderNda(ndaValues({ mndaTermType: "perpetual", mndaTermYears: "5" }));
      expect(out).toContain("- [ ]     Expires 5 year(s) from Effective Date.");
      expect(out).toContain("- [x]     Continues until terminated in accordance with the terms of the MNDA.");
    });

    it("defaults the year count to 1 when mndaTermYears is blank", () => {
      const out = renderNda(ndaValues({ mndaTermYears: "" }));
      expect(out).toContain("Expires 1 year(s) from Effective Date.");
    });
  });

  describe("term of confidentiality", () => {
    it("checks the fixed-term box and fills in the year count", () => {
      const out = renderNda(ndaValues({ confidentialityTermType: "fixed", confidentialityTermYears: "4" }));
      expect(out).toContain(
        "- [x]     4 year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws."
      );
      expect(out).toContain("- [ ]     In perpetuity.");
    });

    it("checks the in-perpetuity box instead when confidentialityTermType is perpetual", () => {
      const out = renderNda(ndaValues({ confidentialityTermType: "perpetual" }));
      expect(out).toContain("- [x]     In perpetuity.");
      expect(out).toMatch(/- \[ \]\s+1 year\(s\) from Effective Date/);
    });
  });

  describe("governing law & jurisdiction", () => {
    it("fills in both fields, trimmed", () => {
      const out = renderNda(ndaValues({ governingLaw: "  Delaware  ", jurisdiction: "courts located in New Castle, DE" }));
      expect(out).toContain("Governing Law: Delaware");
      expect(out).not.toContain("Governing Law:  Delaware");
      expect(out).toContain("Jurisdiction: courts located in New Castle, DE");
    });
  });

  describe("modifications", () => {
    it('shows "None." when modifications is blank', () => {
      const out = renderNda(ndaValues({ modifications: "" }));
      expect(out).toContain("None.");
    });

    it("fills in provided modifications text", () => {
      const out = renderNda(ndaValues({ modifications: "Cap liability at $100,000" }));
      expect(out).toContain("Cap liability at $100,000");
    });
  });

  describe("party table", () => {
    it("fills in print name, title, company, and notice address for both parties", () => {
      const out = renderNda(filledNdaValues());
      expect(out).toContain("| Print Name | Alice Smith | Bob Jones |");
      expect(out).toContain("| Title | CEO | COO |");
      expect(out).toContain("| Company | Acme Corp | Globex Inc. |");
      expect(out).toContain("alice@acme.com");
      expect(out).toContain("bob@globex.com");
    });

    it("leaves the Signature and Date rows blank for physical/e-signing", () => {
      const out = renderNda(filledNdaValues());
      expect(out).toContain("| Signature |  |  |");
      expect(out).toContain("| Date |  |  |");
    });

    it("renders a well-formed, non-empty table even when both parties are entirely blank", () => {
      const out = renderNda(ndaValues({ party1: { ...emptyPartyInfo }, party2: { ...emptyPartyInfo } }));
      expect(out).toContain("|| PARTY 1 | PARTY 2 |");
      expect(out).toContain("| Print Name |  |  |");
    });

    it("keeps the Notice Address hint as markdown italics, not a raw <label> tag", () => {
      const out = renderNda(filledNdaValues());
      expect(out).toContain("Notice Address *Use either email or postal address*");
    });
  });

  describe("<label> hint tags (regression: raw HTML escaping bug)", () => {
    it("never leaves a literal <label> tag in the output", () => {
      expect(renderNda(ndaValues())).not.toContain("<label>");
      expect(renderNda(filledNdaValues())).not.toContain("<label>");
    });

    it("converts every <label> hint into markdown italics", () => {
      const out = renderNda(ndaValues());
      expect(out).toContain("*How Confidential Information may be used*");
      expect(out).toContain("*The length of this MNDA*");
      expect(out).toContain("*How long Confidential Information is protected*");
    });
  });

  describe("$-pattern replace() safety (regression: String.replace special patterns)", () => {
    // String.prototype.replace(pattern, someString) treats "$&", "$$", "$`",
    // and "$'" specially in the replacement string, regardless of whether
    // `pattern` is a plain string or a RegExp. render-document.ts must use a
    // function replacer everywhere a value could contain user input, or
    // sequences like these would silently corrupt the output.
    const adversarialInputs = ["$&", "$$", "$`", "$'", "Foo $& Bar Inc.", "Cap fees at $$100"];

    it.each(adversarialInputs)("governingLaw containing %j passes through verbatim", (input) => {
      const out = renderNda(ndaValues({ governingLaw: input }));
      expect(out).toContain(`Governing Law: ${input}`);
    });

    it.each(adversarialInputs)("a party's company field containing %j passes through verbatim", (input) => {
      const out = renderNda(ndaValues({ party1: { ...emptyPartyInfo, company: input } }));
      expect(out).toContain(input);
    });

    it("does not duplicate the party table when a field contains $&", () => {
      const out = renderNda(ndaValues({ party1: { ...emptyPartyInfo, company: "Foo $& Bar Inc." } }));
      expect(out.match(/\|\| PARTY 1 \| PARTY 2 \|/g)).toHaveLength(1);
      expect(out).toContain("Foo $& Bar Inc.");
    });
  });

  describe("Standard Terms + combination", () => {
    it("bold-resolves every coverpage_link span and drops the raw span markup", () => {
      const out = renderNda(filledNdaValues());
      expect(out).not.toMatch(/coverpage_link/);
      expect(out).not.toMatch(/<span/);
      for (const term of ["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction"]) {
        expect(out).toContain(`**${term}**`);
      }
    });

    it("leaves the surrounding legal text unchanged", () => {
      const out = renderNda(filledNdaValues());
      expect(out).toContain("11. **General**.");
      expect(out).toContain("Common Paper Mutual Non-Disclosure Agreement");
    });

    it("combines the Cover Page and Standard Terms with a separator, Cover Page first", () => {
      const out = renderNda(filledNdaValues());
      expect(out).toContain("# Mutual Non-Disclosure Agreement");
      expect(out).toContain("# Standard Terms");
      expect(out.indexOf("# Mutual Non-Disclosure Agreement")).toBeLessThan(out.indexOf("# Standard Terms"));
      expect(out).toContain("\n\n---\n\n");
    });
  });
});

describe("renderDocument (generic-keyterms renderer)", () => {
  const { spec: addendumSpec, templates: addendumTemplates } = loadDocumentTypeFixture("ai-addendum");

  it("builds a Key Terms block listing every field with its label", () => {
    const values = defaultFormValues(addendumSpec);
    const out = renderDocument(addendumSpec, addendumTemplates, values);

    expect(out).toContain("## Key Terms");
    for (const field of addendumSpec.fields) {
      expect(out).toContain(`**${field.label}:**`);
    }
  });

  it("fills in a field's value when provided, and a placeholder when blank", () => {
    const values = defaultFormValues(addendumSpec);
    values.trainingData = "Anonymized support transcripts";
    const out = renderDocument(addendumSpec, addendumTemplates, values);

    expect(out).toContain("**Training Data:** Anonymized support transcripts");
    expect(out).toContain("**Training Purposes:** _Not yet specified_");
  });

  it("lists each party role with its company name", () => {
    const values = defaultFormValues(addendumSpec);
    values.provider = { ...emptyPartyInfo, company: "Acme Cloud" };
    const out = renderDocument(addendumSpec, addendumTemplates, values);

    expect(out).toContain("**Provider:** Acme Cloud");
  });

  it("bold-resolves the Standard Terms' Variable spans and appends them after a separator", () => {
    const values = defaultFormValues(addendumSpec);
    const out = renderDocument(addendumSpec, addendumTemplates, values);

    expect(out).not.toMatch(/<span/);
    expect(out).toContain("**Customer**");
    expect(out.indexOf("## Key Terms")).toBeLessThan(out.indexOf("\n\n---\n\n"));
  });

  it("bold-resolves every _link Variable class, not just coverpage/orderform/keyterms", () => {
    // Regression: partnership-agreement.md uses businessterms_link and
    // psa.md uses sow_link, which the Variable-span regex initially missed
    // -- they still rendered safely (caught by the structural-span
    // stripper) but as plain text instead of bold, unlike every other
    // Variable reference.
    const { spec: psaSpec, templates: psaTemplates } = loadDocumentTypeFixture("psa");
    const out = renderDocument(psaSpec, psaTemplates, defaultFormValues(psaSpec));

    expect(out).not.toMatch(/<span/);
    expect(out).toContain("**SOW Term**");
  });

  it("strips structural header/id spans without leaving raw HTML in the output", () => {
    // Regression: csa.md/ai-addendum.md use <span class="header_2"/"header_3"
    // id="..."> and bare <span id="..."> for section-anchor markup, separate
    // from Variable spans -- these must be unwrapped to their inner text
    // rather than left as literal HTML (react-markdown has no rehype-raw).
    const out = renderDocument(addendumSpec, addendumTemplates, defaultFormValues(addendumSpec));

    expect(out).not.toContain("<span");
    expect(out).not.toContain("</span>");
    expect(out).toContain("AI Services");
  });
});
