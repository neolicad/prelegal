import pytest

from app.auth import SESSION_COOKIE
from app.document_match import MatchResponse
from app.fake_ai import FAKE_AI_HEADER, FAKE_REPLY
from app.llm import LlmError

VALID_PAYLOAD = {"message": "Our purpose is evaluating a partnership.", "history": [], "values": {}}


@pytest.mark.parametrize("slug", ["mutual-nda", "csa"])
def test_chat_requires_session_cookie(client, slug):
    response = client.post(f"/api/documents/{slug}/chat", json=VALID_PAYLOAD)

    assert response.status_code == 401


def test_chat_returns_404_for_unknown_document_type(client):
    client.cookies.set(SESSION_COOKIE, "1")

    response = client.post("/api/documents/does-not-exist/chat", json=VALID_PAYLOAD)

    assert response.status_code == 404


@pytest.mark.parametrize("slug", ["mutual-nda", "csa"])
def test_chat_returns_reply_and_updates(client, monkeypatch, slug):
    client.cookies.set(SESSION_COOKIE, "1")
    fake_reply = {"reply": "Got it -- what's next?", "updates": {}}
    # Patched at the import site used by the router, not app.llm, per
    # standard unittest.mock guidance.
    monkeypatch.setattr(
        "app.routers.document_chat.generate_chat_reply", lambda spec, payload, use_fake=False: fake_reply
    )

    response = client.post(f"/api/documents/{slug}/chat", json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert response.json() == fake_reply


def test_chat_returns_502_when_llm_call_fails(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")

    def raise_llm_error(spec, payload, use_fake=False):
        raise LlmError("boom")

    monkeypatch.setattr("app.routers.document_chat.generate_chat_reply", raise_llm_error)

    response = client.post("/api/documents/mutual-nda/chat", json=VALID_PAYLOAD)

    assert response.status_code == 502


def test_chat_returns_422_on_malformed_body(client):
    client.cookies.set(SESSION_COOKIE, "1")

    response = client.post("/api/documents/mutual-nda/chat", json={"message": None})

    assert response.status_code == 422


def test_match_requires_session_cookie(client):
    response = client.post("/api/documents/match", json={"message": "I need something", "history": []})

    assert response.status_code == 401


def test_match_returns_matched_slug(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")
    fake_reply = MatchResponse(matchedSlug="csa", reply="Sounds like a Cloud Service Agreement.")
    monkeypatch.setattr(
        "app.routers.document_chat.generate_match_reply", lambda payload, use_fake=False: fake_reply
    )

    response = client.post("/api/documents/match", json={"message": "I sell SaaS", "history": []})

    assert response.status_code == 200
    assert response.json() == fake_reply.model_dump()


def test_match_returns_502_when_llm_call_fails(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")

    def raise_llm_error(payload, use_fake=False):
        raise LlmError("boom")

    monkeypatch.setattr("app.routers.document_chat.generate_match_reply", raise_llm_error)

    response = client.post("/api/documents/match", json={"message": "hi", "history": []})

    assert response.status_code == 502


def test_chat_returns_fake_reply_without_calling_the_real_llm_when_fake_ai_header_is_set(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")

    def fake_generate_chat_reply(spec, payload, use_fake=False):
        assert use_fake, "real LLM path was called"
        return {"reply": FAKE_REPLY, "updates": {}}

    monkeypatch.setattr("app.routers.document_chat.generate_chat_reply", fake_generate_chat_reply)

    response = client.post(
        "/api/documents/mutual-nda/chat", json=VALID_PAYLOAD, headers={FAKE_AI_HEADER: "1"}
    )

    assert response.status_code == 200
    assert response.json() == {"reply": FAKE_REPLY, "updates": {}}


def test_match_returns_fake_reply_when_fake_ai_header_is_set(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")

    def fake_generate_match_reply(payload, use_fake=False):
        assert use_fake, "real LLM path was called"
        return MatchResponse(matchedSlug=None, reply=FAKE_REPLY)

    monkeypatch.setattr("app.routers.document_chat.generate_match_reply", fake_generate_match_reply)

    response = client.post(
        "/api/documents/match", json={"message": "hi", "history": []}, headers={FAKE_AI_HEADER: "1"}
    )

    assert response.status_code == 200
    assert response.json() == {"matchedSlug": None, "reply": FAKE_REPLY}
