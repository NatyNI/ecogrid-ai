#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

if [ ! -d "$BACKEND/.venv" ] || [ ! -d "$FRONTEND/node_modules" ]; then
  echo "Dependencies missing. Running setup first..."
  "$ROOT/setup.sh"
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo ""
    echo "Stopping backend..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Starting backend on http://127.0.0.1:8000"
(
  cd "$BACKEND"
  exec "$BACKEND/.venv/bin/uvicorn" app.main:app --reload --port 8000
) &
BACKEND_PID=$!

sleep 2

echo "==> Starting frontend on http://127.0.0.1:5173"
echo "    API docs: http://127.0.0.1:8000/docs"
echo "    Press Ctrl+C to stop both servers"
echo ""

cd "$FRONTEND"
exec npm run dev
