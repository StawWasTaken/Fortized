#!/bin/bash
# Fortized — One-click game detection setup (macOS & Linux)

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Fortized Game Detection Setup      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Setting up automatic game detection..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPANION="$SCRIPT_DIR/fortized-companion.py"

if ! command -v python3 &>/dev/null; then
    echo "  [ERROR] Python 3 is not installed."
    echo "  Install it with: sudo apt install python3  (Linux)"
    echo "                    brew install python3      (macOS)"
    exit 1
fi

chmod +x "$COMPANION"
python3 "$COMPANION" --install
