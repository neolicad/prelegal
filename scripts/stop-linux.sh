#!/usr/bin/env bash
# Stop and remove the Prelegal container on Linux.
set -euo pipefail

if docker container inspect prelegal >/dev/null 2>&1; then
  docker rm -f prelegal >/dev/null
  echo "Prelegal stopped"
else
  echo "Prelegal is not running"
fi
