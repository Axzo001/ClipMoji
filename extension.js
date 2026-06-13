import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
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
        this._queryDebounceId = 0;

        // Apply saved history size
        this._db.setMaxSize(this._settings.get_int('history-size'));

        // Settings listeners
        this._settingsSignals = [
            this._settings.connect('changed::history-size', () => {
                this._db.setMaxSize(this._settings.get_int('history-size'));
            }),
            this._settings.connect('changed::shortcut-clipboard', () => this._resetShortcuts()),
            this._settings.connect('changed::shortcut-emoji', () => this._resetShortcuts()),
        ];

        // Initialize popup
        this._popup = new ClipMojiPopup(
            this,
            this._db,
            this._settings,
            item => this._onItemSelected(item)
        );

        // Register shortcuts
        this._registerAllShortcuts();

        // Clipboard monitoring via Meta.Selection
        this._setupClipboardWatcher();
    }

    _setupClipboardWatcher() {
        try {
            // global.display.get_selection() provides the Meta.Selection object
            this._selection = global.display.get_selection();
            this._ownerChangedId = this._selection.connect('owner-changed',
                (_sel, selectionType, _source) => {
                    // Meta.SelectionType.CLIPBOARD == 2 on recent GNOME
                    // We check both the enum and numeric value for safety
                    const clipType = Meta.SelectionType.CLIPBOARD;
                    if (selectionType === clipType && !this._isPasting) {
                        this._debouncedQueryClipboard();
                    }
                }
            );
        } catch (e) {
            console.error(`ClipMoji: Failed to set up clipboard watcher: ${e.message}`);
        }
    }

    _debouncedQueryClipboard() {
        // Debounce to avoid duplicate events from the same copy action
        if (this._queryDebounceId) {
            GLib.source_remove(this._queryDebounceId);
            this._queryDebounceId = 0;
        }
        this._queryDebounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._queryDebounceId = 0;
            this._queryClipboard();
            return GLib.SOURCE_REMOVE;
        });
    }

    _queryClipboard() {
        if (!this._settings) return;

        // Check for sensitive data (password manager hints)
        if (this._settings.get_boolean('ignore-sensitive') && this._selection) {
            try {
                // Meta.SelectionType.CLIPBOARD = 2 in GNOME 45+
                const mimeTypes = this._selection.get_mimetypes(Meta.SelectionType.CLIPBOARD);
                const sensitiveHints = [
                    'x-kde-passwordManagerHint',
                    'application/x-keepassxc-transfer',
                    'x-secret-content-type',
                ];
                if (mimeTypes.some(m => sensitiveHints.includes(m))) {
                    return;
                }
            } catch (e) {
                // get_mimetypes might fail if there's no clipboard owner — that's fine
            }
        }

        // Read text from clipboard
        const clipboard = St.Clipboard.get_default();
        clipboard.get_text(St.ClipboardType.CLIPBOARD, (_cb, text) => {
            if (!text || !text.trim()) return;
            if (!this._db) return;  // Extension might have been disabled

            const added = this._db.addText(text);

            // If clipboard tab is active and popup is open, refresh it
            if (added && this._popup?._visible && this._popup?.activeTabId === 'clipboard') {
                const clipTab = this._popup._tabCache?.clipboard;
                clipTab?.refresh(this._popup.searchEntry?.get_text() ?? '');
            }
        });
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
        // Remove debounce timer
        if (this._queryDebounceId) {
            GLib.source_remove(this._queryDebounceId);
            this._queryDebounceId = 0;
        }

        // Disconnect settings signals
        if (this._settings) {
            this._settingsSignals?.forEach(id => this._settings.disconnect(id));
            this._settingsSignals = null;
        }

        // Disconnect clipboard watcher
        if (this._selection && this._ownerChangedId) {
            this._selection.disconnect(this._ownerChangedId);
            this._ownerChangedId = null;
        }
        this._selection = null;

        // Remove shortcuts
        unregisterShortcuts();

        // Destroy popup
        this._popup?.destroy();
        this._popup = null;

        // Flush and release DB
        this._db?.flush();
        this._db = null;

        this._settings = null;
    }

    _onItemSelected(item) {
        if (item.type !== 'text') return;

        this._isPasting = true;

        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, item.content);

        // Release the paste lock after a brief delay for clipboard propagation
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._isPasting = false;
            return GLib.SOURCE_REMOVE;
        });

        // Simulate Ctrl+V to paste into the focused application
        simulatePaste();
    }
}
