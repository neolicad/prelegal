"""Calls the LLM (via LiteLLM/OpenRouter/Cerebras) that powers every document
type's chat endpoint. See .claude/skills/cerebras/SKILL.md for the required
call shape.
"""

import json
import logging

from litellm import completion
from pydantic import create_model

from app.document_types import DocumentTypeSpec
from app.dynamic_schemas import build_field_updates_model, build_form_values_model
from app.schemas import ChatTurnRequest

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT_TEMPLATE = """You are helping a user fill in a {document_name} through conversation. \
Ask about one missing field at a time, in a friendly, concise way.

The {document_name} has these fields:
{field_descriptions}

Fields already filled in (as JSON) -- do not ask about these again unless the \
user brings one up to change it:
{current_values}

Rules for your response:
- Extract every field the user's latest message gives clear, unambiguous \
information for, even if it covers several fields at once. Leave a field \
null if the message says nothing new about it -- never guess or invent values.
- Do not restate a field's existing value in `updates` unless the user is changing it.
- Keep `reply` short and conversational.
- If any field is still empty after applying this turn's updates, `reply` MUST \
end by asking about exactly one of the remaining empty fields. Only give a \
plain confirmation with no question if every field already has a value.
"""


class LlmError(Exception):
    """Raised when the LLM call fails or its output can't be used."""


def _apply_updates(current_values: dict, updates: dict) -> dict:
    """Applies a FieldUpdates patch to a FormValues dict, same null-means-no-update
    semantics as frontend/lib/document-chat.ts's mergeDocumentFieldUpdates."""
    merged = dict(current_values)
    for key, value in updates.items():
        if isinstance(value, dict):
            merged[key] = {**merged.get(key, {}), **{k: v for k, v in value.items() if v}}
        elif value:
            merged[key] = value
    return merged


def _first_missing_field_label(spec: DocumentTypeSpec, values: dict) -> str | None:
    for field in spec.fields:
        if not str(values.get(field.key, "")).strip():
            return field.label
    for party in spec.parties:
        party_value = values.get(party.key) or {}
        if not party_value.get("printName", "").strip() or not party_value.get("company", "").strip():
            return f"{party.label}'s name and company"
    return None


def _ensure_follow_up_question(spec: DocumentTypeSpec, current_values: dict, result: dict) -> None:
    """Prompt-only instructions aren't reliably followed by this model (observed:
    it sometimes replies with a bare acknowledgement, e.g. "Got it!", while fields
    remain unset) -- this deterministically appends a question rather than
    trusting the model's compliance."""
    if "?" in result["reply"]:
        return
    missing_label = _first_missing_field_label(spec, _apply_updates(current_values, result["updates"]))
    if missing_label:
        result["reply"] = f"{result['reply']} What's the {missing_label}?"


def _field_descriptions(spec: DocumentTypeSpec) -> str:
    lines = [
        f"- {field.key}: {field.label}" + (f" ({field.helpText})" if field.helpText else "")
        for field in spec.fields
    ]
    lines += [
        f"- {party.key}: {party.label}, with printName, title, company, noticeAddress"
        for party in spec.parties
    ]
    return "\n".join(lines)


def _build_system_prompt(spec: DocumentTypeSpec, current_values: dict) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        document_name=spec.name,
        field_descriptions=_field_descriptions(spec),
        current_values=json.dumps(current_values, indent=2),
    )


def generate_chat_reply(spec: DocumentTypeSpec, payload: ChatTurnRequest) -> dict:
    form_values_model = build_form_values_model(spec.slug)
    field_updates_model = build_field_updates_model(spec.slug)
    chat_turn_response_model = create_model(
        f"ChatTurnResponse_{spec.slug}",
        reply=(str, ...),
        updates=(field_updates_model, ...),
    )

    current_values = form_values_model.model_validate(payload.values)
    messages = [
        {"role": "system", "content": _build_system_prompt(spec, current_values.model_dump())},
        *[{"role": message.role, "content": message.content} for message in payload.history],
        {"role": "user", "content": payload.message},
    ]

    try:
        response = completion(
            model=MODEL,
            messages=messages,
            response_format=chat_turn_response_model,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        result = chat_turn_response_model.model_validate_json(response.choices[0].message.content).model_dump()
        _ensure_follow_up_question(spec, current_values.model_dump(), result)
        return result
    except Exception as error:
        logger.exception("Document chat LLM call failed")
        raise LlmError("The AI assistant is temporarily unavailable.") from error
