from app.document_match import generate_match_reply
from app.fake_ai import FAKE_REPLY
from app.schemas import MatchRequest


def test_generate_match_reply_returns_canned_reply_without_calling_completion_when_use_fake(monkeypatch):
    def fail_if_called(**kwargs):
        raise AssertionError("real LLM was called despite use_fake=True")

    monkeypatch.setattr("app.document_match.completion", fail_if_called)

    result = generate_match_reply(MatchRequest(message="hello", history=[]), use_fake=True)

    assert result.matchedSlug is None
    assert result.reply == FAKE_REPLY
