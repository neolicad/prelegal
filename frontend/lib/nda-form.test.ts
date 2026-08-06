import { describe, expect, it } from "vitest";
import { DEFAULT_PURPOSE, defaultFormValues } from "./nda-form";

describe("defaultFormValues", () => {
  it("defaults purpose to DEFAULT_PURPOSE", () => {
    expect(defaultFormValues.purpose).toBe(DEFAULT_PURPOSE);
  });

  it("defaults both term types to fixed, 1 year", () => {
    expect(defaultFormValues.mndaTermType).toBe("fixed");
    expect(defaultFormValues.mndaTermYears).toBe("1");
    expect(defaultFormValues.confidentialityTermType).toBe("fixed");
    expect(defaultFormValues.confidentialityTermYears).toBe("1");
  });

  it("gives party1 and party2 independent objects, not a shared reference", () => {
    // Regression guard: if a future edit changes `party1: emptyPartyInfo,
    // party2: emptyPartyInfo` (dropping the spread), both parties would
    // silently share one object and editing one would edit the other.
    expect(defaultFormValues.party1).not.toBe(defaultFormValues.party2);

    const mutated = { ...defaultFormValues, party1: { ...defaultFormValues.party1, printName: "Alice" } };
    expect(mutated.party2.printName).toBe("");
  });
});
