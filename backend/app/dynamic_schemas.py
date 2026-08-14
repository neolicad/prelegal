"""Builds per-document-type Pydantic models from a DocumentTypeSpec.

Previously each document type meant a hand-written FormValues/FieldUpdates
pair of Pydantic classes (see git history's schemas.py before PL-9). Now the
shape is derived from catalog.json's documentTypes entry instead, so adding a
12th document type only means adding a catalog.json entry, not new schema
code.
"""

from functools import lru_cache

from pydantic import BaseModel, create_model

from app.document_types import get_document_type

_PARTY_INFO_FIELDS = {"printName": "", "title": "", "company": "", "noticeAddress": ""}

PartyInfo = create_model("PartyInfo", **{key: (str, default) for key, default in _PARTY_INFO_FIELDS.items()})
PartyInfoUpdates = create_model(
    "PartyInfoUpdates", **{key: (str | None, None) for key in _PARTY_INFO_FIELDS}
)


@lru_cache
def build_form_values_model(slug: str) -> type[BaseModel]:
    """The full set of a document type's fields -- mirrors what the frontend form collects."""
    spec = get_document_type(slug)
    field_defs = {field.key: (str, field.default) for field in spec.fields}
    field_defs.update({party.key: (PartyInfo, PartyInfo()) for party in spec.parties})
    return create_model(f"FormValues_{slug}", **field_defs)


@lru_cache
def build_field_updates_model(slug: str) -> type[BaseModel]:
    """A partial FormValues patch -- every field optional, None means "no update"."""
    spec = get_document_type(slug)
    field_defs = {field.key: (str | None, None) for field in spec.fields}
    field_defs.update({party.key: (PartyInfoUpdates | None, None) for party in spec.parties})
    return create_model(f"FieldUpdates_{slug}", **field_defs)
