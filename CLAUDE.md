# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers all 11 document types, each fillable via AI chat or a plain form, with a fake login screen (no real authentication) and no document persistence. See "Implementation status" below for details.

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

## Implementation status (as of 2026-08-14)

- **PL-5** (done): legal template dataset — `templates/` + `catalog.json`.
- **PL-6** (done): Mutual NDA creator prototype — a form-based (not AI chat) Next.js app in `frontend/` that fills in the Mutual NDA templates live and downloads a PDF. No backend involved at this point.
- **PL-7** (done): V1 technical foundation per the Technical design above. Added `backend/` (FastAPI, uv-managed), a Dockerfile packaging the whole app, `scripts/start-*`/`stop-*` for mac/linux/windows, and a SQLite `users` table recreated from scratch on every startup (schema only, not wired to anything yet). The frontend now builds as a static export served by FastAPI on port 8000, gated behind a **fake** login screen: any credentials are accepted, there's no real session or password checking, just a client-set cookie the backend checks before serving the app.
- **PL-8** (done, superseded by PL-9's generalization below): AI chat for the Mutual NDA, still Mutual NDA only at the time.
- **PL-9** (done): expanded from Mutual NDA only to all 11 catalog document types, via a data-driven engine rather than 11 hand-duplicated copies of PL-8's NDA-specific code. `catalog.json`'s `documentTypes` array is the single source of truth for each type's fields, party roles, template filename(s), and rendering strategy — both the frontend (at Next.js build time) and backend (at runtime) parse this one file independently rather than hand-authoring a schema per type on each side.
  - Backend: `backend/app/document_types.py` loads/validates the catalog; `backend/app/dynamic_schemas.py` builds each type's Pydantic `FormValues`/`FieldUpdates` models on the fly (`pydantic.create_model`, cached per slug) in place of PL-8's hand-written `NdaFormValues`/`NdaFieldUpdates`. `backend/app/llm.py` is now generic, building the field-description prompt from a type's spec instead of a hardcoded NDA string. One router, `backend/app/routers/document_chat.py`, serves `POST /api/documents/{slug}/chat` (404s an unknown slug) and `POST /api/documents/match` — a chat endpoint (`backend/app/document_match.py`) that maps a free-text description of what the user needs to the closest supported type, or explains why nothing fits, per the ticket's requirement to engage with users asking for unsupported documents.
  - Frontend: `frontend/app/page.tsx` is now a catalog picker (links to all 11 types, plus the same match chat) rather than a hardcoded NDA home page; `frontend/app/documents/[slug]/page.tsx` (`generateStaticParams` over all 11 slugs) replaced the NDA-only home. One generic `DocumentApp`/`DocumentForm`/`DocumentChatPanel` component set (driven by a type's spec) replaced the hand-crafted `NdaApp`/`NdaForm`/`NdaChatPanel`. Only Mutual NDA has a real fillable Cover Page template in this repo, so `frontend/lib/render-document.ts` keeps its bespoke, higher-fidelity rendering (`renderer: "nda-coverpage"` in the catalog) for that one type; the other 10 get an auto-generated "Key Terms" block built generically from the type's field/party schema (`renderer: "generic-keyterms"`), with the Standard Terms' Variable spans bold-resolved the same way NDA's already were.
  - Fix: the chat system prompt (used by every document type) now explicitly requires ending the reply with a follow-up question whenever any field is still unset after the turn's updates are applied, rather than relying on unenforced phrasing — verified against the real Cerebras-backed model, not just mocked tests.
  - Two bugs found and fixed during testing: (1) the Dockerfile never copied `catalog.json` into either build stage, so the new build-time/runtime reads of it would have failed entirely in the packaged container; (2) the new `/documents/{slug}` pages weren't reachable at all (Next.js exports each as `documents/<slug>.html` alongside a same-named, `index.html`-less prefetch-data directory that shadows it under FastAPI's `StaticFiles`) and, unlike `/` and `/login`, weren't behind the cookie gate — fixed with an explicit, session-checked route in `backend/app/main.py` mirroring the existing `/`/`/login` pattern.

Not yet built: real authentication/sign-up and document persistence.

## TODO / known issues

- **Fake-AI toggle not visible to user (2026-08-14, branch `feature/PL-9-all-document-types`, PR #7).** Added a "Fake AI (testing)" checkbox (`frontend/components/FakeAiToggle.tsx`, fixed bottom-right corner on every page via `app/layout.tsx`; state in `frontend/lib/fake-ai.ts`; backend short-circuit via `x-prelegal-fake-ai` header in `backend/app/fake_ai.py`) so the chat UI can be tested without spending real LLM calls. I verified it end-to-end (checkbox → localStorage → header → backend canned reply → rendered in chat) via a fresh `--no-cache` Docker build, both direct JS interaction and real Playwright clicks — but the user reports **not seeing the toggle at all** in their own browser testing. Not yet reconciled. Things to check next session, roughly in order:
  1. Rule out stale cache again (same root cause as the earlier scroll-bug false-negative) — confirm the user is on a fresh build of the latest commit on this branch, hard-refreshed / incognito.
  2. Confirm `FakeAiToggle` is actually present in what's served: check the built `frontend/out/**/*.html` for the "Fake AI (testing)" text, and check the browser's rendered DOM directly (not just visually) for the checkbox element.
  3. If present in the DOM but not visually visible, suspect a CSS stacking/positioning issue specific to the user's actual viewport size or a real browser (not the sandboxed Chrome used for verification here) — the toggle is `position: fixed; bottom-4 right-4 z-50`; check for anything else on top of it (`z-50` may be insufficient) or a viewport where it renders off-screen.
  4. If missing entirely from the DOM, suspect a hydration/mount failure specific to `useSyncExternalStore` in this component, or that `<FakeAiToggle />` isn't actually reaching the rendered tree for the page they're on.