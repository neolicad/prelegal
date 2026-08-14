import { describe, expect, it } from "vitest";
import { defaultFormValues, getFieldValue, getPartyValue } from "./document-form";
import { loadDocumentTypeFixture } from "./test-support/load-document-type";

describe("defaultFormValues", () => {
  it("seeds a top-level key per field, defaulting to the spec's default or an empty string", () => {
    const { spec } = loadDocumentTypeFixture("mutual-nda");

    const values = defaultFormValues(spec);

    expect(getFieldValue(values, "mndaTermType")).toBe("fixed");
    expect(getFieldValue(values, "governingLaw")).toBe("");
    expect(getFieldValue(values, "purpose")).toContain("Evaluating whether to enter");
  });

  it("seeds a top-level key per party role, with empty PartyInfo", () => {
    const { spec } = loadDocumentTypeFixture("csa");

    const values = defaultFormValues(spec);

    expect(getPartyValue(values, "provider")).toEqual({
      printName: "",
      title: "",
      company: "",
      noticeAddress: "",
    });
    expect(getPartyValue(values, "customer")).toEqual({
      printName: "",
      title: "",
      company: "",
      noticeAddress: "",
    });
  });
});

describe("getFieldValue / getPartyValue", () => {
  it("returns empty fallbacks for a key that isn't present in values", () => {
    expect(getFieldValue({}, "missing")).toBe("");
    expect(getPartyValue({}, "missing")).toEqual({ printName: "", title: "", company: "", noticeAddress: "" });
  });

  it("does not mix up a field value for a party value or vice versa", () => {
    const values = { governingLaw: "Delaware", provider: { printName: "Alice", title: "", company: "", noticeAddress: "" } };

    expect(getFieldValue(values, "provider")).toBe(""); // provider is a PartyInfo, not a string
    expect(getPartyValue(values, "governingLaw")).toEqual({
      printName: "",
      title: "",
      company: "",
      noticeAddress: "",
    }); // governingLaw is a string, not a PartyInfo
  });
});
