import pytest
from fastapi import HTTPException, Request

from app.auth import SESSION_COOKIE, has_session, require_session


def _request(cookies: dict[str, str]) -> Request:
    # Building a Request by hand is the simplest way to unit-test a plain
    # cookie check without spinning up a full TestClient call.
    header_value = "; ".join(f"{key}={value}" for key, value in cookies.items())
    headers = [(b"cookie", header_value.encode())] if cookies else []
    scope = {"type": "http", "headers": headers}
    return Request(scope)


def test_has_session_false_without_cookie():
    assert has_session(_request({})) is False


def test_has_session_true_with_cookie():
    assert has_session(_request({SESSION_COOKIE: "1"})) is True


def test_require_session_raises_401_without_cookie():
    with pytest.raises(HTTPException) as excinfo:
        require_session(_request({}))
    assert excinfo.value.status_code == 401


def test_require_session_passes_with_cookie():
    require_session(_request({SESSION_COOKIE: "1"}))  # does not raise
