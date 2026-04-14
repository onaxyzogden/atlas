#!/usr/bin/env bash
# infrastructure/wsl-redis-url.sh
# ─────────────────────────────────────────────────────────────────────────────
# Resolves the current WSL2 host IP and prints a ready-to-use Redis URL.
#
# WSL2 assigns a new virtual IP on every Windows restart, so
# redis://localhost:6379 silently fails when Redis runs inside WSL2.
# Run this script each time you restart Windows before starting the API.
#
# Usage — print URL:
#   bash infrastructure/wsl-redis-url.sh
#
# Usage — export into current shell:
#   export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

WSL_IP=$(wsl hostname -I 2>/dev/null | awk '{print $1}')

if [ -z "$WSL_IP" ]; then
  echo "ERROR: Could not resolve WSL2 IP. Is WSL2 running?" >&2
  exit 1
fi

echo "redis://${WSL_IP}:6379"
