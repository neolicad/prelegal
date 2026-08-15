import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates a normal company name", () => {
    expect(slugify("Foo Bar Inc.")).toBe("foo-bar-inc");
  });

  it("strips special characters instead of preserving them", () => {
    expect(slugify("Foo $& Bar Inc.")).toBe("foo-bar-inc");
  });

  it("collapses runs of whitespace/punctuation into a single hyphen", () => {
    expect(slugify("Foo   &   Bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("!!!Foo Bar!!!")).toBe("foo-bar");
  });

  it('falls back to "party" by default for an empty string', () => {
    expect(slugify("")).toBe("party");
  });

  it("falls back to a custom fallback when given one", () => {
    expect(slugify("", "csa")).toBe("csa");
  });

  it('falls back for a string with no alphanumeric characters', () => {
    // The Company field is `required` but that only rejects an empty
    // string — punctuation-only input like this still passes HTML
    // validation and must degrade gracefully rather than produce an
    // empty/invalid filename segment.
    expect(slugify("—")).toBe("party");
  });
});
