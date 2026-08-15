"""Testing-only "fake AI" mode: lets the UI's chat panels be exercised
without spending real LLM calls. Triggered per-request by the frontend
sending FAKE_AI_HEADER (see the toggle in components/FakeAiToggle.tsx) --
not gated behind an environment flag, since this app has no real auth or
production security model yet (PL-7).
"""

FAKE_AI_HEADER = "x-prelegal-fake-ai"

FAKE_REPLY = (
    "Blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, "
    "blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, blah, "
    "blah, blah, blah, blah, blah, blah."
)
