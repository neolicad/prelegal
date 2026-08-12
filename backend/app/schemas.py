"""Pydantic models for the Mutual NDA chat endpoint.

Field names are kept in camelCase, matching frontend/lib/nda-form.ts's
NdaFormValues exactly, so JSON travels between frontend and backend with no
alias/casing translation layer.
"""

from typing import Literal

from pydantic import BaseModel

TermType = Literal["fixed", "perpetual"]


class PartyInfo(BaseModel):
    printName: str = ""
    title: str = ""
    company: str = ""
    noticeAddress: str = ""


class NdaFormValues(BaseModel):
    """The full set of Mutual NDA fields, as currently known by the frontend."""

    purpose: str = ""
    effectiveDate: str = ""
    mndaTermType: TermType = "fixed"
    mndaTermYears: str = ""
    confidentialityTermType: TermType = "fixed"
    confidentialityTermYears: str = ""
    governingLaw: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    party1: PartyInfo = PartyInfo()
    party2: PartyInfo = PartyInfo()


class PartyInfoUpdates(BaseModel):
    """Like PartyInfo, but every field is optional -- None means "no update"."""

    printName: str | None = None
    title: str | None = None
    company: str | None = None
    noticeAddress: str | None = None


class NdaFieldUpdates(BaseModel):
    """A partial NdaFormValues patch.

    Every field is optional: the model leaves a field None when the user's
    message gave it nothing new to say, rather than guessing or re-stating
    an already-known value.
    """

    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTermType: TermType | None = None
    mndaTermYears: str | None = None
    confidentialityTermType: TermType | None = None
    confidentialityTermYears: str | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None
    party1: PartyInfoUpdates | None = None
    party2: PartyInfoUpdates | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatTurnRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    values: NdaFormValues


class ChatTurnResponse(BaseModel):
    """Passed directly to litellm as `response_format` -- the model's
    structured output *is* this API's response body, with no reshaping.
    """

    reply: str
    updates: NdaFieldUpdates
