"""Loads the repo-root .env file for local `uv run` development.

In Docker, OPENROUTER_API_KEY etc. already arrive as real process env vars
via `docker run --env-file .env` (see scripts/start-*), and the repo-root
.env isn't copied into the image, so load_dotenv() below is a no-op there --
python-dotenv silently skips a missing file and never overrides an env var
that's already set.
"""

from pathlib import Path

from dotenv import load_dotenv

ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


def load_root_env() -> None:
    load_dotenv(ROOT_ENV_FILE)
