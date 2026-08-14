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
        result = chat_turn_response_model.model_validate_json(response.choices[0].message.content)
        return result.model_dump()
    except Exception as error:
        logger.exception("Document chat LLM call failed")
        raise LlmError("The AI assistant is temporarily unavailable.") from error
