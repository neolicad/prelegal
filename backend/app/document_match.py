"""Calls the LLM to map a user's free-text description of what they need to
one of the 11 supported document types in catalog.json, or to explain that
nothing fits and suggest the closest one instead (PL-9).
"""

import logging

from litellm import completion
from pydantic import BaseModel

from app.document_types import list_document_types
from app.fake_ai import FAKE_REPLY
from app.llm import EXTRA_BODY, MODEL, LlmError
from app.schemas import MatchRequest

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_TEMPLATE = """You help users figure out which legal document they need. \
Only these document types are supported -- never suggest or invent anything outside this list:
{catalog}

Rules for your response:
- If the user's message clearly matches one of the document types, set `matchedSlug` \
to its slug and make `reply` a brief, friendly confirmation of the match.
- If the user hasn't said enough yet to tell which type they need, leave `matchedSlug` \
null and make `reply` a clarifying question.
- If the user describes a document none of these types can produce, leave `matchedSlug` \
null, explain in `reply` that it isn't supported, and suggest the closest available \
document type instead.
"""


class MatchResponse(BaseModel):
    matchedSlug: str | None = None
    reply: str


def _catalog_description() -> str:
    return "\n".join(f"- {spec.slug}: {spec.name} -- {spec.description}" for spec in list_document_types())


def generate_match_reply(payload: MatchRequest, use_fake: bool = False) -> MatchResponse:
    if use_fake:
        return MatchResponse(matchedSlug=None, reply=FAKE_REPLY)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_TEMPLATE.format(catalog=_catalog_description())},
        *[{"role": message.role, "content": message.content} for message in payload.history],
        {"role": "user", "content": payload.message},
    ]

    try:
        response = completion(
            model=MODEL,
            messages=messages,
            response_format=MatchResponse,
            reasoning_effort="low",
            extra_body=EXTRA_BODY,
        )
        result = MatchResponse.model_validate_json(response.choices[0].message.content)
    except Exception as error:
        logger.exception("Document match LLM call failed")
        raise LlmError("The AI assistant is temporarily unavailable.") from error

    known_slugs = {spec.slug for spec in list_document_types()}
    if result.matchedSlug not in known_slugs:
        result.matchedSlug = None
    return result
