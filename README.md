# ClipMoji

A GNOME Shell extension that brings Windows 11-style Clipboard History and Emoji Picker to your Linux desktop. One shortcut, one popup, everything you need — clipboard history, emojis, kaomojis, and symbols.

> **GNOME Shell 45, 46, 47, 50+** — uses modern ESM module syntax.

---

## Features

### 📋 Clipboard History
- Automatically captures everything you copy as text
- Pin important items so they survive "Clear All"
- Delete individual items or clear the whole history
- Search through your clipboard history instantly
- Configurable history size (5–200 items)
- Respects password manager privacy flags (KeePassXC, KDE Wallet)

### 😊 Emoji Picker
- Browse hundreds of emojis in categorized tabs (Smileys, People, Animals, Food, Activities, Travel, Objects, Symbols)
- Search by emoji name
- Click any emoji to instantly copy and paste it

### ¯\_(ツ)\_/¯ Kaomoji
- Curated text-face emoticons organized by mood (Happy, Sad, Angry, Surprised, Action…)
- Search and click to paste

### ✦ Symbols
- Mathematical, currency, and special characters
- Organized by category with search

### 🎞️ GIF Search (Optional)
- Search and insert GIFs via the free Tenor API
- Enable in Settings and add your free API key

---

## Installation

### From Source

```bash
git clone https://github.com/Axzo001/ClipMoji.git
cd ClipMoji
bash install.sh
```

Then open **GNOME Extensions** app and enable **ClipMoji**.

> No restart required — the extension loads immediately after enabling.

---

## Usage

| Action | Default Shortcut |
|--------|-----------------|
| Open Clipboard History | `Ctrl + Super + V` |
| Open Emoji / Symbol Picker | `Ctrl + Super + .` |
| Close popup | `Esc` or click outside |

- **Click** any item to copy it to clipboard and auto-paste into your focused app
- **Pin** items with the ⭐ button to protect them from "Clear All"
- **Delete** individual items with the 🗑 button
- **Search** — just start typing after opening the popup

### Changing Shortcuts

Open the extension's **Settings** → **Shortcuts** page. Click the edit button next to a shortcut, then press your desired key combination. Press Backspace to clear.

---

## Settings

Access via **GNOME Extensions** app → ClipMoji → ⚙️ Settings, or run:

```bash
gnome-extensions prefs clipmoji@axz01.projects
```

| Setting | Default | Description |
|---------|---------|-------------|
| History Size | 50 | Max clipboard entries (5–200) |
| Ignore Sensitive Data | On | Skip password manager entries |
| Enable GIF Tab | Off | Show Tenor GIF search |
| Tenor API Key | — | Required for GIF search |
| Clipboard Shortcut | `Ctrl+Super+V` | Configurable |
| Emoji Shortcut | `Ctrl+Super+.` | Configurable |

---

## Performance

- **Debounced clipboard reads** — 100ms debounce prevents redundant processing
- **Tab caching** — tab instances are created once and reused across open/close cycles
- **Debounced disk writes** — history only written to disk 1 second after last change
- **Lazy GIF session** — Soup.Session only created when GIF tab is opened
- **Proper signal cleanup** — all GObject signals disconnected on `disable()`

---

## Development

### Project Structure

```
ClipMoji/
├── extension.js          # Entry point — Extension class, clipboard watcher, shortcuts
├── prefs.js              # Settings UI (Libadwaita)
├── db.js                 # Clipboard history storage (JSON)
├── stylesheet.css        # St CSS styling
├── metadata.json         # Extension metadata
├── install.sh            # One-command install
├── schemas/              # GSettings XML schema
│   └── org.gnome.shell.extensions.clipmoji.gschema.xml
├── ui/
│   ├── popup.js          # Main popup container
│   ├── clipboardTab.js   # Clipboard history list
│   ├── emojiTab.js       # Emoji grid
│   ├── kaomojiTab.js     # Kaomoji grid
│   ├── symbolsTab.js     # Symbols grid
│   └── gifTab.js         # GIF search (Tenor)
├── utils/
│   ├── shortcuts.js      # Global keybinding registration
│   └── paste.js          # Ctrl+V simulation via Clutter virtual keyboard
└── assets/
    └── emojis.json       # Pre-compiled emoji/kaomoji/symbol database
```

### Reloading During Development

```bash
# After editing any .js file:
gnome-extensions disable clipmoji@axz01.projects
gnome-extensions enable clipmoji@axz01.projects

# After editing schemas/:
glib-compile-schemas ~/.local/share/gnome-shell/extensions/clipmoji@axz01.projects/schemas/
```

### Checking Logs

```bash
journalctl --user -f | grep -i clipmoji
```

---

## Requirements

- GNOME Shell 45, 46, 47, or 50
- `glib-compile-schemas` (part of `libglib2.0-bin` / `glib2`)
- Wayland or X11

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Contributing

Issues and PRs are welcome at [github.com/Axzo001/ClipMoji](https://github.com/Axzo001/ClipMoji/issues).
