import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library normally auto-cleans up after each test when it
// detects a global `afterEach` (Vitest's `test.globals` option), but we
// import test functions explicitly rather than relying on globals, so we
// register cleanup ourselves.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement scrollIntoView (used by ChatMessageList's
// auto-scroll) -- stub it globally rather than per test file.
Element.prototype.scrollIntoView = vi.fn();
