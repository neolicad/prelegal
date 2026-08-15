import { vi } from "vitest";

/** Every ResizeObserver callback created since the mock was installed, in creation order. */
export const resizeObserverCallbacks: ResizeObserverCallback[] = [];

class MockResizeObserver {
  #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
    resizeObserverCallbacks.push(callback);
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * jsdom doesn't implement ResizeObserver, so this stubs it globally with a
 * mock that lets tests manually invoke a captured callback via
 * triggerLatestResize(), rather than relying on real layout to fire it.
 */
export function installResizeObserverMock() {
  resizeObserverCallbacks.length = 0;
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
}

/** Invokes the most recently created ResizeObserver's callback, as if it fired. */
export function triggerLatestResize() {
  const callback = resizeObserverCallbacks.at(-1);
  callback?.([] as unknown as ResizeObserverEntry[], {} as ResizeObserver);
}
