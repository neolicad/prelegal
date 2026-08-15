def test_concurrent_signups_all_succeed(client):
    # Regression test for a real bug: FastAPI dispatches a sync dependency
    # generator's startup and teardown as separate threadpool jobs, not
    # guaranteed to run on the same worker thread. sqlite3.connect()'s
    # default same-thread check turned that into a 500 on connection.close()
    # under real concurrency -- see app/db.py's get_connection().
    from concurrent.futures import ThreadPoolExecutor

    def signup(i: int):
        return client.post("/api/auth/signup", json={"email": f"concurrent{i}@example.com", "password": "x"})

    with ThreadPoolExecutor(max_workers=8) as pool:
        responses = list(pool.map(signup, range(8)))

    assert [response.status_code for response in responses] == [200] * 8


def test_signup_creates_a_user_and_signs_them_in(client):
    response = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})

    assert response.status_code == 200
    assert response.json() == {"email": "a@example.com"}
    assert "prelegal_session" in response.cookies


def test_signup_rejects_a_duplicate_email(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})

    response = client.post("/api/auth/signup", json={"email": "a@example.com", "password": "other"})

    assert response.status_code == 409


def test_login_succeeds_with_correct_credentials(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    client.cookies.clear()

    response = client.post("/api/auth/login", json={"email": "a@example.com", "password": "hunter2"})

    assert response.status_code == 200
    assert "prelegal_session" in response.cookies


def test_login_rejects_wrong_password(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    client.cookies.clear()

    response = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong"})

    assert response.status_code == 401


def test_login_rejects_unknown_email(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})

    assert response.status_code == 401


def test_me_returns_the_signed_in_users_email(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"email": "a@example.com"}


def test_me_401s_when_signed_out(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_logout_clears_the_session(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})

    logout_response = client.post("/api/auth/logout")
    me_response = client.get("/api/auth/me")

    assert logout_response.status_code == 200
    assert me_response.status_code == 401
