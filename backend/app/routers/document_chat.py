from fastapi import APIRouter, Depends, Header, HTTPException

from app.auth import require_session
from app.document_match import generate_match_reply
from app.document_types import get_document_type
from app.fake_ai import FAKE_AI_HEADER
from app.llm import LlmError, generate_chat_reply
from app.schemas import ChatTurnRequest, MatchRequest

router = APIRouter(prefix="/api/documents", dependencies=[Depends(require_session)])

UNAVAILABLE_DETAIL = "The AI assistant is temporarily unavailable. Please try again."


def _use_fake(fake_ai_header: str | None) -> bool:
    return fake_ai_header == "1"


@router.post("/match")
def match_turn(payload: MatchRequest, x_fake_ai: str | None = Header(default=None, alias=FAKE_AI_HEADER)) -> dict:
    try:
        return generate_match_reply(payload, use_fake=_use_fake(x_fake_ai)).model_dump()
    except LlmError:
        raise HTTPException(status_code=502, detail=UNAVAILABLE_DETAIL)


@router.post("/{slug}/chat")
def chat_turn(
    slug: str, payload: ChatTurnRequest, x_fake_ai: str | None = Header(default=None, alias=FAKE_AI_HEADER)
) -> dict:
    spec = get_document_type(slug)
    try:
        return generate_chat_reply(spec, payload, use_fake=_use_fake(x_fake_ai))
    except LlmError:
        raise HTTPException(status_code=502, detail=UNAVAILABLE_DETAIL)
