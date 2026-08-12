import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.auth import SESSION_COOKIE, has_session
from app.db import init_db
from app.env import load_root_env
from app.routers.nda_chat import router as nda_chat_router

load_root_env()

FRONTEND_DIST = Path(os.environ.get("PRELEGAL_FRONTEND_DIST", "../frontend/out"))

# The static export runs on a different origin during local frontend dev
# (`next dev` on :3000) than the FastAPI backend (:8000). Harmless in
# production, where the frontend is served by this same app (same-origin
# requests never consult CORS).
DEV_FRONTEND_ORIGIN = "http://localhost:3000"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[DEV_FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(nda_chat_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/login")
def login_page(request: Request):
    if has_session(request):
        return RedirectResponse(url="/")
    return FileResponse(FRONTEND_DIST / "login.html")


@app.get("/")
def index(request: Request):
    if has_session(request):
        return FileResponse(FRONTEND_DIST / "index.html")
    return RedirectResponse(url="/login")


# StaticFiles below would otherwise serve these two filenames directly,
# bypassing the cookie checks above -- redirect them into the gated routes.
@app.get("/index.html")
def index_html():
    return RedirectResponse(url="/")


@app.get("/login.html")
def login_html():
    return RedirectResponse(url="/login")


# Serves the exported Next.js build's JS/CSS chunks and other static assets
# (e.g. /_next/*, favicon.ico). check_dir=False so importing this module
# doesn't fail in dev/test environments where the frontend hasn't been built.
app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True, check_dir=False), name="static")
