# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation covers all 11 document types, each fillable via AI chat or a plain form, with real signup/login and per-user document history. See "Implementation status" below for details.

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

## Implementation status (as of 2026-08-15)

- **PL-5** (done): legal template dataset — `templates/` + `catalog.json`.
- **PL-6** (done): Mutual NDA creator prototype — a form-based (not AI chat) Next.js app in `frontend/` that fills in the Mutual NDA templates live and downloads a PDF. No backend involved at this point.
- **PL-7** (done): V1 technical foundation per the Technical design above. Added `backend/` (FastAPI, uv-managed), a Dockerfile packaging the whole app, `scripts/start-*`/`stop-*` for mac/linux/windows, and a SQLite `users` table recreated from scratch on every startup (schema only, not wired to anything yet). The frontend now builds as a static export served by FastAPI on port 8000, gated behind a **fake** login screen: any credentials are accepted, there's no real session or password checking, just a client-set cookie the backend checks before serving the app.
- **PL-8** (done, superseded by PL-9's generalization below): AI chat for the Mutual NDA, still Mutual NDA only at the time.
- **PL-9** (done): expanded from Mutual NDA only to all 11 catalog document types, via a data-driven engine rather than 11 hand-duplicated copies of PL-8's NDA-specific code. `catalog.json`'s `documentTypes` array is the single source of truth for each type's fields, party roles, template filename(s), and rendering strategy — both the frontend (at Next.js build time) and backend (at runtime) parse this one file independently rather than hand-authoring a schema per type on each side.
  - Backend: `backend/app/document_types.py` loads/validates the catalog; `backend/app/dynamic_schemas.py` builds each type's Pydantic `FormValues`/`FieldUpdates` models on the fly (`pydantic.create_model`, cached per slug) in place of PL-8's hand-written `NdaFormValues`/`NdaFieldUpdates`. `backend/app/llm.py` is now generic, building the field-description prompt from a type's spec instead of a hardcoded NDA string. One router, `backend/app/routers/document_chat.py`, serves `POST /api/documents/{slug}/chat` (404s an unknown slug) and `POST /api/documents/match` — a chat endpoint (`backend/app/document_match.py`) that maps a free-text description of what the user needs to the closest supported type, or explains why nothing fits, per the ticket's requirement to engage with users asking for unsupported documents.
  - Frontend: `frontend/app/page.tsx` is now a catalog picker (links to all 11 types, plus the same match chat) rather than a hardcoded NDA home page; `frontend/app/documents/[slug]/page.tsx` (`generateStaticParams` over all 11 slugs) replaced the NDA-only home. One generic `DocumentApp`/`DocumentForm`/`DocumentChatPanel` component set (driven by a type's spec) replaced the hand-crafted `NdaApp`/`NdaForm`/`NdaChatPanel`. Only Mutual NDA has a real fillable Cover Page template in this repo, so `frontend/lib/render-document.ts` keeps its bespoke, higher-fidelity rendering (`renderer: "nda-coverpage"` in the catalog) for that one type; the other 10 get an auto-generated "Key Terms" block built generically from the type's field/party schema (`renderer: "generic-keyterms"`), with the Standard Terms' Variable spans bold-resolved the same way NDA's already were.
  - Fix: the chat system prompt (used by every document type) now explicitly requires ending the reply with a follow-up question whenever any field is still unset after the turn's updates are applied, rather than relying on unenforced phrasing — verified against the real Cerebras-backed model, not just mocked tests.
  - Two bugs found and fixed during testing: (1) the Dockerfile never copied `catalog.json` into either build stage, so the new build-time/runtime reads of it would have failed entirely in the packaged container; (2) the new `/documents/{slug}` pages weren't reachable at all (Next.js exports each as `documents/<slug>.html` alongside a same-named, `index.html`-less prefetch-data directory that shadows it under FastAPI's `StaticFiles`) and, unlike `/` and `/login`, weren't behind the cookie gate — fixed with an explicit, session-checked route in `backend/app/main.py` mirroring the existing `/`/`/login` pattern.
  - Follow-up: manual testing surfaced two more chat UX bugs, both fixed on the same branch. (1) The follow-up-question fix above was prompt-only and not reliably followed by the model in longer conversations — `backend/app/llm.py`'s `generate_chat_reply` now deterministically appends a question naming a remaining empty field when the model's reply contains no `?`, rather than trusting compliance. (2) Neither chat panel auto-scrolled as messages accumulated; `frontend/components/ChatMessageList.tsx` now uses a `ResizeObserver` (on both the message content and the scroll container) to keep following the latest message as content reflows, not just a one-shot scroll per message — a one-shot `scrollIntoView` missed cases where content grew after the fact (e.g. late web-font swaps).
  - Testing tooling: a "Fake AI (testing)" checkbox fixed in the bottom-right corner of every page (`frontend/components/FakeAiToggle.tsx`, included in `app/layout.tsx`; state in `frontend/lib/fake-ai.ts`, persisted in `localStorage` via `useSyncExternalStore` since the value isn't available during SSR) lets the chat UI be exercised repeatedly without spending real LLM calls. When checked, every chat/match request carries an `x-prelegal-fake-ai: 1` header; `backend/app/fake_ai.py` defines the header name and a canned ~3-line "Blah, blah, blah..." reply that `generate_chat_reply`/`generate_match_reply` return via a `use_fake` early-return short-circuit (no formal interface — one conditional branch each was enough).

- **PL-10** (done): real signup/login/logout, per-user document history, and a visual polish pass across every screen.
  - Backend: the `prelegal_session` cookie is no longer trusted on its own presence -- a new `sessions` table (opaque tokens minted at signup/login, `app/auth.py`'s `create_session`/`get_optional_user_id`/`require_session`) replaces PL-7's fake any-value cookie check. New `backend/app/routers/auth.py` serves `POST /api/auth/{signup,login,logout}` and `GET /api/auth/me` (bcrypt password hashing). A new `documents` table + `backend/app/routers/documents.py` (`POST`/`GET /api/documents`, `GET /api/documents/{id}`) persist a document each time it's downloaded, scoped to the signed-in user; the backend derives each saved document's title from its party company names and document type. Both new tables follow the existing `users` table's recreate-from-scratch-on-startup pattern.
  - A real concurrency bug was found and fixed in the process: FastAPI dispatches a sync dependency generator's startup and teardown as separate threadpool jobs, not guaranteed to run on the same worker thread, so `sqlite3.Connection`'s default same-thread affinity turned concurrent requests into intermittent 500s. Fixed via `check_same_thread=False` in `app/db.py`'s `get_connection()`, caught by a genuinely concurrent regression test (`ThreadPoolExecutor`) and reproduced manually with concurrent curl requests before the fix, per the project's identify-root-cause-before-fixing rule.
  - Frontend: `LoginForm` now calls the real API and shows the server's error inline instead of unconditionally setting a client-side cookie; a new `SignupForm`/`/signup` page mirrors it. A Next.js route group, `app/(app)/`, wraps `/`, `/documents/[slug]`, and the new `/my-documents` page in a persistent `AppHeader` (nav, signed-in email, sign out) -- `/login` and `/signup` stay outside it. `DocumentApp`'s existing "Download PDF" button now also saves the document (`saveDocument`) as its one deliberate "this is done" trigger, rather than autosaving every edit; a saved document can hold several drafts of the same type (e.g. multiple NDAs for different counterparties) rather than one slot per type. Visiting a document page with `?documentId=<id>` (as `MyDocuments` links do) pre-fills the form from that saved document via a client-side fetch, since the page is statically exported per-slug with no per-document id known at build time.
  - Design tokens (`--color-brand-*` in `globals.css`, matching this file's Color Scheme) replaced hardcoded per-component hex values, fixing drift where the workspace's headings and its main CTA (the Download button) had silently ended up plain neutral grays instead of the brand palette; a shared `Button` component and `lib/ui.ts`'s `inputClass` replaced several independently-duplicated class strings.
  - Disclaimer: `frontend/lib/render-document.ts`'s `renderDocument()` now appends a "draft only, not reviewed by an attorney" notice to every rendered document, so it survives into the downloaded PDF (captured from the same rendered DOM) rather than only appearing as a web-only banner; a shorter reminder also sits next to the Download PDF button itself.