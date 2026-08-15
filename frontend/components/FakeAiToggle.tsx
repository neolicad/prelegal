"use client";

import { useSyncExternalStore } from "react";
import { isFakeAiEnabled, setFakeAiEnabled, subscribeFakeAiEnabled } from "@/lib/fake-ai";

/**
 * A small always-visible testing control: switches the chat endpoints to a
 * canned "blah blah blah" reply instead of the real LLM, so the UI can be
 * exercised repeatedly without spending real API calls. See lib/fake-ai.ts.
 */
export default function FakeAiToggle() {
  // useSyncExternalStore (not a useState+useEffect sync-on-mount) since
  // localStorage isn't available during SSR -- this is exactly what it's
  // for: a value that can differ between server and client snapshots.
  const enabled = useSyncExternalStore(subscribeFakeAiEnabled, isFakeAiEnabled, () => false);

  return (
    <label className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-600 shadow-sm">
      <input type="checkbox" checked={enabled} onChange={(e) => setFakeAiEnabled(e.target.checked)} />
      Fake AI (testing)
    </label>
  );
}
