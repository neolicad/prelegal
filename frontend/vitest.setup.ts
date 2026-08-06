import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library normally auto-cleans up after each test when it
// detects a global `afterEach` (Vitest's `test.globals` option), but we
// import test functions explicitly rather than relying on globals, so we
// register cleanup ourselves.
afterEach(() => {
  cleanup();
});
