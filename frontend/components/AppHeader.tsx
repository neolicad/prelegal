"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser, logout } from "@/lib/api";

/**
 * Persistent nav shown on every authenticated page (see app/(app)/layout.tsx)
 * -- establishes one consistent app shell/identity instead of each page
 * building its own header from scratch.
 */
export default function AppHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setEmail(user.email))
      .catch(() => setEmail(null));
  }, []);

  async function handleSignOut() {
    await logout();
    // Full page load (not client-side routing) so the backend's cookie
    // check in GET / actually runs -- see backend/app/main.py.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[110rem] items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-yellow" aria-hidden="true" />
            Prelegal
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-neutral-600">
            <Link href="/" className="hover:text-brand-blue">
              New Document
            </Link>
            <Link href="/my-documents" className="hover:text-brand-blue">
              My Documents
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          {email ? <span className="hidden sm:inline">{email}</span> : null}
          <button type="button" onClick={() => void handleSignOut()} className="font-medium hover:text-brand-navy">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
