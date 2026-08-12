from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_session
from app.llm import LlmError, generate_nda_reply
from app.schemas import ChatTurnRequest, ChatTurnResponse

router = APIRouter(prefix="/api/nda", dependencies=[Depends(require_session)])


@router.post("/chat", response_model=ChatTurnResponse)
def chat_turn(payload: ChatTurnRequest) -> ChatTurnResponse:
    try:
        return generate_nda_reply(payload)
    except LlmError:
        raise HTTPException(
            status_code=502, detail="The AI assistant is temporarily unavailable. Please try again."
        )
