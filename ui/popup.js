import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ClipboardTab } from './clipboardTab.js';
import { EmojiTab } from './emojiTab.js';
import { KaomojiTab } from './kaomojiTab.js';
import { SymbolsTab } from './symbolsTab.js';
import { GifTab } from './gifTab.js';

export class ClipMojiPopup {
    constructor(extension, database, settings, onPasteCallback) {
        this.extension = extension;
        this.db = database;
        this.settings = settings;
        this.onPaste = onPasteCallback;
        this.emojiData = null;

        this._loadEmojiData();
        this._createUI();
    }

    _loadEmojiData() {
        try {
            // Load pre-compiled emoji database from assets/emojis.json
            const path = `${this.extension.path}/assets/emojis.json`;
            const file = Gio.File.new_for_path(path);
            const [success, contents] = file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                this.emojiData = JSON.parse(decoder.decode(contents));
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to load emojis.json: ${e.message}`);
            // Fallback empty struct
            this.emojiData = { emojis: {}, kaomojis: {}, symbols: {} };
        }
    }

    _createUI() {
        // 1. Fullscreen transparent curtain to catch clicks outside the popup
        this.curtain = new St.Widget({
            style_class: 'clipmoji-curtain',
            visible: false,
            reactive: true,
            x: 0,
            y: 0
        });

        // Set curtain size to cover the entire layout screen
        this.curtain.connect('button-press-event', (actor, event) => {
            const clickedActor = event.get_source();
            if (clickedActor === this.curtain) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Handle ESC key or navigation keys at curtain level
        this.curtain.connect('key-press-event', this._onKeyPress.bind(this));

        // 2. The Inner Popup Box
        this.popupBox = new St.BoxLayout({
            vertical: true,
            style_class: 'clipmoji-popup',
            reactive: true,
            width: 360,
            height: 480
        });
        
        // Prevent clicks on the popup box itself from closing the window
        this.popupBox.connect('button-press-event', () => Clutter.EVENT_STOP);
        this.curtain.add_child(this.popupBox);

        // 3. Search Bar
        this.searchContainer = new St.BoxLayout({
            style_class: 'search-container',
            x_expand: true
        });

        this.searchEntry = new St.Entry({
            hint_text: 'Search...',
            style_class: 'search-entry',
            can_focus: true,
            x_expand: true
        });

        this.searchEntry.clutter_text.connect('text-changed', () => {
            this._onSearchChanged();
        });

        // Redirect keyboard focus from popup to search input initially
        this.searchEntry.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Down) {
                // Focus first item in the active tab
                this._focusFirstTabItem();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this.searchContainer.add_child(this.searchEntry);
        this.popupBox.add_child(this.searchContainer);

        // 4. Tab Bar (Windows 11 Style)
        this.tabBar = new St.BoxLayout({
            style_class: 'tab-bar',
            x_expand: true
        });

        this.tabs = {
            clipboard: { icon: '📋', label: 'Clipboard', object: null },
            emoji: { icon: '😊', label: 'Emoji', object: null },
            kaomoji: { icon: 'ツ', label: 'Kaomoji', object: null },
            symbols: { icon: '🔣', label: 'Symbols', object: null },
            gif: { icon: '🎞️', label: 'GIF', object: null }
        };

        this.tabButtons = {};
        this.activeTabId = 'clipboard';

        Object.keys(this.tabs).forEach(tabId => {
            const tabInfo = this.tabs[tabId];
            const btn = new St.Button({
                label: tabInfo.icon,
                style_class: 'button tab-button',
                can_focus: true
            });
            btn.connect('clicked', () => this.switchTab(tabId));
            this.tabBar.add_child(btn);
            this.tabButtons[tabId] = btn;
        });

        this.popupBox.add_child(this.tabBar);

        // 5. Active Content Area
        this.contentContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'content-container'
        });
        this.popupBox.add_child(this.contentContainer);

        // Add to main shell chrome
        Main.layoutManager.addChrome(this.curtain, {
            affectsInputRegion: true,
            trackFullscreen: true
        });
    }

    _onSearchChanged() {
        const query = this.searchEntry.get_text();
        const activeTab = this.tabs[this.activeTabId].object;
        if (activeTab && typeof activeTab.refresh === 'function') {
            activeTab.refresh(query);
        }
    }

    switchTab(tabId) {
        this.activeTabId = tabId;

        // Visual feedback on tab buttons
        Object.keys(this.tabButtons).forEach(id => {
            const btn = this.tabButtons[id];
            if (id === tabId) {
                btn.add_style_class_name('active');
            } else {
                btn.remove_style_class_name('active');
            }
        });

        // Destroy previous content
        this.contentContainer.destroy_all_children();

        // Instantiate tab object if not done
        const tabInfo = this.tabs[tabId];
        if (!tabInfo.object) {
            const selectCb = (selectedItem) => {
                this.onPaste(selectedItem);
                this.close();
            };

            if (tabId === 'clipboard') {
                tabInfo.object = new ClipboardTab(this, this.db, selectCb);
            } else if (tabId === 'emoji') {
                tabInfo.object = new EmojiTab(this, this.emojiData, selectCb);
            } else if (tabId === 'kaomoji') {
                tabInfo.object = new KaomojiTab(this, this.emojiData, selectCb);
            } else if (tabId === 'symbols') {
                tabInfo.object = new SymbolsTab(this, this.emojiData, selectCb);
            } else if (tabId === 'gif') {
                tabInfo.object = new GifTab(this, this.settings, selectCb);
            }
        }

        // Add widget and refresh content
        this.contentContainer.add_child(tabInfo.object.widget);
        this._onSearchChanged();
    }

    _focusFirstTabItem() {
        const activeTab = this.tabs[this.activeTabId].object;
        if (activeTab && activeTab.focusableItems && activeTab.focusableItems.length > 0) {
            activeTab.focusableItems[0].grab_key_focus();
        }
    }

    _onKeyPress(actor, event) {
        const symbol = event.get_key_symbol();
        
        // Escape closes popup
        if (symbol === Clutter.KEY_Escape) {
            this.close();
            return Clutter.EVENT_STOP;
        }

        // Navigate back to search entry if typing normal letters
        const activeActor = global.stage.get_key_focus();
        if (activeActor !== this.searchEntry.clutter_text && 
            symbol >= 32 && symbol <= 126) {
            this.searchEntry.grab_key_focus();
            // Let the event propagate to search entry
            return Clutter.EVENT_PROPAGATE;
        }

        // Custom keyboard grid/list navigation using arrow keys
        if ([Clutter.KEY_Left, Clutter.KEY_Right, Clutter.KEY_Up, Clutter.KEY_Down].includes(symbol)) {
            return this._navigateKeyboard(symbol);
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _navigateKeyboard(symbol) {
        const activeTab = this.tabs[this.activeTabId].object;
        if (!activeTab || !activeTab.focusableItems || activeTab.focusableItems.length === 0) {
            return Clutter.EVENT_PROPAGATE;
        }

        const items = activeTab.focusableItems;
        const activeActor = global.stage.get_key_focus();
        const currentIndex = items.indexOf(activeActor);

        if (currentIndex === -1) {
            // If focus is currently not on any grid item, let it propagate
            return Clutter.EVENT_PROPAGATE;
        }

        let columns = 1;
        let itemsPerRow = 1;

        if (this.activeTabId === 'emoji' || this.activeTabId === 'symbols') {
            columns = 6;
            itemsPerRow = 6;
        } else if (this.activeTabId === 'kaomoji' || this.activeTabId === 'gif') {
            columns = 2;
            itemsPerRow = 2;
        } else if (this.activeTabId === 'clipboard') {
            // Clipboard items have 3 buttons per row: [ContentBtn, PinBtn, DeleteBtn]
            columns = 3;
            itemsPerRow = 3;
        }

        let nextIndex = currentIndex;

        if (symbol === Clutter.KEY_Left) {
            if (currentIndex % itemsPerRow > 0) {
                nextIndex = currentIndex - 1;
            }
        } else if (symbol === Clutter.KEY_Right) {
            if (currentIndex % itemsPerRow < itemsPerRow - 1 && currentIndex < items.length - 1) {
                nextIndex = currentIndex + 1;
            }
        } else if (symbol === Clutter.KEY_Up) {
            if (currentIndex >= itemsPerRow) {
                nextIndex = currentIndex - itemsPerRow;
            } else {
                // Focus back to search entry
                this.searchEntry.grab_key_focus();
                return Clutter.EVENT_STOP;
            }
        } else if (symbol === Clutter.KEY_Down) {
            if (currentIndex + itemsPerRow < items.length) {
                nextIndex = currentIndex + itemsPerRow;
            }
        }

        if (nextIndex !== currentIndex && items[nextIndex]) {
            items[nextIndex].grab_key_focus();
            
            // If inside scroll view, scroll to ensure visible
            if (activeTab.scrollView) {
                // St.ScrollView handles auto scroll when focused
            }
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    open(defaultTabId = 'clipboard') {
        const monitor = Main.layoutManager.currentMonitor;

        // Position popup at pointer position
        const [x, y] = global.get_pointer();
        const popupWidth = 360;
        const popupHeight = 480;

        let posX = x - (popupWidth / 2);
        posX = Math.max(monitor.x, Math.min(posX, monitor.x + monitor.width - popupWidth));

        let posY = y + 15;
        if (posY + popupHeight > monitor.y + monitor.height) {
            posY = y - popupHeight - 15;
        }
        posY = Math.max(monitor.y, Math.min(posY, monitor.y + monitor.height - popupHeight));

        this.popupBox.set_position(posX, posY);
        
        // Size the background curtain to cover the fullscreen workspace
        this.curtain.set_size(monitor.width, monitor.height);
        this.curtain.set_position(monitor.x, monitor.y);

        this.curtain.show();
        this.curtain.visible = true;

        this.switchTab(defaultTabId);

        // Start GNOME modal session to grab key/pointer focus
        if (Main.pushModal(this.curtain)) {
            this.searchEntry.grab_key_focus();
        } else {
            console.error('ClipMoji: Failed to push modal grab');
            this.close();
        }
    }

    close() {
        if (!this.curtain.visible) return;

        Main.popModal(this.curtain);
        this.curtain.hide();
        this.curtain.visible = false;

        this.searchEntry.set_text('');
        
        // Destruct temporary GIF downloads from active tab if needed
        if (this.tabs.gif.object) {
            this.tabs.gif.object.destroy();
            this.tabs.gif.object = null; // Forces fresh instance next open
        }
    }

    toggle(tabId = 'clipboard') {
        if (this.curtain.visible) {
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
        this.close();
        Main.layoutManager.removeChrome(this.curtain);
        
        // Cleanup tabs
        Object.keys(this.tabs).forEach(tabId => {
            if (this.tabs[tabId].object && typeof this.tabs[tabId].object.destroy === 'function') {
                this.tabs[tabId].object.destroy();
            }
            this.tabs[tabId].object = null;
        });

        this.curtain.destroy();
    }
}
