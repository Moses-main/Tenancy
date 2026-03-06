#!/usr/bin/env bash
set -euo pipefail

ROOT_ENV_TEMPLATE=".env.example"
ROOT_ENV_TARGET=".env"
SERVER_ENV_TEMPLATE="server/.env.example"
SERVER_ENV_TARGET="server/.env"

copy_if_missing() {
  local template="$1"
  local target="$2"

  if [[ ! -f "$template" ]]; then
    echo "[setup:env] Skipping $target (template $template not found)"
    return
  fi

  if [[ -f "$target" ]]; then
    echo "[setup:env] Keeping existing $target"
  else
    cp "$template" "$target"
    echo "[setup:env] Created $target from $template"
  fi
}

copy_if_missing "$ROOT_ENV_TEMPLATE" "$ROOT_ENV_TARGET"
copy_if_missing "$SERVER_ENV_TEMPLATE" "$SERVER_ENV_TARGET"

echo "[setup:env] Done. Update created .env files with your actual credentials before running the app."
