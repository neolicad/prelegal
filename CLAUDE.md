# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers 1 of the 11 document types (Mutual NDA), filled in via a plain form rather than AI chat, with a fake login screen (no real authentication) and no document persistence. See "Implementation status" below for details.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation status (as of 2026-08-10)

- **PL-5** (done): legal template dataset — `templates/` + `catalog.json`.
- **PL-6** (done): Mutual NDA creator prototype — a form-based (not AI chat) Next.js app in `frontend/` that fills in the Mutual NDA templates live and downloads a PDF. No backend involved at this point.
- **PL-7** (done): V1 technical foundation per the Technical design above. Added `backend/` (FastAPI, uv-managed), a Dockerfile packaging the whole app, `scripts/start-*`/`stop-*` for mac/linux/windows, and a SQLite `users` table recreated from scratch on every startup (schema only, not wired to anything yet). The frontend now builds as a static export served by FastAPI on port 8000, gated behind a **fake** login screen: any credentials are accepted, there's no real session or password checking, just a client-set cookie the backend checks before serving the app.
- **PL-8** (done): AI chat for the Mutual NDA, still Mutual NDA only. `frontend/components/NdaChatPanel.tsx` sits alongside the existing form and shares its `NdaFormValues` state — chat and manual form edits fill in the same live preview interchangeably. Each turn posts to `POST /api/nda/chat` (`backend/app/routers/nda_chat.py`, cookie-gated), which calls `openrouter/openai/gpt-oss-120b` via Cerebras/LiteLLM (`backend/app/llm.py`, per the Cerebras skill) with Structured Outputs, returning a reply plus a partial field-updates object that's merged into the shared state without ever overwriting fields the AI wasn't confident about.

Not yet built: the other 10 document types, real authentication/sign-up, and document persistence.