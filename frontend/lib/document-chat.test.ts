import { describe, expect, it } from "vitest";
import { mergeDocumentFieldUpdates } from "./document-chat";
import { defaultFormValues, getFieldValue, getPartyValue } from "./document-form";
import { loadDocumentTypeFixture } from "./test-support/load-document-type";

describe("mergeDocumentFieldUpdates", () => {
  it("applies a plain field update", () => {
    const { spec } = loadDocumentTypeFixture("mutual-nda");
    const values = defaultFormValues(spec);

    const merged = mergeDocumentFieldUpdates(spec, values, { governingLaw: "Delaware" });

    expect(getFieldValue(merged, "governingLaw")).toBe("Delaware");
  });

  it("leaves a field untouched when its update is null, undefined, or empty", () => {
    const { spec } = loadDocumentTypeFixture("mutual-nda");
    const values = { ...defaultFormValues(spec), jurisdiction: "courts located in New Castle, DE" };

    const merged = mergeDocumentFieldUpdates(spec, values, {
      jurisdiction: null,
      governingLaw: undefined,
      modifications: "",
    });

    expect(getFieldValue(merged, "jurisdiction")).toBe("courts located in New Castle, DE");
    expect(getFieldValue(merged, "governingLaw")).toBe("");
    expect(getFieldValue(merged, "modifications")).toBe("");
  });

  it("merges a partial party update without clobbering that party's other fields", () => {
    const { spec } = loadDocumentTypeFixture("mutual-nda");
    const values = mergeDocumentFieldUpdates(spec, defaultFormValues(spec), {
      party1: { printName: "Alice Smith", company: "Acme" },
    });

    const merged = mergeDocumentFieldUpdates(spec, values, { party1: { company: "Acme Corp" } });

    expect(getPartyValue(merged, "party1")).toEqual({
      printName: "Alice Smith",
      title: "",
      company: "Acme Corp",
      noticeAddress: "",
    });
  });

  it("leaves a party untouched when its update is null", () => {
    const { spec } = loadDocumentTypeFixture("csa");
    const values = mergeDocumentFieldUpdates(spec, defaultFormValues(spec), {
      provider: { company: "Acme" },
    });

    const merged = mergeDocumentFieldUpdates(spec, values, { provider: null });

    expect(getPartyValue(merged, "provider").company).toBe("Acme");
  });

  it("does not mutate the values object it was given", () => {
    const { spec } = loadDocumentTypeFixture("mutual-nda");
    const values = defaultFormValues(spec);

    mergeDocumentFieldUpdates(spec, values, { governingLaw: "Delaware" });

    expect(getFieldValue(values, "governingLaw")).toBe("");
  });
});
