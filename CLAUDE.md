# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers all 11 document types, each fillable via AI chat or a plain form, with real signup/login and per-user document history. See "Implementation details" below for what's supported and where things live.

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

## Frontend version badge

A small badge fixed in the top-right corner of every page shows the current frontend build's version, so it's obvious at a glance whether the browser is running stale cached content vs. the latest code (see the PL-9 browser-caching incident). The version lives in `frontend/lib/version.ts` (`APP_VERSION`).

**Every code change (frontend or backend) must bump `APP_VERSION` as part of the same change**, using a short, descriptive, dot-prefixed slug naming what changed rather than a number -- e.g. `v.scrolltobottom`, `v.faketoggle`, `v.addversion` -- so the badge itself tells you which change is live without needing to cross-reference a changelog.

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation details

### Supported features

- All 11 Common Paper document types (`catalog.json`), each fillable via AI chat or a plain form, rendered live and downloadable as a PDF.
- An AI chat assistant (Cerebras via OpenRouter/LiteLLM, Structured Outputs) that extracts field values from free text and always ends its reply with a follow-up question for whatever's still missing.
- A separate "which document do you need" matcher chat on the catalog picker, for a user unsure which of the 11 types applies -- or an explanation of why none fit, with the closest suggested instead.
- Real signup/login/logout (bcrypt-hashed passwords, server-issued session tokens) gating every page.
- Per-user document history ("My Documents"): downloading a document saves it; a user can hold several drafts of the same type (e.g. multiple NDAs for different counterparties); opening a saved one resumes editing it.
- A "draft only, not reviewed by an attorney" disclaimer baked into every rendered document (so it survives into the downloaded PDF), plus a shorter reminder next to the Download button.
- A "Fake AI (testing)" toggle, fixed bottom-right on every page, that swaps every chat/match call for a canned reply so the UI can be exercised without spending real LLM calls.
- A version badge, fixed top-right on every page, naming the current frontend build -- catches stale cached content.
- SQLite storage (users, sessions, documents) recreated from scratch on every startup -- no data persists across container restarts.

### Project structure

Root:
- `catalog.json` -- single source of truth for the 11 document types (fields, party roles, template filename(s), rendering strategy). Both the frontend (at Next.js build time) and the backend (at runtime) parse this one file independently rather than hand-authoring a schema per type on each side.
- `templates/` -- the legal template markdown files (each type's Standard Terms, plus the Mutual NDA's Cover Page) that `catalog.json` points to.
- `Dockerfile` -- packages the whole app: builds the frontend as a static export, then serves it from FastAPI.
- `scripts/` -- start/stop scripts for mac/linux/windows.

Backend (`backend/`, FastAPI, uv-managed):
- `app/main.py` -- session-gated page routes (`/`, `/login`, `/signup`, `/my-documents`, `/documents/{slug}`) and the `StaticFiles` mount serving the frontend's static export.
- `app/auth.py` + `routers/auth.py` -- session tokens (`sessions` table), bcrypt password hashing, signup/login/logout/me.
- `app/db.py` -- SQLite connection/schema setup (`users`, `sessions`, `documents` tables; recreated from scratch in `init_db()` on every startup).
- `app/document_types.py` -- loads/validates `catalog.json` into `DocumentTypeSpec` models.
- `app/dynamic_schemas.py` -- builds each document type's Pydantic `FormValues`/`FieldUpdates` models on the fly (`pydantic.create_model`, cached per slug), so there's one dynamic schema builder instead of 11 hand-written ones.
- `app/llm.py` + `app/document_match.py` -- the two LLM call sites (field-filling chat, and the type-matching chat), both via LiteLLM -> OpenRouter -> Cerebras (see `.claude/skills/cerebras`).
- `app/routers/document_chat.py` -- `POST /api/documents/{slug}/chat` and `POST /api/documents/match`.
- `app/routers/documents.py` -- `POST`/`GET /api/documents`, `GET /api/documents/{id}` (save/list/resume a user's saved documents).
- `app/fake_ai.py` -- the canned reply used when the frontend's testing toggle is on.
- `tests/` -- pytest, roughly one file per module/router, using a `tmp_path`-backed SQLite db per test (see `conftest.py`).

Frontend (`frontend/`, Next.js App Router, statically exported and served by the backend):
- `app/(app)/` -- route group for every authenticated page (`/`, `/documents/[slug]`, `/my-documents`), wrapped in a persistent `AppHeader`; `app/login/` and `app/signup/` stay outside it.
- `components/DocumentApp.tsx` -- the document workspace: owns form state, wires the chat panel/form/preview together, handles PDF download + save-to-history.
- `components/DocumentForm.tsx` -- the generic "Key Terms" form, driven entirely by a document type's field/party schema; scrolls independently and can be told to scroll/center a given field.
- `components/DocumentChatPanel.tsx` / `DocumentPicker.tsx` -- the two chat surfaces (field-filling chat, and the catalog-matching chat).
- `components/AuthForm.tsx` -- shared shape behind `LoginForm`/`SignupForm`.
- `components/AppHeader.tsx` / `MyDocuments.tsx` -- the nav shell and the saved-documents list.
- `lib/document-types.ts` -- mirrors the backend's catalog parsing (read at Next.js build time).
- `lib/render-document.ts` -- turns a document type's template(s) + field values into the rendered/downloadable markdown (`nda-coverpage` vs `generic-keyterms` rendering strategies).
- `lib/api.ts` -- the fetch client for every backend endpoint.
- `lib/document-chat.ts`, `lib/document-form.ts` -- shared types and merge logic for chat updates and form values.
- `e2e/` -- Playwright specs, run against a real production build and a real backend (LLM calls mocked at the network boundary).
