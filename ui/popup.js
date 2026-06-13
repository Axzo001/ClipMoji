import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ClipboardTab } from './clipboardTab.js';
import { EmojiTab } from './emojiTab.js';
import { KaomojiTab } from './kaomojiTab.js';
import { SymbolsTab } from './symbolsTab.js';
import { GifTab } from './gifTab.js';

const POPUP_WIDTH = 380;
const POPUP_HEIGHT = 500;

export class ClipMojiPopup {
    constructor(extension, database, settings, onPasteCallback) {
        this.extension = extension;
        this.db = database;
        this.settings = settings;
        this.onPaste = onPasteCallback;
        this.emojiData = null;
        this._modalPushed = false;
        this._visible = false;
        // Cache tab instances across open/close cycles for performance
        this._tabCache = {};

        this._loadEmojiData();
        this._createUI();
    }

    _loadEmojiData() {
        try {
            const path = `${this.extension.path}/assets/emojis.json`;
            const file = Gio.File.new_for_path(path);
            const [success, contents] = file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                this.emojiData = JSON.parse(decoder.decode(contents));
            } else {
                throw new Error('load_contents returned false');
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to load emojis.json: ${e.message}`);
            this.emojiData = { emojis: {}, kaomojis: {}, symbols: {} };
        }
    }

    _createUI() {
        // The main popup box — lives in uiGroup directly, positioned absolutely
        this.popupBox = new St.BoxLayout({
            vertical: true,
            style_class: 'clipmoji-popup',
            reactive: true,
            visible: false,
            width: POPUP_WIDTH,
            // Don't set height — let content expand naturally within max
        });

        // Prevent clicks inside popup from closing it
        this.popupBox.connect('button-press-event', () => Clutter.EVENT_STOP);

        // Add the popup to the ui group (top layer)
        Main.layoutManager.addChrome(this.popupBox, {
            affectsStruts: false,
            trackFullscreen: false,
        });

        // 1. Search Bar
        this.searchContainer = new St.BoxLayout({
            style_class: 'search-container',
            x_expand: true,
        });

        this.searchEntry = new St.Entry({
            hint_text: 'Search...',
            style_class: 'search-entry',
            can_focus: true,
            x_expand: true,
        });

        this.searchEntry.clutter_text.connect('text-changed', () => {
            this._onSearchChanged();
        });

        this.searchEntry.connect('key-press-event', (_actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Down) {
                this._focusFirstTabItem();
                return Clutter.EVENT_STOP;
            }
            if (symbol === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.searchContainer.add_child(this.searchEntry);
        this.popupBox.add_child(this.searchContainer);

        // 2. Tab Bar
        this.tabBar = new St.BoxLayout({
            style_class: 'tab-bar',
            x_expand: true,
        });
        this.popupBox.add_child(this.tabBar);

        this.tabButtons = {};
        this.activeTabId = 'clipboard';

        // 3. Content Area
        this.contentContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'content-container',
        });
        this.popupBox.add_child(this.contentContainer);

        // 4. Invisible full-screen event capture overlay (for click-outside-to-close)
        // This sits BELOW the popupBox in chrome order
        this._clickCatcher = new St.Widget({
            style_class: 'clipmoji-click-catcher',
            reactive: true,
            visible: false,
            x: 0,
            y: 0,
        });

        this._clickCatcher.connect('button-press-event', (_actor, _event) => {
            this.close();
            return Clutter.EVENT_STOP;
        });

        Main.layoutManager.addChrome(this._clickCatcher, {
            affectsStruts: false,
            trackFullscreen: false,
        });

        // Key events on stage level for escape when popup has modal
        this._stageKeyPressId = global.stage.connect('key-press-event', (_actor, event) => {
            if (!this._visible) return Clutter.EVENT_PROPAGATE;
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _buildTabBar(enableGifs) {
        this.tabBar.destroy_all_children();
        this.tabButtons = {};

        const tabDefs = [
            { id: 'clipboard', icon: '📋', label: 'Clipboard' },
            { id: 'emoji',     icon: '😊', label: 'Emoji' },
            { id: 'kaomoji',   icon: 'ツ',  label: 'Kaomoji' },
            { id: 'symbols',   icon: '✦',   label: 'Symbols' },
        ];

        if (enableGifs) {
            tabDefs.push({ id: 'gif', icon: '🎞️', label: 'GIF' });
        }

        tabDefs.forEach(({ id, icon }) => {
            const btn = new St.Button({
                label: icon,
                style_class: 'button tab-button',
                can_focus: true,
            });
            btn.connect('clicked', () => this.switchTab(id));
            this.tabBar.add_child(btn);
            this.tabButtons[id] = btn;
        });
    }

    _getOrCreateTab(tabId) {
        if (this._tabCache[tabId]) return this._tabCache[tabId];

        const selectCb = (selectedItem) => {
            this.onPaste(selectedItem);
            this.close();
        };

        let tab;
        switch (tabId) {
            case 'clipboard':
                tab = new ClipboardTab(this, this.db, selectCb);
                break;
            case 'emoji':
                tab = new EmojiTab(this, this.emojiData, selectCb);
                break;
            case 'kaomoji':
                tab = new KaomojiTab(this, this.emojiData, selectCb);
                break;
            case 'symbols':
                tab = new SymbolsTab(this, this.emojiData, selectCb);
                break;
            case 'gif':
                tab = new GifTab(this, this.settings, selectCb);
                break;
            default:
                return null;
        }

        this._tabCache[tabId] = tab;
        return tab;
    }

    switchTab(tabId) {
        this.activeTabId = tabId;

        Object.keys(this.tabButtons).forEach(id => {
            const btn = this.tabButtons[id];
            if (id === tabId) {
                btn.add_style_class_name('active');
            } else {
                btn.remove_style_class_name('active');
            }
        });

        this.contentContainer.destroy_all_children();

        const tab = this._getOrCreateTab(tabId);
        if (!tab) return;

        // GIF tab needs a fresh instance each time (manages network state)
        if (tabId === 'gif' && tab.widget.get_parent()) {
            tab.widget.get_parent().remove_child(tab.widget);
        }

        this.contentContainer.add_child(tab.widget);
        this._onSearchChanged();
    }

    _focusFirstTabItem() {
        const tab = this._tabCache[this.activeTabId];
        if (tab?.focusableItems?.length > 0) {
            tab.focusableItems[0].grab_key_focus();
        }
    }

    _onSearchChanged() {
        const query = this.searchEntry.get_text();
        const tab = this._tabCache[this.activeTabId];
        if (tab && typeof tab.refresh === 'function') {
            tab.refresh(query);
        }
    }

    _computePosition() {
        const monitor = Main.layoutManager.currentMonitor;
        const [ptrX, ptrY] = global.get_pointer();

        let x = ptrX - Math.floor(POPUP_WIDTH / 2);
        let y = ptrY + 18;

        // Keep within monitor bounds
        x = Math.max(monitor.x + 8, Math.min(x, monitor.x + monitor.width - POPUP_WIDTH - 8));

        if (y + POPUP_HEIGHT > monitor.y + monitor.height - 8) {
            y = ptrY - POPUP_HEIGHT - 18;
        }
        y = Math.max(monitor.y + 8, y);

        return [x, y];
    }

    open(defaultTabId = 'clipboard') {
        if (this._visible) {
            // Already open — just switch tab
            if (this.activeTabId !== defaultTabId) {
                this.switchTab(defaultTabId);
                this.searchEntry.grab_key_focus();
            }
            return;
        }

        const enableGifs = this.settings.get_boolean('enable-gifs');

        // Destroy GIF tab cache if disabled (cleanup)
        if (!enableGifs && this._tabCache.gif) {
            this._tabCache.gif.destroy();
            delete this._tabCache.gif;
        }

        // If requested tab is gif but gifs disabled, fallback
        let tabToOpen = defaultTabId;
        if (tabToOpen === 'gif' && !enableGifs) {
            tabToOpen = 'clipboard';
        }

        // Rebuild tab bar
        this._buildTabBar(enableGifs);

        // Position popup
        const [x, y] = this._computePosition();
        this.popupBox.set_position(x, y);

        // Size and show click catcher
        const monitor = Main.layoutManager.currentMonitor;
        this._clickCatcher.set_position(monitor.x, monitor.y);
        this._clickCatcher.set_size(monitor.width, monitor.height);
        this._clickCatcher.show();
        this._clickCatcher.visible = true;

        // Show popup
        this.popupBox.show();
        this.popupBox.visible = true;

        this._visible = true;

        // Switch to target tab
        this.switchTab(tabToOpen);

        // Grab keyboard focus
        this.searchEntry.set_text('');
        this.searchEntry.grab_key_focus();
    }

    close() {
        if (!this._visible) return;

        this._visible = false;

        // Release modal grab if we had it
        if (this._modalPushed) {
            Main.popModal(this.popupBox);
            this._modalPushed = false;
        }

        this.popupBox.hide();
        this.popupBox.visible = false;
        this._clickCatcher.hide();
        this._clickCatcher.visible = false;

        // Reset search entry
        this.searchEntry.set_text('');

        // Destroy GIF tab to free network resources and cached downloads
        if (this._tabCache.gif) {
            this._tabCache.gif.destroy();
            delete this._tabCache.gif;
        }
    }

    toggle(tabId = 'clipboard') {
        if (this._visible) {
            if (this.activeTabId === tabId) {
                this.close();
            } else {
                this.switchTab(tabId);
                this.searchEntry.grab_key_focus();
            }
        } else {
            this.open(tabId);
        }
    }

    destroy() {
        // Disconnect stage key handler
        if (this._stageKeyPressId) {
            global.stage.disconnect(this._stageKeyPressId);
            this._stageKeyPressId = null;
        }

        this.close();

        // Destroy all cached tabs
        Object.values(this._tabCache).forEach(tab => {
            if (typeof tab.destroy === 'function') tab.destroy();
        });
        this._tabCache = {};

        Main.layoutManager.removeChrome(this._clickCatcher);
        Main.layoutManager.removeChrome(this.popupBox);

        this._clickCatcher.destroy();
        this.popupBox.destroy();
    }
}
