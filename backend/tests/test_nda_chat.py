from app.auth import SESSION_COOKIE
from app.llm import LlmError
from app.schemas import ChatTurnResponse, NdaFieldUpdates

VALID_PAYLOAD = {
    "message": "Our purpose is evaluating a partnership.",
    "history": [],
    "values": {
        "purpose": "",
        "effectiveDate": "",
        "mndaTermType": "fixed",
        "mndaTermYears": "1",
        "confidentialityTermType": "fixed",
        "confidentialityTermYears": "1",
        "governingLaw": "",
        "jurisdiction": "",
        "modifications": "",
        "party1": {"printName": "", "title": "", "company": "", "noticeAddress": ""},
        "party2": {"printName": "", "title": "", "company": "", "noticeAddress": ""},
    },
}


def test_chat_requires_session_cookie(client):
    response = client.post("/api/nda/chat", json=VALID_PAYLOAD)

    assert response.status_code == 401


def test_chat_returns_reply_and_updates(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")
    fake_response = ChatTurnResponse(
        reply="Got it — what's the effective date?",
        updates=NdaFieldUpdates(purpose="Evaluating a potential partnership."),
    )
    # Patched at the import site used by the router, not at app.llm, per
    # standard unittest.mock guidance.
    monkeypatch.setattr("app.routers.nda_chat.generate_nda_reply", lambda payload: fake_response)

    response = client.post("/api/nda/chat", json=VALID_PAYLOAD)

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Got it — what's the effective date?"
    assert body["updates"]["purpose"] == "Evaluating a potential partnership."
    assert body["updates"]["governingLaw"] is None


def test_chat_returns_502_when_llm_call_fails(client, monkeypatch):
    client.cookies.set(SESSION_COOKIE, "1")

    def raise_llm_error(payload):
        raise LlmError("boom")

    monkeypatch.setattr("app.routers.nda_chat.generate_nda_reply", raise_llm_error)

    response = client.post("/api/nda/chat", json=VALID_PAYLOAD)

    assert response.status_code == 502


def test_chat_returns_422_on_malformed_body(client):
    client.cookies.set(SESSION_COOKIE, "1")

    response = client.post("/api/nda/chat", json={"message": "hi"})

    assert response.status_code == 422
