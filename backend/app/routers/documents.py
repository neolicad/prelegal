"""Saved-document history: create on download, list, and fetch one to resume editing.

Each save is a new row (a user can have several saved documents of the same
type, e.g. multiple NDAs for different counterparties) rather than one slot
per type that gets overwritten.
"""

import json
import sqlite3

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_session
from app.db import get_db
from app.document_types import get_document_type
from app.schemas import SaveDocumentRequest

router = APIRouter(prefix="/api/documents")


def _title_for(slug: str, values: dict) -> str:
    spec = get_document_type(slug)
    company_names = []
    for party in spec.parties:
        party_value = values.get(party.key)
        company = party_value.get("company") if isinstance(party_value, dict) else None
        if company:
            company_names.append(company)
    if company_names:
        return f"{' & '.join(company_names)} — {spec.name}"
    return f"Untitled {spec.name}"


def _row_to_summary(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "slug": row["slug"], "title": row["title"], "createdAt": row["created_at"]}


@router.post("")
def save_document(
    payload: SaveDocumentRequest,
    user_id: int = Depends(require_session),
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    get_document_type(payload.slug)  # 404s on an unknown slug
    title = _title_for(payload.slug, payload.values)
    cursor = connection.execute(
        "INSERT INTO documents (user_id, slug, title, values_json) VALUES (?, ?, ?, ?)",
        (user_id, payload.slug, title, json.dumps(payload.values)),
    )
    connection.commit()
    row = connection.execute("SELECT * FROM documents WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _row_to_summary(row)


@router.get("")
def list_documents(
    user_id: int = Depends(require_session), connection: sqlite3.Connection = Depends(get_db)
) -> list[dict]:
    rows = connection.execute(
        "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC, id DESC", (user_id,)
    ).fetchall()
    return [_row_to_summary(row) for row in rows]


@router.get("/{document_id}")
def get_document(
    document_id: int,
    user_id: int = Depends(require_session),
    connection: sqlite3.Connection = Depends(get_db),
) -> dict:
    row = connection.execute(
        "SELECT * FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return {**_row_to_summary(row), "values": json.loads(row["values_json"])}
