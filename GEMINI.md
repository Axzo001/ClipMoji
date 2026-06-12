# ClipMoji GNOME Shell Extension: Design & Brainstorming

ClipMoji is a GNOME Shell extension that brings the seamless, integrated Clipboard History (similar to Windows `Win+V`) and Emoji/Kaomoji/Symbol Picker (similar to Windows `Win+.`) experience to the Linux desktop.

---

## 🌟 Key Features

### 1. Unified Popup UI (Windows 11 Style)
In modern Windows, pressing `Win+.` or `Win+V` opens a single unified popup with multiple tabs. ClipMoji will adopt this layout to provide a cohesive experience:
- **Tabs**:
  - 📋 **Clipboard History**: Lists copied text snippets, HTML, and images. Includes options to pin items, delete individual items, or clear all (excluding pinned).
  - 😊 **Emojis**: A grid of emojis categorized by theme (Smileys, People, Animals, etc.) with a search function and "recent" section.
  - ¯\\\_(ツ)\_/¯ **Kaomoji**: Text-based emoticons sorted by emotion/action.
  - 🔣 **Symbols**: Mathematical, punctuation, currency, and special characters.
  - 🎞️ **GIFs (Optional/Future)**: Integration with a GIF search API (like Tenor) to search and copy GIF links/files.

### 2. Context-Aware Popup Positioning
- **Target Position**: The popup should appear at the current text cursor/caret position if available (via Accessibility/AT-SPI or IBus focus), or fallback to the mouse pointer position or screen center.
- **Trigger Shortcuts**:
  - `Super+V` -> Opens the popup directly focused on the **Clipboard History** tab.
  - `Super+.` or `Super+;` -> Opens the popup focused on the **Emoji Picker** tab.

### 3. Clipboard Management (Wayland-Native)
- **Text & Rich Text Support**: Capture and store text snippets.
- **Image Support**: Monitor clipboard image targets, cache image thumbnails to a local directory (e.g., `~/.cache/clipmoji/`), and display them in the history.
- **Pinning**: Prevent specific clipboard items from being cleared.
- **Persistence**: Store history and metadata in a simple JSON file (`~/.config/clipmoji/history.json`) to persist across shell restarts.

### 4. Paste-on-Click
- When an item (clipboard text, emoji, kaomoji, symbol) is clicked, ClipMoji will:
  1. Set the system clipboard content to the selected value.
  2. Automatically trigger a paste action (typically by simulating `Ctrl+V` or injecting keypresses, which is secure and possible within GNOME Shell's privileged context, even on Wayland).

---

## 🛠️ Technical Architecture & Requirements

### 1. Environment & API
- **GNOME Shell version**: 50.2 (uses modern ESM module syntax, introduced in GNOME 45).
- **Language**: JavaScript (ESM syntax using GObject Introspection via GJS).
- **UI Toolkit**: `St` (Shell Toolkit) and `Clutter`. CSS styling using custom theme files.

### 2. Key GNOME APIs to Utilize
- **`import Clutter from 'gi://Clutter';`**: For layout, keyboard event handling, and UI rendering.
- **`import St from 'gi://St';`**: For styled widgets (scroll views, buttons, labels, entries).
- **`import Shell from 'gi://Shell';`**: For clipboard management (`St.Clipboard` or `Gdk.Display`) and window management.
- **`import Meta from 'gi://Meta';`**: For global keyboard shortcut binding.
- **`import Gio from 'gi://Gio';`**: For file writing/reading (persisting history).

### 3. Wayland Clipboard Considerations
GNOME Shell extensions run inside the composer process. This means we have direct access to the clipboard buffer via `St.Clipboard.get_default()` or GDK's clipboard APIs. Unlike regular sandboxed flatpaks or Wayland clients, the shell extension does not suffer from Wayland clipboard focus restrictions when registering global listeners.

---

## 📂 Project Structure

```
ClipMoji/
├── metadata.json           # Extension metadata (uuid, name, shell-version, etc.)
├── extension.js            # Entry point (Extension class with enable/disable)
├── stylesheet.css          # Styling for the UI popup and tabs
├── db.js                   # Handles database storage (history.json)
├── ui/                     # UI components
│   ├── popup.js            # Main popup container
│   ├── clipboardTab.js     # Clipboard list panel
│   ├── emojiTab.js         # Emoji grid panel
│   ├── kaomojiTab.js       # Kaomoji panel
│   └── symbolsTab.js       # Symbols grid panel
├── utils/
│   ├── paste.js            # Paste-on-click simulator
│   └── shortcuts.js        # Global hotkey binder
├── assets/                 # Icons and pre-compiled emoji database (JSON)
├── GEMINI.md               # Brainstorming & Dev Roadmap (this file)
└── README.md               # User guide & Installation instructions
```

---

## 🔍 Key Challenges & Solutions

| Challenge | Solution |
| :--- | :--- |
| **Simulating Paste on Wayland** | Simulate `Ctrl+V` keypresses using Clutter virtual keyboards or Gdk/Wayland direct key event injection, ensuring compatibility across Wayland and X11 sessions. |
| **Image Clipboard Caching** | When an image is copied, extract the bytes, save them as PNGs in `~/.cache/clipmoji/`, and store the file path in the history DB. |
| **Caret/Cursor Tracking** | Use AT-SPI (Accessibility API) or check the active text input focus bounds to position the popup right below the typing cursor. Fall back gracefully to mouse pointer. |
| **GJS Memory Management** | Properly garbage-collect GObjects, disconnect signals on disable, and keep DB disk writes debounced to prevent shell stutters. |

---

## ❓ Open Questions for the User

1. **Integrated vs. Separate Popups**:
   - Would you like one single popup containing all tabs (Clipboard, Emojis, Kaomojis, Symbols), or do you prefer separate, independent popups for the clipboard (`Super+V`) and emoji picker (`Super+.`)?
2. **GIF Search Integration**:
   - Should we include a GIF search tab (like Tenor) in the initial version, or keep it text/image-based first to prioritize stability?
3. **Database File Location**:
   - Do you have a preference for storage? Typically `~/.config/clipmoji/` for settings and history, and `~/.cache/clipmoji/` for images is standard.
4. **Custom CSS / Themes**:
   - Should it match your current system GNOME theme (Libadwaita styling), or should we design a distinct, customizable, vibrant visual layout (e.g. glassmorphism or custom color schemes)?
