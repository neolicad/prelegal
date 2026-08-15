"""Loads the shared document-type catalog (repo-root catalog.json).

catalog.json's `documentTypes` array is the single source of truth for which
fields and party roles each of the 11 supported document types has. The
frontend reads the same file at build time (see
frontend/lib/document-types.ts) -- both sides parse one shared file instead
of hand-authoring a schema per document type on each side.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel

CATALOG_FILE = Path(__file__).resolve().parents[2] / "catalog.json"

FieldKind = Literal["text", "textarea", "choice"]
Renderer = Literal["nda-coverpage", "generic-keyterms"]


class FieldChoice(BaseModel):
    value: str
    label: str


class FieldSpec(BaseModel):
    key: str
    label: str
    kind: FieldKind = "text"
    helpText: str = ""
    default: str = ""
    choices: list[FieldChoice] = []


class PartyRoleSpec(BaseModel):
    key: str
    label: str


class DocumentTypeSpec(BaseModel):
    slug: str
    name: str
    description: str
    renderer: Renderer
    standardTermsFilename: str
    coverPageFilename: str | None = None
    parties: list[PartyRoleSpec]
    fields: list[FieldSpec]


@lru_cache
def _document_types_by_slug() -> dict[str, DocumentTypeSpec]:
    catalog = json.loads(CATALOG_FILE.read_text())
    specs = [DocumentTypeSpec.model_validate(entry) for entry in catalog["documentTypes"]]
    return {spec.slug: spec for spec in specs}


def list_document_types() -> list[DocumentTypeSpec]:
    return list(_document_types_by_slug().values())


def get_document_type(slug: str) -> DocumentTypeSpec:
    try:
        return _document_types_by_slug()[slug]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {slug}") from None
