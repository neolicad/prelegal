import { describe, expect, it } from "vitest";
import { renderCoverPage, renderNdaDocument, renderStandardTerms } from "./render-nda";
import { DEFAULT_PURPOSE, defaultFormValues, emptyPartyInfo, type NdaFormValues } from "./nda-form";
import { loadNdaTemplates } from "./test-support/load-templates";

// Read the real, CC-licensed templates (added in PL-5) rather than synthetic
// fixtures, so these tests fail loudly if the templates ever change in a way
// that breaks the targeted string/regex replacements in render-nda.ts —
// exactly the class of bug these tests exist to catch.
const { coverPageTemplate, standardTermsTemplate } = loadNdaTemplates();

function values(overrides: Partial<NdaFormValues> = {}): NdaFormValues {
  return { ...defaultFormValues, ...overrides };
}

function filledValues(): NdaFormValues {
  return values({
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

describe("renderCoverPage", () => {
  describe("purpose", () => {
    it("falls back to the default purpose when purpose is blank", () => {
      const out = renderCoverPage(coverPageTemplate, values({ purpose: "" }));
      expect(out).toContain(DEFAULT_PURPOSE);
      expect(out).not.toContain("[Evaluating whether to enter into a business relationship");
    });

    it("falls back to the default purpose when purpose is only whitespace", () => {
      const out = renderCoverPage(coverPageTemplate, values({ purpose: "   " }));
      expect(out).toContain(DEFAULT_PURPOSE);
    });

    it("fills in a custom purpose", () => {
      const out = renderCoverPage(coverPageTemplate, values({ purpose: "Evaluating a joint venture." }));
      expect(out).toContain("Evaluating a joint venture.");
      expect(out).not.toContain(DEFAULT_PURPOSE);
    });
  });

  describe("effective date", () => {
    it("shows the placeholder when effectiveDate is blank", () => {
      const out = renderCoverPage(coverPageTemplate, values({ effectiveDate: "" }));
      expect(out).toContain("[Today’s date]");
    });

    it("formats a valid ISO date as a long-form date", () => {
      const out = renderCoverPage(coverPageTemplate, values({ effectiveDate: "2026-08-06" }));
      expect(out).toContain("August 6, 2026");
      expect(out).not.toContain("[Today’s date]");
    });

    it("does not shift the date across a UTC day boundary (local-time parsing)", () => {
      // A naive `new Date(isoDate)` parses as UTC midnight, which can render
      // as the previous day in timezones behind UTC. render-nda.ts appends
      // "T00:00:00" specifically to force local-time parsing instead.
      const out = renderCoverPage(coverPageTemplate, values({ effectiveDate: "2026-01-01" }));
      expect(out).toContain("January 1, 2026");
    });

    it("falls back to the raw string for an unparseable date rather than crashing", () => {
      const out = renderCoverPage(coverPageTemplate, values({ effectiveDate: "not-a-date" }));
      expect(out).toContain("not-a-date");
    });
  });

  describe("MNDA term", () => {
    it("checks the fixed-term box and fills in the year count", () => {
      const out = renderCoverPage(coverPageTemplate, values({ mndaTermType: "fixed", mndaTermYears: "5" }));
      expect(out).toContain("- [x]     Expires 5 year(s) from Effective Date.");
      expect(out).toContain("- [ ]     Continues until terminated in accordance with the terms of the MNDA.");
    });

    it("checks the perpetual box instead when mndaTermType is perpetual", () => {
      const out = renderCoverPage(coverPageTemplate, values({ mndaTermType: "perpetual", mndaTermYears: "5" }));
      expect(out).toContain("- [ ]     Expires 5 year(s) from Effective Date.");
      expect(out).toContain("- [x]     Continues until terminated in accordance with the terms of the MNDA.");
    });

    it("defaults the year count to 1 when mndaTermYears is blank", () => {
      const out = renderCoverPage(coverPageTemplate, values({ mndaTermYears: "" }));
      expect(out).toContain("Expires 1 year(s) from Effective Date.");
    });

    it("defaults the year count to 1 when mndaTermYears is only whitespace", () => {
      const out = renderCoverPage(coverPageTemplate, values({ mndaTermYears: "  " }));
      expect(out).toContain("Expires 1 year(s) from Effective Date.");
    });
  });

  describe("term of confidentiality", () => {
    it("checks the fixed-term box and fills in the year count", () => {
      const out = renderCoverPage(
        coverPageTemplate,
        values({ confidentialityTermType: "fixed", confidentialityTermYears: "4" })
      );
      expect(out).toContain(
        "- [x]     4 year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws."
      );
      expect(out).toContain("- [ ]     In perpetuity.");
    });

    it("checks the in-perpetuity box instead when confidentialityTermType is perpetual", () => {
      const out = renderCoverPage(coverPageTemplate, values({ confidentialityTermType: "perpetual" }));
      expect(out).toContain("- [x]     In perpetuity.");
      expect(out).toMatch(/- \[ \]\s+1 year\(s\) from Effective Date/);
    });

    it("defaults the year count to 1 when confidentialityTermYears is blank", () => {
      const out = renderCoverPage(coverPageTemplate, values({ confidentialityTermYears: "" }));
      expect(out).toContain("1 year(s) from Effective Date, but in the case of trade secrets");
    });
  });

  describe("governing law & jurisdiction", () => {
    it("fills in both fields", () => {
      const out = renderCoverPage(
        coverPageTemplate,
        values({ governingLaw: "Delaware", jurisdiction: "courts located in New Castle, DE" })
      );
      expect(out).toContain("Governing Law: Delaware");
      expect(out).toContain("Jurisdiction: courts located in New Castle, DE");
    });

    it("trims surrounding whitespace", () => {
      const out = renderCoverPage(coverPageTemplate, values({ governingLaw: "  Delaware  " }));
      expect(out).toContain("Governing Law: Delaware");
      expect(out).not.toContain("Governing Law:  Delaware");
    });
  });

  describe("modifications", () => {
    it('shows "None." when modifications is blank', () => {
      const out = renderCoverPage(coverPageTemplate, values({ modifications: "" }));
      expect(out).toContain("None.");
    });

    it("fills in provided modifications text", () => {
      const out = renderCoverPage(coverPageTemplate, values({ modifications: "Cap liability at $100,000" }));
      expect(out).toContain("Cap liability at $100,000");
    });
  });

  describe("party table", () => {
    it("fills in print name, title, company, and notice address for both parties", () => {
      const out = renderCoverPage(coverPageTemplate, filledValues());
      expect(out).toContain("| Print Name | Alice Smith | Bob Jones |");
      expect(out).toContain("| Title | CEO | COO |");
      expect(out).toContain("| Company | Acme Corp | Globex Inc. |");
      expect(out).toContain("alice@acme.com");
      expect(out).toContain("bob@globex.com");
    });

    it("leaves the Signature and Date rows blank for physical/e-signing", () => {
      const out = renderCoverPage(coverPageTemplate, filledValues());
      expect(out).toContain("| Signature |  |  |");
      expect(out).toContain("| Date |  |  |");
    });

    it("renders a well-formed, non-empty table even when both parties are entirely blank", () => {
      const out = renderCoverPage(coverPageTemplate, values({ party1: { ...emptyPartyInfo }, party2: { ...emptyPartyInfo } }));
      expect(out).toContain("|| PARTY 1 | PARTY 2 |");
      expect(out).toContain("| Print Name |  |  |");
    });

    it("keeps the Notice Address hint as markdown italics, not a raw <label> tag", () => {
      const out = renderCoverPage(coverPageTemplate, filledValues());
      expect(out).toContain("Notice Address *Use either email or postal address*");
    });
  });

  describe("<label> hint tags (regression: raw HTML escaping bug)", () => {
    it("never leaves a literal <label> tag in the output, with default values", () => {
      const out = renderCoverPage(coverPageTemplate, defaultFormValues);
      expect(out).not.toContain("<label>");
      expect(out).not.toContain("</label>");
    });

    it("never leaves a literal <label> tag in the output, with all fields filled", () => {
      const out = renderCoverPage(coverPageTemplate, filledValues());
      expect(out).not.toContain("<label>");
      expect(out).not.toContain("</label>");
    });

    it("converts every <label> hint into markdown italics", () => {
      const out = renderCoverPage(coverPageTemplate, defaultFormValues);
      expect(out).toContain("*How Confidential Information may be used*");
      expect(out).toContain("*The length of this MNDA*");
      expect(out).toContain("*How long Confidential Information is protected*");
    });
  });

  describe("$-pattern replace() safety (regression: String.replace special patterns)", () => {
    // String.prototype.replace(pattern, someString) treats "$&", "$$", "$`",
    // and "$'" specially in the replacement string, regardless of whether
    // `pattern` is a plain string or a RegExp. render-nda.ts must use a
    // function replacer everywhere a value could contain user input, or
    // sequences like these would silently corrupt the output.
    const adversarialInputs = ["$&", "$$", "$`", "$'", "Foo $& Bar Inc.", "Cap fees at $$100"];

    it.each(adversarialInputs)("purpose containing %j passes through verbatim", (input) => {
      const out = renderCoverPage(coverPageTemplate, values({ purpose: input }));
      expect(out).toContain(input);
    });

    it.each(adversarialInputs)("governingLaw containing %j passes through verbatim", (input) => {
      const out = renderCoverPage(coverPageTemplate, values({ governingLaw: input }));
      expect(out).toContain(`Governing Law: ${input}`);
    });

    it.each(adversarialInputs)("jurisdiction containing %j passes through verbatim", (input) => {
      const out = renderCoverPage(coverPageTemplate, values({ jurisdiction: input }));
      expect(out).toContain(`Jurisdiction: ${input}`);
    });

    it.each(adversarialInputs)("modifications containing %j passes through verbatim", (input) => {
      const out = renderCoverPage(coverPageTemplate, values({ modifications: input }));
      expect(out).toContain(input);
    });

    it.each(adversarialInputs)("a party's company field containing %j passes through verbatim", (input) => {
      const out = renderCoverPage(
        coverPageTemplate,
        values({ party1: { ...emptyPartyInfo, company: input } })
      );
      expect(out).toContain(input);
    });

    it("does not duplicate the party table when a field contains $&", () => {
      const out = renderCoverPage(
        coverPageTemplate,
        values({ party1: { ...emptyPartyInfo, company: "Foo $& Bar Inc." } })
      );
      // A bare (non-function) replacer would re-insert the whole matched
      // block via "$&", producing a second, unfilled copy of the table.
      expect(out.match(/\|\| PARTY 1 \| PARTY 2 \|/g)).toHaveLength(1);
      expect(out).toContain("Foo $& Bar Inc.");
    });

    it("does not collapse $$ to a single $ anywhere in the output", () => {
      const out = renderCoverPage(coverPageTemplate, values({ modifications: "Cap fees at $$100,000" }));
      expect(out).toContain("Cap fees at $$100,000");
      expect(out).not.toContain("Cap fees at $100,000");
    });
  });
});

describe("renderStandardTerms", () => {
  it("converts every coverpage_link span into bold markdown", () => {
    const out = renderStandardTerms(standardTermsTemplate);
    expect(out).not.toMatch(/coverpage_link/);
    expect(out).not.toMatch(/<span/);
  });

  it("bolds each of the known defined-term references", () => {
    const out = renderStandardTerms(standardTermsTemplate);
    for (const term of ["Purpose", "Effective Date", "MNDA Term", "Term of Confidentiality", "Governing Law", "Jurisdiction"]) {
      expect(out).toContain(`**${term}**`);
    }
  });

  it("leaves the surrounding legal text unchanged", () => {
    const out = renderStandardTerms(standardTermsTemplate);
    expect(out).toContain("11. **General**.");
    expect(out).toContain("Common Paper Mutual Non-Disclosure Agreement");
  });
});

describe("renderNdaDocument", () => {
  it("combines the filled Cover Page and Standard Terms with a separator", () => {
    const out = renderNdaDocument(coverPageTemplate, standardTermsTemplate, filledValues());
    expect(out).toContain("# Mutual Non-Disclosure Agreement");
    expect(out).toContain("# Standard Terms");
    expect(out.indexOf("# Mutual Non-Disclosure Agreement")).toBeLessThan(out.indexOf("# Standard Terms"));
    expect(out).toContain("\n\n---\n\n");
  });

  it("contains no literal <label> tags or leftover coverpage_link spans anywhere in the combined document", () => {
    const out = renderNdaDocument(coverPageTemplate, standardTermsTemplate, filledValues());
    expect(out).not.toContain("<label>");
    expect(out).not.toMatch(/coverpage_link/);
  });

  it("reflects the submitted values throughout the combined document", () => {
    const out = renderNdaDocument(coverPageTemplate, standardTermsTemplate, filledValues());
    expect(out).toContain("Alice Smith");
    expect(out).toContain("Bob Jones");
    expect(out).toContain("Governing Law: Delaware");
  });
});
