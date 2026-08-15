"""Pydantic models shared by the document chat endpoints.

`values`/`updates` are typed loosely here (plain dicts) because their exact
shape depends on which document type's fields and parties are involved --
see app/dynamic_schemas.py, which builds the real per-document-type model
used to validate and interpret them once a request handler knows the slug.
"""

from typing import Any, Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatTurnRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    values: dict[str, Any] = {}


class MatchRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
