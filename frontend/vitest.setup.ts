import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { installResizeObserverMock } from "./lib/test-support/mock-resize-observer";

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

// jsdom doesn't implement ResizeObserver (also used by ChatMessageList's
// auto-scroll, to keep following the bottom as content reflows after the
// initial scroll) -- see lib/test-support/mock-resize-observer.ts.
installResizeObserverMock();
