# ClipMoji 📋😊✨

ClipMoji is a GNOME Shell extension that brings a seamless, unified **Clipboard History** (similar to Windows `Win+V`) and **Emoji/Kaomoji/Symbol Picker** (similar to Windows `Win+.`) experience to your Linux desktop.

Designed for modern **GNOME Shell (ESM)**, it integrates directly into GNOME's Mutter compositor process to provide a fast, Wayland-native, and fluid clipboard management utility.

---

## 🌟 Key Features

*   **📋 Clipboard History**: Automatically monitors and saves copied text.
    *   Pin items to keep them forever (they won't be cleared).
    *   Delete individual entries or clear all unpinned items.
*   **😊 Emoji Picker**: A searchable grid of emojis sorted by category.
    *   Categories: Smileys, People, Animals, Food, Activities, Travel, Objects, and Symbols.
*   **ツ Kaomoji Tab**: Instant access to text-based emoticons (like `¯\_(ツ)_/¯` or `(* ^ ω ^)`).
*   **🔣 Special Symbols**: Math operators, arrows, and currency signs without memorizing alt codes.
    *   Categories: Punctuation, Math, Currency, Arrows, and General.
*   **🎞️ Tenor GIF Search**: Search and copy/paste trending or query-matched GIFs directly from Tenor (powered by asynchronous HTTP queries).
*   **⚡ Paste-on-Click**: Click any emoji, clipboard text, or GIF link to immediately paste it right where your text cursor is.
*   **🔍 Open & Type**: Hit the shortcut and just start typing. The popup instantly captures search queries across emojis, symbols, and history.

---

## ⌨️ Shortcuts (Default)

*   `Ctrl + Super + V` ➡️ Open Unified Popup focused on **Clipboard History**
*   `Ctrl + Super + .` (or `Ctrl + Super + Space`) ➡️ Open Unified Popup focused on **Emoji Picker**
*   `Escape` ➡️ Close popup
*   `Arrow Keys` ➡️ Navigate grids and lists
*   `Enter` ➡️ Paste selected item
*   `Tab` / `Shift + Tab` ➡️ Focus navigation

---

## ⚙️ Configuration & Customization

Configure preferences using the **Extensions** app, **Extension Manager**, or command line:
```bash
gnome-extensions prefs clipmoji@axz01.projects
```

Inside the Settings dialog, you can configure:
1.  **History Size**: Maximum number of clipboard history items to retain (default: 25).
2.  **Ignore Sensitive Data**: Do not capture copies marked as private or copied from password managers (like KeePassXC).
3.  **Enable GIF Tab**: Show or hide the online GIF search tab.
4.  **Tenor GIF API Key**: Paste your free API Key from the [Tenor Developer Console](https://developers.google.com/tenor) to activate the GIF tab.
5.  **Keyboard Shortcuts**: Customize the hotkeys using standard GNOME shortcut format (e.g. `<Control><Super>v` or `<Control><Alt><Super>space`). **Changes apply instantly in real-time without reloading the extension.**

---

## 🚀 Installation & Update

Simply run the installation script:
```bash
./install.sh
```
This script symlinks ClipMoji into your local extensions directory and compiles the GSettings schemas.

Once finished, reload the extension using Extension Manager or run:
```bash
gnome-extensions disable clipmoji@axz01.projects
gnome-extensions enable clipmoji@axz01.projects
```
*(Note: If installing for the first time, you may need to log out and log back in to reload the GNOME extension registry.)*

---

## ⚡ Performance & Efficiency Focus

ClipMoji is built to be extremely lightweight:
1.  **Debounced Writes**: To protect your SSD and prevent GNOME Shell stutter, history changes are debounced by **1 second** using `GLib.timeout_add`. Disk writes to `~/.config/clipmoji/history.json` happen only after you stop copying.
2.  **Asynchronous Networking**: GIF search queries and thumbnail previews are fetched in the background using `Soup.Session` (Libsoup 3). They download to `/tmp/clipmoji/` and will never lock up your shell UI.
3.  **No Memory Leaks**: All signals connected to GSettings or Mutter selection handlers are disconnected when the extension is disabled.
4.  **Robust Modal Grab**: Keeps key grabs safe and avoids "incorrect pop" errors.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.
