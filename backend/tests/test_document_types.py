import pytest
from fastapi import HTTPException

from app.document_types import get_document_type, list_document_types
from app.dynamic_schemas import build_field_updates_model, build_form_values_model


def test_list_document_types_covers_all_eleven():
    slugs = {spec.slug for spec in list_document_types()}

    assert len(slugs) == 11
    assert "mutual-nda" in slugs


def test_get_document_type_raises_404_for_unknown_slug():
    with pytest.raises(HTTPException) as exc_info:
        get_document_type("does-not-exist")

    assert exc_info.value.status_code == 404


@pytest.mark.parametrize("slug", [spec.slug for spec in list_document_types()])
def test_dynamic_models_cover_every_field_and_party(slug):
    spec = get_document_type(slug)
    form_values = build_form_values_model(slug)()
    field_updates = build_field_updates_model(slug)()

    dumped = form_values.model_dump()
    for field in spec.fields:
        assert field.key in dumped
    for party in spec.parties:
        assert dumped[party.key] == {"printName": "", "title": "", "company": "", "noticeAddress": ""}

    updates_dumped = field_updates.model_dump()
    for field in spec.fields:
        assert updates_dumped[field.key] is None
