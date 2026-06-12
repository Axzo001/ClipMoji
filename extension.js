import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import GLib from 'gi://GLib';

import { ClipMojiDatabase } from './db.js';
import { ClipMojiPopup } from './ui/popup.js';
import { registerShortcuts, unregisterShortcuts } from './utils/shortcuts.js';
import { simulatePaste } from './utils/paste.js';

export default class ClipMojiExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._db = new ClipMojiDatabase();
        this._isPasting = false;
        
        // Listen to settings changes for max history size
        this._db.setMaxSize(this._settings.get_int('history-size'));
        this._historySizeChangedId = this._settings.connect('changed::history-size', () => {
            this._db.setMaxSize(this._settings.get_int('history-size'));
        });

        // Initialize UI popup manager
        this._popup = new ClipMojiPopup(
            this,
            this._db,
            this._settings,
            this._onItemSelected.bind(this)
        );

        // Register global shortcuts
        this._registerAllShortcuts();

        // Bind GSettings listeners to reset shortcuts dynamically when changed
        this._shortcutClipboardId = this._settings.connect('changed::shortcut-clipboard', () => this._resetShortcuts());
        this._shortcutEmojiId = this._settings.connect('changed::shortcut-emoji', () => this._resetShortcuts());

        // Watch clipboard owner changes
        const display = global.display;
        this._selection = display.get_selection();
        
        this._ownerChangedId = this._selection.connect('owner-changed', (selection, selectionType) => {
            // 1 represents Meta.SelectionType.CLIPBOARD
            const isClipboard = (selectionType === 1 || (Meta.SelectionType && selectionType === Meta.SelectionType.CLIPBOARD));
            
            if (isClipboard && !this._isPasting) {
                this._queryClipboard();
            }
        });

        // Query initial clipboard content
        this._queryClipboard();
    }

    _registerAllShortcuts() {
        registerShortcuts(
            this._settings,
            () => this._popup.toggle('clipboard'),
            () => this._popup.toggle('emoji')
        );
    }

    _resetShortcuts() {
        unregisterShortcuts();
        this._registerAllShortcuts();
    }

    disable() {
        // Disconnect GSettings listeners
        if (this._settings) {
            if (this._historySizeChangedId) {
                this._settings.disconnect(this._historySizeChangedId);
            }
            if (this._shortcutClipboardId) {
                this._settings.disconnect(this._shortcutClipboardId);
            }
            if (this._shortcutEmojiId) {
                this._settings.disconnect(this._shortcutEmojiId);
            }
        }
        this._settings = null;

        // Disconnect clipboard listener
        if (this._selection && this._ownerChangedId) {
            this._selection.disconnect(this._ownerChangedId);
        }
        this._selection = null;

        // Unregister shortcuts
        unregisterShortcuts();

        // Destroy UI
        if (this._popup) {
            this._popup.destroy();
            this._popup = null;
        }

        if (this._db) {
            this._db.flush();
            this._db = null;
        }
    }

    _queryClipboard() {
        if (this._settings.get_boolean('ignore-sensitive') && this._selection) {
            try {
                const mimeTypes = this._selection.get_mimetypes(1) || [];
                const sensitiveTypes = [
                    'x-kde-passwordManagerHint',
                    'application/x-keepassxc-transfer'
                ];
                if (mimeTypes.some(m => sensitiveTypes.includes(m))) {
                    return; // Ignore sensitive clipboard entries
                }
            } catch (e) {
                console.error(`ClipMoji: Error checking sensitive clipboard MIME types: ${e.message}`);
            }
        }

        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (text && text.trim()) {
                // If it's a new copy, store it
                const addedItem = this._db.addText(text);
                // If popup is visible and active on clipboard tab, refresh list
                if (addedItem && this._popup && this._popup.curtain.visible && this._popup.activeTabId === 'clipboard') {
                    const clipboardTab = this._popup.tabs.clipboard.object;
                    if (clipboardTab) {
                        clipboardTab.refresh(this._popup.searchEntry.get_text());
                    }
                }
            }
        });
    }

    _onItemSelected(item) {
        if (item.type === 'text') {
            // 1. Set pasting lock flag
            this._isPasting = true;

            // 2. Set system clipboard to selected text
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, item.content);

            // 3. Release lock after clipboard propagation delay
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                this._isPasting = false;
                return GLib.SOURCE_REMOVE;
            });

            // 4. Simulate paste key combination
            simulatePaste();
        }
    }
}
