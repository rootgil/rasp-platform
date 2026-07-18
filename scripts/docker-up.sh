#!/usr/bin/env bash
# Start the Docker stack according to DOCKER_MODE in .env (or the environment).
#
#   DOCKER_MODE=dev|image|prod
#
# Examples:
#   ./scripts/docker-up.sh up -d --build
#   ./scripts/docker-up.sh down
#   DOCKER_MODE=image ./scripts/docker-up.sh logs -f app

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mode="${DOCKER_MODE:-}"
if [[ -z "$mode" && -f .env ]]; then
  # shellcheck disable=SC1091
  mode="$(grep -E '^[[:space:]]*DOCKER_MODE=' .env | tail -1 | cut -d= -f2- | tr -d '[:space:]"'"'" || true)"
fi
mode="${mode:-dev}"

case "$mode" in
  dev)
    files=(-f docker-compose.yml -f docker-compose.dev.yml)
    env_args=(--env-file .env)
    ;;
  image)
    files=(-f docker-compose.yml)
    env_args=(--env-file .env)
    ;;
  prod)
    files=(-f docker-compose.prod.yml)
    if [[ ! -f .env.production ]]; then
      echo "DOCKER_MODE=prod requires .env.production (see .env.production.example)" >&2
      exit 1
    fi
    env_args=(--env-file .env.production)
    ;;
  *)
    echo "Unknown DOCKER_MODE='$mode' (expected: dev | image | prod)" >&2
    exit 1
    ;;
esac

echo "→ DOCKER_MODE=$mode  compose: ${files[*]}"
exec docker compose "${files[@]}" "${env_args[@]}" "$@"
