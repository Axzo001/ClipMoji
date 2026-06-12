import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

/**
 * Registers global keyboard shortcuts defined in GSettings.
 * @param {Gio.Settings} settings - The extension GSettings instance
 * @param {Function} onClipboardPressed - Callback when clipboard shortcut is pressed
 * @param {Function} onEmojiPressed - Callback when emoji shortcut is pressed
 */
export function registerShortcuts(settings, onClipboardPressed, onEmojiPressed) {
    try {
        Main.wm.addKeybinding(
            'shortcut-clipboard',
            settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            onClipboardPressed
        );

        Main.wm.addKeybinding(
            'shortcut-emoji',
            settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            onEmojiPressed
        );
    } catch (e) {
        console.error(`ClipMoji: Failed to register keyboard shortcuts: ${e.message}`);
    }
}

/**
 * Unregisters global keyboard shortcuts.
 */
export function unregisterShortcuts() {
    try {
        Main.wm.removeKeybinding('shortcut-clipboard');
        Main.wm.removeKeybinding('shortcut-emoji');
    } catch (e) {
        console.error(`ClipMoji: Failed to unregister keyboard shortcuts: ${e.message}`);
    }
}
