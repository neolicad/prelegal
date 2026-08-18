"""Signup, login, logout, and "who am I" for the real session-cookie auth."""

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.auth import (
    SESSION_COOKIE,
    create_session,
    delete_session,
    hash_password,
    require_session,
    verify_password,
)
from app.db import get_db
from app.schemas import LoginRequest, SignupRequest

router = APIRouter(prefix="/api/auth")

SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        path="/",
    )


@router.post("/signup")
def signup(payload: SignupRequest, response: Response, connection: sqlite3.Connection = Depends(get_db)) -> dict:
    # Relies on users.email's UNIQUE constraint rather than a check-then-insert
    # (SELECT then INSERT) -- the latter has a race window where two
    # concurrent signups for the same new email can both pass the check.
    try:
        cursor = connection.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (payload.email, hash_password(payload.password)),
        )
        connection.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with that email already exists") from None
    token = create_session(connection, cursor.lastrowid)
    _set_session_cookie(response, token)
    return {"email": payload.email}


@router.post("/login")
def login(payload: LoginRequest, response: Response, connection: sqlite3.Connection = Depends(get_db)) -> dict:
    row = connection.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (payload.email,)
    ).fetchone()
    if row is None or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session(connection, row["id"])
    _set_session_cookie(response, token)
    return {"email": payload.email}


@router.post("/logout", dependencies=[Depends(require_session)])
def logout(request: Request, response: Response, connection: sqlite3.Connection = Depends(get_db)) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        delete_session(connection, token)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(
    user_id: int = Depends(require_session), connection: sqlite3.Connection = Depends(get_db)
) -> dict:
    row = connection.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"email": row["email"]}
