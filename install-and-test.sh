#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

UUID="clipmoji@axz01.projects"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Installing ClipMoji extension locally..."

# Create directory if it doesn't exist
mkdir -p "$HOME/.local/share/gnome-shell/extensions"

# Remove old files/symlinks if they exist
if [ -e "$EXT_DIR" ] || [ -L "$EXT_DIR" ]; then
    echo "⚠️ Removing existing installation at $EXT_DIR..."
    rm -rf "$EXT_DIR"
fi

# Symlink development files to extensions directory
echo "🔗 Symlinking $SRC_DIR to $EXT_DIR..."
ln -s "$SRC_DIR" "$EXT_DIR"

# Compile settings schema
echo "⚙️ Compiling settings schema..."
glib-compile-schemas "$EXT_DIR/schemas/"

echo "✅ ClipMoji installed successfully!"
echo ""

# Ask if user wants to run a nested GNOME Shell instance for testing
read -p "🖥️ Do you want to launch a nested GNOME Shell window for testing? (y/N): " choice
if [[ "$choice" =~ ^[Yy]$ ]]; then
    echo "🔄 Launching nested GNOME Shell. Press Ctrl+C in this terminal to close it."
    echo "ℹ️  Once the nested desktop starts, run this command inside it to enable ClipMoji:"
    echo "    gnome-extensions enable $UUID"
    echo ""
    dbus-run-session gnome-shell --devkit --wayland
else
    echo "ℹ️  To apply changes on your primary screen:"
    echo "   - On X11: Press Alt+F2, type 'r', and press Enter."
    echo "   - On Wayland: Log out and log back in."
    echo "   - Finally, enable it: gnome-extensions enable $UUID"
fi
