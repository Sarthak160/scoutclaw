#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-/home/node/.openclaw}"
OPENCLAW_CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$OPENCLAW_HOME/openclaw.json}"
OPENCLAW_WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-$OPENCLAW_HOME/workspace}"
OPENCLAW_GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
PORT="${PORT:-3000}"

mkdir -p "$OPENCLAW_HOME" "$OPENCLAW_WORKSPACE_DIR" /scoutclaw/output/uploads
touch /scoutclaw/output/.keep >/dev/null 2>&1 || true
chown -R node:node "$OPENCLAW_HOME" /scoutclaw/output

if [ ! -f "$OPENCLAW_CONFIG_PATH" ]; then
  cat > "$OPENCLAW_CONFIG_PATH" <<EOF
{
  "gateway": {
    "mode": "local"
  }
}
EOF
fi

if [ -n "${DATABASE_URL:-}" ]; then
  npx prisma db push --skip-generate
fi

openclaw gateway --allow-unconfigured --port "$OPENCLAW_GATEWAY_PORT" run &
GATEWAY_PID=$!

cleanup() {
  if kill -0 "$GATEWAY_PID" >/dev/null 2>&1; then
    kill "$GATEWAY_PID"
    wait "$GATEWAY_PID" || true
  fi
}

trap cleanup EXIT INT TERM

sleep 2

exec npm run start -- --hostname 0.0.0.0 --port "$PORT"
