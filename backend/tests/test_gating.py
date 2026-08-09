import pytest

import app.main as main
from app.main import SESSION_COOKIE


@pytest.fixture
def frontend_dist(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("<html>app</html>")
    (tmp_path / "login.html").write_text("<html>login</html>")
    monkeypatch.setattr(main, "FRONTEND_DIST", tmp_path)
    return tmp_path


def test_root_redirects_to_login_without_session_cookie(client, frontend_dist):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/login"


def test_root_serves_app_with_session_cookie(client, frontend_dist):
    client.cookies.set(SESSION_COOKIE, "1")

    response = client.get("/")

    assert response.status_code == 200
    assert "app" in response.text


def test_login_page_serves_when_no_session(client, frontend_dist):
    response = client.get("/login")

    assert response.status_code == 200
    assert "login" in response.text


def test_login_page_redirects_to_root_when_already_signed_in(client, frontend_dist):
    client.cookies.set(SESSION_COOKIE, "1")

    response = client.get("/login", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/"


def test_index_html_does_not_bypass_the_session_check(client):
    # Regression test: the StaticFiles mount at "/" would otherwise serve
    # this exact filename directly, skipping the cookie check in index().
    response = client.get("/index.html", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/"


def test_login_html_does_not_bypass_the_already_signed_in_check(client):
    response = client.get("/login.html", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/login"
