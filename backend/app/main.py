import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db

# Must match the cookie name/value set by frontend/lib/session.ts. There is
# no real authentication yet -- this cookie's mere presence is the "session".
SESSION_COOKIE = "prelegal_session"

FRONTEND_DIST = Path(os.environ.get("PRELEGAL_FRONTEND_DIST", "../frontend/out"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/login")
def login_page(request: Request):
    if request.cookies.get(SESSION_COOKIE):
        return RedirectResponse(url="/")
    return FileResponse(FRONTEND_DIST / "login.html")


@app.get("/")
def index(request: Request):
    if request.cookies.get(SESSION_COOKIE):
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
