from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_session
from app.document_match import generate_match_reply
from app.document_types import get_document_type
from app.llm import LlmError, generate_chat_reply
from app.schemas import ChatTurnRequest, MatchRequest

router = APIRouter(prefix="/api/documents", dependencies=[Depends(require_session)])

UNAVAILABLE_DETAIL = "The AI assistant is temporarily unavailable. Please try again."


@router.post("/match")
def match_turn(payload: MatchRequest) -> dict:
    try:
        return generate_match_reply(payload).model_dump()
    except LlmError:
        raise HTTPException(status_code=502, detail=UNAVAILABLE_DETAIL)


@router.post("/{slug}/chat")
def chat_turn(slug: str, payload: ChatTurnRequest) -> dict:
    spec = get_document_type(slug)
    try:
        return generate_chat_reply(spec, payload)
    except LlmError:
        raise HTTPException(status_code=502, detail=UNAVAILABLE_DETAIL)
