#!/usr/bin/env bash
set -euo pipefail

# Scaffolds a new sandbox prototype from .templates/sandbox-prototype/

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <prototype-name>"
  echo "Example: $0 physics-rope"
  exit 1
fi

NAME="$1"

# Validate kebab-case name
if [[ ! "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: Prototype name must be kebab-case (e.g. 'physics-rope', 'orbit-sim')."
  exit 1
fi

# Locate repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TEMPLATE_DIR="$REPO_ROOT/.templates/sandbox-prototype"
TARGET_DIR="$REPO_ROOT/sandbox/$NAME"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template directory not found at $TEMPLATE_DIR"
  exit 1
fi

if [ -e "$TARGET_DIR" ]; then
  echo "Error: Target directory $TARGET_DIR already exists."
  exit 1
fi

# Compute Title Case name (e.g. 'physics-rope' -> 'Physics Rope')
TITLE=$(python3 -c "import sys; print(' '.join(w.capitalize() for w in sys.argv[1].split('-')))" "$NAME")

echo "Scaffolding sandbox prototype '$TITLE' into sandbox/$NAME/ ..."
cp -r "$TEMPLATE_DIR" "$TARGET_DIR"

# Substitute placeholders
find "$TARGET_DIR" -type f \( -name "*.html" -o -name "*.css" -o -name "*.js" \) -exec sed -i "s/Prototype Title/$TITLE/g" {} +

echo "✓ Created sandbox/$NAME/ from template"
echo ""
echo "Remaining manual steps to complete your prototype:"
echo "--------------------------------------------------"
echo "1. Implement prototype logic and experiments:"
echo "   - sandbox/$NAME/main.js (experimental mechanics, physics, controls)"
echo "   - sandbox/$NAME/style.css (prototype-specific layout and styles)"
echo "   - sandbox/$NAME/index.html (update description, badge, debug controls)"
echo ""
echo "2. Register your prototype card in sandbox/index.html:"
echo "   Add an <a href=\"$NAME/\" class=\"prototype-card ...\"> to <div class=\"prototypes-grid\">"
echo ""
echo "3. If prototyping from _ideas/, update the status header:"
echo "   Status: Prototyping (sandbox/$NAME/)"
echo ""
echo "4. Run the repository validator before committing:"
echo "   python3 scripts/check.py"
echo "--------------------------------------------------"
