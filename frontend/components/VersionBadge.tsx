import { APP_VERSION } from "@/lib/version";

/**
 * Always-visible build marker fixed in the top-right corner, so it's easy to
 * tell whether the browser is running stale cached frontend code vs. the
 * latest build. See lib/version.ts and CLAUDE.md's "Frontend version badge".
 */
export default function VersionBadge() {
  return (
    <span className="pointer-events-none fixed top-2 right-2 z-50 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[10px] text-neutral-500 shadow-sm">
      {APP_VERSION}
    </span>
  );
}
