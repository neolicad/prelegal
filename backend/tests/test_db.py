import sqlite3

from app.db import _db_path, init_db


def test_init_db_creates_users_table(client):
    connection = sqlite3.connect(_db_path())
    try:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).fetchall()
    finally:
        connection.close()

    assert tables == [("users",)]


def test_init_db_recreates_from_scratch(client):
    connection = sqlite3.connect(_db_path())
    try:
        connection.execute(
            "INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')"
        )
        connection.commit()
    finally:
        connection.close()

    init_db()

    connection = sqlite3.connect(_db_path())
    try:
        rows = connection.execute("SELECT * FROM users").fetchall()
    finally:
        connection.close()

    assert rows == []
