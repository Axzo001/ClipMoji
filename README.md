# ClipMoji 📋😊✨

ClipMoji is a GNOME Shell extension that brings the seamless, unified Clipboard History (similar to Windows `Win+V`) and Emoji/Kaomoji/Symbol Picker (similar to Windows `Win+.`) experience to the Linux desktop.

Designed for modern **GNOME Shell (ESM)**, it integrates directly into GNOME's Mutter compositor process to provide a fast, Wayland-native, and fluid clipboard management utility.

---

## 🌟 Key Features

*   **📋 Clipboard History**: Automatically monitors and saves copied text.
    *   Pin items to keep them forever (they won't be cleared).
    *   Delete individual entries or clear all unpinned items.
*   **😊 Emoji Picker**: A searchable grid of emojis sorted by categories.
*   **ツ Kaomoji Tab**: Instant access to text-based emoticons (like `¯\_(ツ)_/¯` or `(* ^ ω ^)`).
*   **🔣 Special Symbols**: Math operators, arrows, and currency signs without memorizing alt codes.
*   **🎞️ Tenor GIF Search**: Search and copy/paste trending or query-matched GIFs directly from Tenor (powered by asynchronous HTTP queries).
*   **⚡ Paste-on-Click**: Click any emoji, clipboard text, or GIF link to immediately paste it right where your text cursor is.
*   **🔍 Open & Type**: Hit the shortcut and just start typing. The popup instantly captures search queries across emojis, symbols, and history.

---

## ⚡ Performance & Efficiency Focus

ClipMoji is built to be extremely lightweight:
1.  **Debounced Writes**: To protect your SSD and prevent GNOME Shell stutter, history changes are debounced by **1 second** using `GLib.timeout_add`. Disk writes to `~/.config/clipmoji/history.json` happen only after you stop copying.
2.  **Asynchronous Networking**: GIF search queries and thumbnail previews are fetched in the background using `Soup.Session` (Libsoup 3). They download to `/tmp/clipmoji/` and will never lock up your shell UI.
3.  **No Memory Leaks**: All signals connected to GSettings or Mutter selection handlers are disconnected when the extension is disabled.

---

## 🚀 How to Install and Run (Quick Start)

We have included a setup script `install-and-test.sh` that automates linking directories, compiling schemas, and launching a test shell.

Simply run:
```bash
./install-and-test.sh
```

---

## 🖥️ Testing inside a Safe Sandbox (Gnome 49/50)

Because shell extensions run inside the compositor process, testing directly on your primary screen can be risky. 
When you run `./install-and-test.sh`, choose **`y`** to launch a **nested GNOME Shell window**:
```bash
dbus-run-session gnome-shell --devkit --wayland
```
This opens a window containing a nested development compositor session where you can test things safely.

### Enabling the Extension in the Nested Session:
Inside the nested desktop, open a terminal (or run this in your host terminal) and enable ClipMoji:
```bash
gnome-extensions enable clipmoji@axz01.projects
```
Open a text editor in the nested screen, copy some text, and press `Super+V` or `Super+.` to test it!

### 💡 Troubleshooting EBUSY / GDBus Errors
In GNOME 49 and 50, the older `--nested` option was removed. If you try to run without it, GNOME Shell tries to take control of your main graphics card and returns `GDBus.Error:System.Error.EBUSY: Device or resource busy`. 

We solve this by using the new **`--devkit`** flag. If your system warns that `mutter-devkit` is missing, you can install it via your package manager:
- **Ubuntu/Debian:** `sudo apt install mutter-dev-bin`
- **Fedora:** `sudo dnf install mutter-devel`
- **Arch Linux:** Included by default with `mutter`.

---

## ⚙️ Configuration & Customization

Configure preferences using the Extensions app or command line:
```bash
gnome-extensions prefs clipmoji@axz01.projects
```
- **Tenor GIF Integration:** Paste your free API Key from the [Tenor Developer Console](https://developers.google.com/tenor) into the settings panel to activate the GIF tab.
- **Adjust History Size:** Set the limit of clipboard entries to retain (default is 25).

---

## ⌨️ Shortcuts

*   `Super + V` ➡️ Open Unified Popup focused on **Clipboard History**
*   `Super + .` (or `Super + ;`) ➡️ Open Unified Popup focused on **Emoji Picker**
*   `Escape` ➡️ Close popup
*   `Arrow Keys` ➡️ Navigate grids and lists
*   `Enter` ➡️ Paste selected item
*   `Tab` / `Shift+Tab` ➡️ Focus navigation

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more details.
