#!/bin/bash
# Fortized — One-click game detection setup (macOS & Linux)

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   Fortized Game Detection Setup      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  Setting up automatic game detection..."
echo ""

if ! command -v python3 &>/dev/null; then
    echo "  [ERROR] Python 3 is not installed."
    echo "  Install it with: sudo apt install python3  (Linux)"
    echo "                    brew install python3      (macOS)"
    exit 1
fi

# Determine install directory
if [ "$(uname)" = "Darwin" ]; then
    INSTALL_DIR="$HOME/Library/Application Support/Fortized"
else
    INSTALL_DIR="$HOME/.local/share/fortized"
fi
mkdir -p "$INSTALL_DIR"

COMPANION="$INSTALL_DIR/fortized-companion.py"

# Check if companion already exists next to this script (local dev)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/fortized-companion.py" ]; then
    cp "$SCRIPT_DIR/fortized-companion.py" "$COMPANION"
else
    # Download companion from server
    echo "  Downloading companion service..."
    if command -v curl &>/dev/null; then
        curl -fsSL "https://fortized.com/companion/fortized-companion.py" -o "$COMPANION"
    elif command -v wget &>/dev/null; then
        wget -qO "$COMPANION" "https://fortized.com/companion/fortized-companion.py"
    else
        echo "  [ERROR] Neither curl nor wget found. Cannot download companion."
        exit 1
    fi

    if [ ! -s "$COMPANION" ]; then
        echo "  [ERROR] Download failed."
        exit 1
    fi
fi

chmod +x "$COMPANION"
python3 "$COMPANION" --install
