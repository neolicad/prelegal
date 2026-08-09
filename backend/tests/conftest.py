import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("PRELEGAL_DB_PATH", str(tmp_path / "prelegal.db"))
    with TestClient(app) as test_client:
        yield test_client
