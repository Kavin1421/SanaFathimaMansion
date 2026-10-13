#!/usr/bin/env bash
# Update the WhatsApp gateway on the Kevin machine.
# GitHub-hosted runners cannot reach this host because it is on Tailscale.
# Run on Kevin: bash deploy/kevin-update.sh
set -euo pipefail

ROOT="${KEVIN_APP_ROOT:-/opt/homelab/SanaFathimaMansion}"
REPO_URL="${KEVIN_REPO_URL:-https://github.com/Kavin1421/SanaFathimaMansion.git}"
BRANCH="${KEVIN_BRANCH:-main}"

if [ ! -d "$ROOT/.git" ]; then
  mkdir -p "$(dirname "$ROOT")"
  git clone --branch "$BRANCH" "$REPO_URL" "$ROOT"
fi

cd "$ROOT"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$ROOT/deploy/whatsapp-gateway"
docker compose up -d --build
curl -fsS http://127.0.0.1:3020/health
echo
