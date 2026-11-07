#!/usr/bin/env bash
set -euo pipefail

# Scaffolds a new arcade game from .templates/arcade-game/

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <game-name>"
  echo "Example: $0 space-runner"
  exit 1
fi

NAME="$1"

# Validate kebab-case name
if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: Game name must be kebab-case (e.g. 'space-runner', 'super-pong-2')."
  exit 1
fi

# Locate repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_DIR="$REPO_ROOT/.templates/arcade-game"
TARGET_DIR="$REPO_ROOT/arcade/$NAME"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template directory not found at $TEMPLATE_DIR"
  exit 1
fi

if [ -e "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR already exists."
  exit 1
fi

# Compute Title Case name (e.g. 'space-runner' -> 'Space Runner')
TITLE=$(python3 -c "import sys; print(' '.join(w.capitalize() for w in sys.argv[1].split('-')))" "$NAME")

echo "Scaffolding arcade game '$TITLE' into arcade/$NAME/ ..."
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# Substitute placeholders
find "$TARGET_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) -exec sed -i "s/Game Title/$TITLE/g" {} +
find "$TARGET_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) -exec sed -i "s/game-title/$NAME/g" {} +

echo "✓ Created arcade/$NAME/ from template"
echo ""
echo "Remaining manual steps to complete your game:"
echo "--------------------------------------------------"
echo "1. Customize game logic and visuals:"
echo "   - arcade/$NAME/game.js (gameplay loop, controls, mechanics)"
echo "   - arcade/$NAME/style.css (canvas aspect ratio, colors, accents)"
echo "   - arcade/$NAME/index.html (update description, HUD labels, emoji favicon)"
echo ""
echo "2. Register your game card in arcade/index.html:"
echo "   Add an <a href=\"$NAME/\" class=\"game-card ...\"> to <section class=\"games-grid\">"
echo ""
echo "3. Add thumbnail gradient in arcade/landing.css:"
echo "   .game-card__thumb--$NAME { background: linear-gradient(...); }"
echo ""
echo "4. If graduating from _ideas/, update the status header:"
echo "   Status: Shipped (arcade/$NAME/)"
echo ""
echo "5. Run the repository validator before committing:"
echo "   python3 scripts/check.py"
echo "--------------------------------------------------"
