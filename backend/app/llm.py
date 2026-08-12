"""Calls the LLM (via LiteLLM/OpenRouter/Cerebras) that powers the Mutual
NDA chat. See .claude/skills/cerebras/SKILL.md for the required call shape.
"""

import logging

from litellm import completion

from app.schemas import ChatTurnRequest, ChatTurnResponse, NdaFormValues

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

FIELD_DESCRIPTIONS = """
- purpose: why the parties are sharing confidential information
- effectiveDate: the date the MNDA takes effect (yyyy-mm-dd)
- mndaTermType ("fixed" or "perpetual") + mndaTermYears: how long the MNDA itself lasts
- confidentialityTermType ("fixed" or "perpetual") + confidentialityTermYears: how long confidentiality obligations last
- governingLaw: the state whose laws govern the agreement
- jurisdiction: the courts where disputes will be resolved, e.g. "courts located in New Castle, DE"
- modifications: any changes to the Standard Terms (optional, leave blank if none)
- party1 / party2, each with: printName, title, company, noticeAddress (email or postal address)
""".strip()

SYSTEM_PROMPT_TEMPLATE = """You are helping a user fill in a Mutual Non-Disclosure Agreement (MNDA) \
through conversation. Ask about one missing field at a time, in a friendly, concise way.

The MNDA has these fields:
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
"""


class LlmError(Exception):
    """Raised when the LLM call fails or its output can't be used."""


def _build_system_prompt(current_values: NdaFormValues) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(
        field_descriptions=FIELD_DESCRIPTIONS,
        current_values=current_values.model_dump_json(indent=2),
    )


def generate_nda_reply(payload: ChatTurnRequest) -> ChatTurnResponse:
    messages = [
        {"role": "system", "content": _build_system_prompt(payload.values)},
        *[{"role": message.role, "content": message.content} for message in payload.history],
        {"role": "user", "content": payload.message},
    ]

    try:
        response = completion(
            model=MODEL,
            messages=messages,
            response_format=ChatTurnResponse,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        return ChatTurnResponse.model_validate_json(response.choices[0].message.content)
    except Exception as error:
        logger.exception("NDA chat LLM call failed")
        raise LlmError("The AI assistant is temporarily unavailable.") from error
