#!/usr/bin/env bash
# Build and run the Prelegal container on Linux.
set -euo pipefail

cd "$(dirname "$0")/.."

docker build -t prelegal .
docker rm -f prelegal >/dev/null 2>&1 || true

env_args=()
if [ -f .env ]; then
  env_args=(--env-file .env)
fi

docker run -d --name prelegal -p 8000:8000 "${env_args[@]}" prelegal

echo "Prelegal is running at http://localhost:8000"
