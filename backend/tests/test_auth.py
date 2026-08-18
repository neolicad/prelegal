import pytest
from fastapi import HTTPException

from app.auth import (
    create_session,
    get_optional_user_id,
    hash_password,
    require_session,
    verify_password,
)
from app.db import get_connection, init_db


@pytest.fixture
def connection(tmp_path, monkeypatch):
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "prelegal.db"))
    init_db()
    connection = get_connection()
    yield connection
    connection.close()


def _insert_user(connection, email="a@example.com", password="hunter2") -> int:
    cursor = connection.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, hash_password(password))
    )
    connection.commit()
    return cursor.lastrowid


def test_hash_password_round_trips():
    hashed = hash_password("hunter2")
    assert hashed != "hunter2"
    assert verify_password("hunter2", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_get_optional_user_id_none_without_cookie(connection):
    assert get_optional_user_id(_request({}), connection) is None


def test_get_optional_user_id_none_for_unknown_token(connection):
    assert get_optional_user_id(_request({"prelegal_session": "bogus"}), connection) is None


def test_get_optional_user_id_resolves_a_real_session(connection):
    user_id = _insert_user(connection)
    token = create_session(connection, user_id)

    assert get_optional_user_id(_request({"prelegal_session": token}), connection) == user_id


def test_require_session_raises_401_without_a_valid_session():
    with pytest.raises(HTTPException) as excinfo:
        require_session(user_id=None)
    assert excinfo.value.status_code == 401


def test_require_session_returns_user_id_when_present():
    assert require_session(user_id=7) == 7


def _request(cookies: dict[str, str]):
    from fastapi import Request

    header_value = "; ".join(f"{key}={value}" for key, value in cookies.items())
    headers = [(b"cookie", header_value.encode())] if cookies else []
    scope = {"type": "http", "headers": headers}
    return Request(scope)
