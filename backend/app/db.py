"""SQLite database setup.

The database is recreated from scratch on every startup -- it is not meant
to persist data across container restarts yet. The `users` table is schema
only for now; PL-7 ships a fake, client-side login and does not read or
write to it.
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


def init_db() -> None:
    """Delete any existing database file and recreate the schema."""
    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db_path.unlink(missing_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(USERS_TABLE_SQL)
        connection.commit()
    finally:
        connection.close()
