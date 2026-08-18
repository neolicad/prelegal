"""Session-cookie auth backed by real DB-issued sessions.

A session token is a random, unguessable string minted at signup/login time
(see app/routers/auth.py) and stored in the `sessions` table alongside the
user it belongs to. The cookie only ever carries that opaque token -- it
proves nothing on its own, so every check below looks the token up rather
than trusting its presence.
"""

import secrets
import sqlite3

import bcrypt
from fastapi import Depends, HTTPException, Request

from app.db import get_db

SESSION_COOKIE = "prelegal_session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_session(connection: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    connection.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    connection.commit()
    return token


def delete_session(connection: sqlite3.Connection, token: str) -> None:
    connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
    connection.commit()


def get_optional_user_id(request: Request, connection: sqlite3.Connection = Depends(get_db)) -> int | None:
    """FastAPI dependency resolving the signed-in user id, if any."""
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    row = connection.execute("SELECT user_id FROM sessions WHERE token = ?", (token,)).fetchone()
    return row["user_id"] if row else None


def require_session(user_id: int | None = Depends(get_optional_user_id)) -> int:
    """FastAPI dependency that 401s routes lacking a valid session, else returns the user id."""
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
