#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "==> EcoGrid AI setup"

if [ ! -d "$BACKEND/.venv" ]; then
  echo "    Creating Python virtual environment..."
  python3 -m venv "$BACKEND/.venv"
fi

echo "    Installing Python dependencies..."
"$BACKEND/.venv/bin/pip" install -q -r "$BACKEND/requirements.txt"

if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "    Installing npm dependencies..."
  (cd "$FRONTEND" && npm install)
else
  echo "    npm dependencies already installed"
fi

echo ""
echo "Setup complete. Run: ./start.sh"
