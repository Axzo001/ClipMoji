#!/bin/bash
set -e

UUID="clipmoji@axz01.projects"
DEST_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Installing ClipMoji..."

# Create extensions directory if it doesn't exist
mkdir -p "$HOME/.local/share/gnome-shell/extensions"

# Remove any existing installations
if [ -e "$DEST_DIR" ] || [ -L "$DEST_DIR" ]; then
    rm -rf "$DEST_DIR"
fi

# Symlink files (so local edits apply immediately upon reloading shell)
ln -s "$SRC_DIR" "$DEST_DIR"

# Compile GSettings schemas
glib-compile-schemas "$DEST_DIR/schemas/"

echo "✅ ClipMoji installed successfully!"
echo "🔄 Restart GNOME Shell (log out and log back in) to see it in your Extensions Manager."
