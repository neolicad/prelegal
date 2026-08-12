import json
from types import SimpleNamespace

import pytest

from app.llm import LlmError, _build_system_prompt, generate_nda_reply
from app.schemas import ChatTurnRequest, NdaFormValues


def _fake_completion_response(reply: str, updates: dict) -> SimpleNamespace:
    content = json.dumps({"reply": reply, "updates": updates})
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])


def test_build_system_prompt_includes_current_values():
    values = NdaFormValues(purpose="Testing", governingLaw="Delaware")

    prompt = _build_system_prompt(values)

    assert "Testing" in prompt
    assert "Delaware" in prompt


def test_generate_nda_reply_parses_structured_output(monkeypatch):
    fake_response = _fake_completion_response("Sounds good.", {"purpose": "Testing a partnership"})
    # Patched at the import site used by app.llm (the module under test),
    # not litellm itself, per standard unittest.mock guidance.
    monkeypatch.setattr("app.llm.completion", lambda **kwargs: fake_response)

    result = generate_nda_reply(ChatTurnRequest(message="hello", values=NdaFormValues()))

    assert result.reply == "Sounds good."
    assert result.updates.purpose == "Testing a partnership"
    assert result.updates.governingLaw is None


def test_generate_nda_reply_wraps_failures_as_llm_error(monkeypatch):
    def raise_error(**kwargs):
        raise RuntimeError("network exploded")

    monkeypatch.setattr("app.llm.completion", raise_error)

    with pytest.raises(LlmError):
        generate_nda_reply(ChatTurnRequest(message="hello", values=NdaFormValues()))
