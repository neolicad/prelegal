import { afterEach, describe, expect, it } from "vitest";
import { isFakeAiEnabled, setFakeAiEnabled } from "./fake-ai";

describe("fake-ai", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to disabled", () => {
    expect(isFakeAiEnabled()).toBe(false);
  });

  it("persists enabling across reads", () => {
    setFakeAiEnabled(true);

    expect(isFakeAiEnabled()).toBe(true);
  });

  it("persists disabling across reads", () => {
    setFakeAiEnabled(true);
    setFakeAiEnabled(false);

    expect(isFakeAiEnabled()).toBe(false);
  });
});
