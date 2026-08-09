# ---- Stage 1: build the frontend as a static export ----
FROM node:22-slim AS frontend-build

WORKDIR /app
COPY templates/ templates/

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend, serving the static frontend build ----
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev

COPY backend/app ./app
COPY --from=frontend-build /app/frontend/out /app/frontend/out

ENV PRELEGAL_FRONTEND_DIST=/app/frontend/out
ENV PRELEGAL_DB_PATH=/app/backend/data/prelegal.db

EXPOSE 8000
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
