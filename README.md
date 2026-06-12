# ClipMoji 📋😊✨

ClipMoji is a GNOME Shell extension that brings the seamless, unified Clipboard History (like Windows `Win+V`) and Emoji/Kaomoji/Symbol Picker (like Windows `Win+.`) experience to the Linux desktop. 

Built using modern **GJS (ESM)**, it integrates directly into GNOME Shell's Mutter compositor process to provide a fast, Wayland-compatible, and native-feeling clipboard and character utility.

---

## 🌟 Key Features

*   **📋 Clipboard History**: Automatically tracks text snippets you copy.
    *   Pin items to keep them forever (they won't be cleared).
    *   Delete individual entries or purge unpinned items instantly.
*   **😊 Emoji Picker**: A categorized grid of classic and modern emojis.
*   **¯\\\_(ツ)\_/¯ Kaomoji Tab**: Quick access to fun text-based emoticons grouped by emotion/action.
*   **🔣 Special Symbols**: Math operators, arrows, and currency signs without memorizing keyboard alt codes.
*   **🎞️ Tenor GIF Search**: Search and copy/paste trending or query-matched GIFs directly from Tenor (powered by asynchronous HTTP queries).
*   **⚡ Paste-on-Click**: Click any emoji, clipboard text, or GIF link to immediately paste it right where your text cursor is blinking.
*   **🔍 Open & Type**: Hit the shortcut and just start typing. The popup instantly captures search queries across emojis, symbols, and history.

---

## 🛠️ Architecture & Performance Focus

ClipMoji is designed to keep your GNOME desktop smooth and stutter-free:
1.  **Debounced Writes**: To protect your SSD and prevent GNOME Shell stutters, history changes are debounced. File writes to `~/.config/clipmoji/history.json` occur 1 second after you stop copying.
2.  **Fully Asynchronous Network operations**: GIF search queries and thumbnail previews are fetched asynchronously via `Soup.Session` (Libsoup 3). They download to `/tmp/clipmoji/` in the background and won't lock up your shell UI.
3.  **Automatic Signal Disconnection**: Disconnecting settings listeners and clipboard watchers on disable guarantees zero memory leaks or dangling background timers.

---

## 🚀 How to Test & Install (Quick Start)

We have included a setup script `install-and-test.sh` that automates linking directories, compiling schemas, and launching a test shell.

### The One-Command Installer:
Simply clone this repository and run the script in your terminal:

```bash
./install-and-test.sh
```

### 🖥️ Testing inside a Safe Sandbox (Highly Recommended!)
Since extensions run inside the compositor process, testing directly on your production desktop can sometimes be scary. 
When you run `./install-and-test.sh`, it will ask if you want to spawn a **nested GNOME Shell window**:
```bash
dbus-run-session gnome-shell --nested --wayland
```
This opens a sandboxed GNOME Shell window running inside your current screen. 
1. Open a terminal inside the nested window or use the host terminal.
2. Enable ClipMoji:
   ```bash
   gnome-extensions enable clipmoji@axz01.projects
   ```
3. Open an editor (like Gedit or Text Editor) in the nested window.
4. Press `Super+V` (Clipboard) or `Super+.` (Emoji Picker) and try it out!

---

## ⚙️ Configuration & Customization

Once installed, you can configure your options via the native GNOME Extensions settings panel or via the command line:

- **Open Preferences:**
  ```bash
  gnome-extensions prefs clipmoji@axz01.projects
  ```
- **Tenor GIF Integration:**
  To enable GIF search, retrieve a free API Key from the [Tenor Developer Console](https://developers.google.com/tenor) and paste it into the **Tenor GIF API Key** field in the Preferences window.
- **Adjust History Size:**
  Set the limit of clipboard entries to retain (default is 25).

---

## ⌨️ Shortcuts

-   `Super + V` ➡️ Open Unified Popup focused on **Clipboard History**
-   `Super + .` (or `Super + ;`) ➡️ Open Unified Popup focused on **Emoji Picker**
-   `Escape` ➡️ Close popup
-   `Arrow Keys` ➡️ Grid and List navigation
-   `Enter` ➡️ Paste selected item
-   `Tab` / `Shift+Tab` ➡️ Focus navigation

---

## 📜 License

Distributed under the MIT License. See [LICENSE](file:///home/axz01/Projects/ClipMoji/LICENSE) for more details.
