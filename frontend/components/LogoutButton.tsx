"use client";

import { clearSessionCookie } from "@/lib/session";

export default function LogoutButton() {
  function handleLogout() {
    clearSessionCookie();
    // A full page load (not client-side routing) so the backend's cookie
    // check in GET /login actually runs -- see backend/app/main.py.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
    >
      Log out
    </button>
  );
}
