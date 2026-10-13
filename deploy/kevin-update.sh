#!/usr/bin/env bash
# Update the WhatsApp gateway that runs on Kevin.
#
# On this Mac, from the deploy folder:
#   ./kevin-update.sh
# SSH will ask for the Kevin login. The command copies the gateway and rebuilds it.
# It does not replace the server .env file.
#
# On Kevin itself, the same script rebuilds /opt/homelab/sana-whatsapp.
set -euo pipefail

KEVIN_SSH="${KEVIN_SSH:-kevin@100.126.110.34}"
REMOTE_DIR="${KEVIN_GATEWAY_DIR:-/opt/homelab/sana-whatsapp}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GATEWAY_DIR="$SCRIPT_DIR/whatsapp-gateway"

sync_gateway() {
  local dest="$1"
  mkdir -p "$dest"
  tar -C "$GATEWAY_DIR" -czf - \
    --exclude node_modules \
    --exclude .env \
    Dockerfile \
    docker-compose.yml \
    package.json \
    package-lock.json \
    .dockerignore \
    src \
    | tar -xzf - -C "$dest"
}

rebuild() {
  local dir="$1"
  cd "$dir"
  docker compose up -d --build
  curl -fsS http://127.0.0.1:3020/health
  echo
}

if [ "$(uname -s)" = "Darwin" ]; then
  echo "Updating the WhatsApp gateway on ${KEVIN_SSH}"
  echo "Enter the Kevin login when SSH asks."
  COPYFILE_DISABLE=1 tar -C "$GATEWAY_DIR" -czf - \
    --exclude node_modules \
    --exclude .env \
    Dockerfile \
    docker-compose.yml \
    package.json \
    package-lock.json \
    .dockerignore \
    src \
    | ssh -o PreferredAuthentications=publickey,password "$KEVIN_SSH" \
      "mkdir -p '$REMOTE_DIR' && tar -xzf - -C '$REMOTE_DIR' && cd '$REMOTE_DIR' && docker compose up -d --build && curl -fsS http://127.0.0.1:3020/health && echo"
  exit 0
fi

sync_gateway "$REMOTE_DIR"
rebuild "$REMOTE_DIR"
