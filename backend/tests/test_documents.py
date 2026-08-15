import pytest


@pytest.fixture
def signed_in_client(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    return client


NDA_VALUES = {
    "party1": {"printName": "", "title": "", "company": "Acme Inc.", "noticeAddress": ""},
    "party2": {"printName": "", "title": "", "company": "Foo Corp", "noticeAddress": ""},
}


def test_save_document_requires_a_session(client):
    response = client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})

    assert response.status_code == 401


def test_save_document_returns_a_derived_title(signed_in_client):
    response = signed_in_client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})

    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "mutual-nda"
    assert "Acme Inc." in body["title"]
    assert "Foo Corp" in body["title"]


def test_save_document_404s_for_an_unknown_slug(signed_in_client):
    response = signed_in_client.post("/api/documents", json={"slug": "not-a-real-type", "values": {}})

    assert response.status_code == 404


def test_list_documents_returns_only_the_current_users_documents(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})
    client.post("/api/auth/logout")

    client.post("/api/auth/signup", json={"email": "b@example.com", "password": "hunter2"})
    response = client.get("/api/documents")

    assert response.status_code == 200
    assert response.json() == []


def test_list_documents_orders_newest_first(signed_in_client):
    signed_in_client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})
    signed_in_client.post("/api/documents", json={"slug": "csa", "values": {}})

    response = signed_in_client.get("/api/documents")

    assert response.status_code == 200
    slugs = [doc["slug"] for doc in response.json()]
    assert slugs == ["csa", "mutual-nda"]


def test_get_document_returns_the_saved_values(signed_in_client):
    save_response = signed_in_client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})
    document_id = save_response.json()["id"]

    response = signed_in_client.get(f"/api/documents/{document_id}")

    assert response.status_code == 200
    assert response.json()["values"] == NDA_VALUES


def test_get_document_404s_for_another_users_document(client):
    client.post("/api/auth/signup", json={"email": "a@example.com", "password": "hunter2"})
    save_response = client.post("/api/documents", json={"slug": "mutual-nda", "values": NDA_VALUES})
    document_id = save_response.json()["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/signup", json={"email": "b@example.com", "password": "hunter2"})
    response = client.get(f"/api/documents/{document_id}")

    assert response.status_code == 404


def test_get_document_404s_for_a_nonexistent_id(signed_in_client):
    response = signed_in_client.get("/api/documents/999")

    assert response.status_code == 404
