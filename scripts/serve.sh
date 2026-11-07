#!/usr/bin/env bash
set -euo pipefail

# Local development server wrapper for ai-lab

PORT="${PORT:-3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting local preview server on http://localhost:$PORT/ ..."
echo "Serving root: $REPO_ROOT"
echo "Press Ctrl+C to stop."
echo ""

if command -v npx >/dev/null 2>&1; then
  exec npx -y serve -l "$PORT" "$REPO_ROOT"
elif command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --directory "$REPO_ROOT"
else
  echo "Error: Neither 'npx' nor 'python3' was found on PATH."
  exit 1
fi
