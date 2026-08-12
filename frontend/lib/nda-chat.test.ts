import { describe, expect, it } from "vitest";
import { mergeNdaFieldUpdates, type NdaFieldUpdates } from "./nda-chat";
import { defaultFormValues } from "./nda-form";

describe("mergeNdaFieldUpdates", () => {
  it("applies a top-level field update", () => {
    const merged = mergeNdaFieldUpdates(defaultFormValues, { governingLaw: "Delaware" });
    expect(merged.governingLaw).toBe("Delaware");
  });

  it("leaves null fields untouched", () => {
    const values = { ...defaultFormValues, governingLaw: "Delaware" };
    const updates: NdaFieldUpdates = { governingLaw: null as unknown as string | undefined };
    const merged = mergeNdaFieldUpdates(values, updates);
    expect(merged.governingLaw).toBe("Delaware");
  });

  it("leaves empty-string fields untouched", () => {
    const values = { ...defaultFormValues, governingLaw: "Delaware" };
    const merged = mergeNdaFieldUpdates(values, { governingLaw: "" });
    expect(merged.governingLaw).toBe("Delaware");
  });

  it("does not clobber fields absent from the update", () => {
    const values = { ...defaultFormValues, jurisdiction: "courts located in New Castle, DE" };
    const merged = mergeNdaFieldUpdates(values, { governingLaw: "Delaware" });
    expect(merged.jurisdiction).toBe("courts located in New Castle, DE");
  });

  it("merges a partial party update without touching the other party", () => {
    const merged = mergeNdaFieldUpdates(defaultFormValues, {
      party1: { company: "Acme Inc" },
    });
    expect(merged.party1.company).toBe("Acme Inc");
    expect(merged.party2.company).toBe("");
  });

  it("merges partial party fields without clobbering sibling fields already set", () => {
    const values = {
      ...defaultFormValues,
      party1: { ...defaultFormValues.party1, printName: "Alice Smith" },
    };
    const merged = mergeNdaFieldUpdates(values, { party1: { company: "Acme Inc" } });
    expect(merged.party1.printName).toBe("Alice Smith");
    expect(merged.party1.company).toBe("Acme Inc");
  });

  it("returns a new object rather than mutating the input", () => {
    const merged = mergeNdaFieldUpdates(defaultFormValues, { governingLaw: "Delaware" });
    expect(merged).not.toBe(defaultFormValues);
    expect(defaultFormValues.governingLaw).toBe("");
  });
});
