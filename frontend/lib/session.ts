// This is a fake, client-only session for PL-7's foundational login screen --
// there is no real authentication yet. The backend checks for the presence
// of this same cookie (see backend/app/main.py) to decide whether to serve
// the app or redirect to /login.
const SESSION_COOKIE = "prelegal_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}`;
}
