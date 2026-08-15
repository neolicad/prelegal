"""SQLite database setup.

The database is recreated from scratch on every startup -- it is not meant
to persist data across container restarts.
"""

import os
import sqlite3
from pathlib import Path


def _db_path() -> Path:
    return Path(os.environ.get("PRELEGAL_DB_PATH", "data/prelegal.db"))


USERS_TABLE_SQL = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

SESSIONS_TABLE_SQL = """
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""

DOCUMENTS_TABLE_SQL = """
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    values_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


def init_db() -> None:
    """Delete any existing database file and recreate the schema."""
    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(USERS_TABLE_SQL)
        connection.execute(SESSIONS_TABLE_SQL)
        connection.execute(DOCUMENTS_TABLE_SQL)
        connection.commit()
    finally:
        connection.close()


def get_connection() -> sqlite3.Connection:
    # check_same_thread=False: FastAPI dispatches a sync dependency
    # generator's startup and teardown as separate threadpool jobs, not
    # guaranteed to land on the same worker thread -- sqlite3's default
    # same-thread check would otherwise raise on close().
    connection = sqlite3.connect(_db_path(), check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_db():
    """FastAPI dependency yielding a request-scoped connection."""
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()
