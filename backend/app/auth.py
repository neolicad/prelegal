"""Fake session-cookie auth, shared by page routes and API routes.

There is no real authentication yet -- a cookie's mere presence is the
"session" (see frontend/lib/session.ts, which sets it client-side after any
credentials are submitted).
"""

from fastapi import HTTPException, Request

SESSION_COOKIE = "prelegal_session"


def has_session(request: Request) -> bool:
    return bool(request.cookies.get(SESSION_COOKIE))


def require_session(request: Request) -> None:
    """FastAPI dependency that 401s API routes lacking the session cookie."""
    if not has_session(request):
        raise HTTPException(status_code=401, detail="Not authenticated")
