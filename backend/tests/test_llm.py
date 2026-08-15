import json
from types import SimpleNamespace

import pytest

from app.document_types import get_document_type
from app.llm import LlmError, _build_system_prompt, generate_chat_reply
from app.schemas import ChatTurnRequest


def _fake_completion_response(reply: str, updates: dict) -> SimpleNamespace:
    content = json.dumps({"reply": reply, "updates": updates})
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


@pytest.mark.parametrize("slug", ["mutual-nda", "csa"])
def test_build_system_prompt_includes_current_values_and_field_names(slug):
    spec = get_document_type(slug)

    prompt = _build_system_prompt(spec, {"someField": "Testing value"})

    assert "Testing value" in prompt
    assert spec.fields[0].key in prompt


def test_build_system_prompt_requires_a_follow_up_question_when_fields_are_missing():
    spec = get_document_type("mutual-nda")

    prompt = _build_system_prompt(spec, {})

    assert "must end by asking about exactly one of the remaining empty fields" in prompt.lower()


@pytest.mark.parametrize("slug", ["mutual-nda", "csa"])
def test_generate_chat_reply_parses_structured_output(monkeypatch, slug):
    spec = get_document_type(slug)
    field_key = spec.fields[0].key
    fake_response = _fake_completion_response("Sounds good.", {field_key: "A new value"})
    # Patched at the import site used by app.llm (the module under test),
    # not litellm itself, per standard unittest.mock guidance.
    monkeypatch.setattr("app.llm.completion", lambda **kwargs: fake_response)

    result = generate_chat_reply(spec, ChatTurnRequest(message="hello", values={}))

    assert result["reply"].startswith("Sounds good.")
    assert result["updates"][field_key] == "A new value"


def test_generate_chat_reply_wraps_failures_as_llm_error(monkeypatch):
    spec = get_document_type("mutual-nda")

    def raise_error(**kwargs):
        raise RuntimeError("network exploded")

    monkeypatch.setattr("app.llm.completion", raise_error)

    with pytest.raises(LlmError):
        generate_chat_reply(spec, ChatTurnRequest(message="hello", values={}))


class TestEnsureFollowUpQuestion:
    """Regression coverage for a real bug: the model sometimes ignores the
    system prompt's instruction and replies with a bare acknowledgement (e.g.
    "Got it!") while fields remain unset. generate_chat_reply must not rely
    on prompt compliance alone to guarantee a follow-up question."""

    def test_appends_a_question_when_the_model_gives_a_bare_acknowledgement(self, monkeypatch):
        spec = get_document_type("design-partner-agreement")
        fake_response = _fake_completion_response("Got it!", {"fees": "$100"})
        monkeypatch.setattr("app.llm.completion", lambda **kwargs: fake_response)

        result = generate_chat_reply(
            spec, ChatTurnRequest(message="$100", values={"program": "Flight checking", "term": "1 year"})
        )

        assert result["reply"].startswith("Got it!")
        assert "?" in result["reply"]

    def test_does_not_duplicate_a_question_the_model_already_asked(self, monkeypatch):
        spec = get_document_type("design-partner-agreement")
        fake_response = _fake_completion_response("Got it! What's the Term?", {"fees": "$100"})
        monkeypatch.setattr("app.llm.completion", lambda **kwargs: fake_response)

        result = generate_chat_reply(
            spec, ChatTurnRequest(message="$100", values={"program": "Flight checking"})
        )

        assert result["reply"] == "Got it! What's the Term?"

    def test_does_not_append_a_question_once_every_field_is_filled(self, monkeypatch):
        spec = get_document_type("design-partner-agreement")
        complete_values = {
            "program": "Flight checking",
            "term": "1 year",
            "fees": "$100",
            "effectiveDate": "2026-01-01",
            "governingLaw": "Delaware",
            "chosenCourts": "courts located in New Castle, DE",
            "provider": {"printName": "Alice", "title": "CEO", "company": "Acme", "noticeAddress": "a@acme.com"},
            "partner": {"printName": "Bob", "title": "COO", "company": "Globex", "noticeAddress": "b@globex.com"},
        }
        fake_response = _fake_completion_response("All set, thanks!", {})
        monkeypatch.setattr("app.llm.completion", lambda **kwargs: fake_response)

        result = generate_chat_reply(spec, ChatTurnRequest(message="that's everything", values=complete_values))

        assert result["reply"] == "All set, thanks!"
