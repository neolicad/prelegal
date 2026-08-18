import { describe, expect, it } from "vitest";
import { isMeaningfulFieldUpdate, mergeDocumentFieldUpdates } from "./document-chat";
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

describe("isMeaningfulFieldUpdate", () => {
  it("is true for a non-empty string", () => {
    expect(isMeaningfulFieldUpdate("Delaware")).toBe(true);
  });

  it("is false for an empty string, null, or undefined", () => {
    expect(isMeaningfulFieldUpdate("")).toBe(false);
    expect(isMeaningfulFieldUpdate(null)).toBe(false);
    expect(isMeaningfulFieldUpdate(undefined)).toBe(false);
  });

  it("is true for a party update with at least one non-empty subfield", () => {
    expect(isMeaningfulFieldUpdate({ company: "Acme" })).toBe(true);
  });

  it("is false for a party update object whose every subfield is empty", () => {
    // Regression test: a party update is an object, so it's truthy on its
    // own even when nothing in it actually changed -- e.g. the LLM
    // returning the full party shape with every field left "" on a turn
    // that filled nothing. A naive `if (updates[key])` check (as
    // DocumentApp.tsx's scroll-to-field trigger once did) would otherwise
    // treat this as "the party was updated" and scroll to it regardless.
    expect(isMeaningfulFieldUpdate({ printName: "", title: "", company: "", noticeAddress: "" })).toBe(false);
  });
});
