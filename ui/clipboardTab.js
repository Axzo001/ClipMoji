import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class ClipboardTab {
    constructor(popup, database, onSelectCallback) {
        this.popup = popup;
        this.db = database;
        this.onSelect = onSelectCallback;
        
        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container'
        });

        this._createUI();
    }

    _createUI() {
        // Clear all button bar
        const header = new St.BoxLayout({
            style_class: 'tab-header',
            x_expand: true,
            pack_start: false
        });

        this.clearButton = new St.Button({
            label: 'Clear All',
            style_class: 'button clear-button',
            reactive: true,
            can_focus: true
        });
        this.clearButton.connect('clicked', () => {
            this.db.clearAll();
            this.refresh();
        });
        header.add_child(this.clearButton);
        this.widget.add_child(header);

        // Scrollable list
        this.scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style_class: 'clipmoji-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });

        this.listContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'clipboard-list'
        });

        this.scrollView.add_child(this.listContainer);
        this.widget.add_child(this.scrollView);

        // Focusable items array for arrow key navigation
        this.focusableItems = [];
    }

    refresh(searchQuery = '') {
        // Clear existing items
        this.listContainer.destroy_all_children();
        this.focusableItems = [];

        const filtered = this.db.history.filter(item => {
            if (!searchQuery) return true;
            if (item.type === 'text') {
                return item.content.toLowerCase().includes(searchQuery.toLowerCase());
            }
            return false; // Skip images in search unless we have metadata
        });

        // Toggle clear all button sensitivity
        const hasUnpinned = this.db.history.some(item => !item.pinned);
        this.clearButton.set_reactive(hasUnpinned);
        if (hasUnpinned) {
            this.clearButton.remove_style_class_name('disabled');
        } else {
            this.clearButton.add_style_class_name('disabled');
        }

        if (filtered.length === 0) {
            const noItemsLabel = new St.Label({
                text: searchQuery ? 'No matching items' : 'Clipboard history is empty',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });
            this.listContainer.add_child(noItemsLabel);
            return;
        }

        filtered.forEach(item => {
            const row = new St.BoxLayout({
                style_class: 'clipboard-row-item',
                x_expand: true,
                reactive: true
            });

            // Pin Button
            const pinIcon = new St.Icon({
                gicon: Gio.Icon.new_for_string(item.pinned ? 'bookmark-new-symbolic' : 'bookmark-new-symbolic'), // Or custom SVG
                style_class: item.pinned ? 'icon-pinned' : 'icon-unpinned',
                icon_size: 16
            });
            const pinBtn = new St.Button({
                style_class: 'button icon-button pin-button',
                child: pinIcon,
                reactive: true,
                can_focus: true
            });
            pinBtn.connect('clicked', () => {
                this.db.togglePin(item.id);
                this.refresh(searchQuery);
            });

            // Content Button (clickable to paste)
            let contentWidget;
            if (item.type === 'text') {
                // Remove extra whitespace/newlines for preview
                let previewText = item.content.replace(/\s+/g, ' ').trim();
                if (previewText.length > 100) {
                    previewText = previewText.substring(0, 100) + '...';
                }
                contentWidget = new St.Label({
                    text: previewText,
                    style_class: 'clipboard-item-text',
                    x_align: Clutter.ActorAlign.START
                });
            } else if (item.type === 'image') {
                // Load thumbnail
                try {
                    const file = Gio.File.new_for_path(item.content);
                    const fileIcon = new Gio.FileIcon({ file: file });
                    contentWidget = new St.Icon({
                        gicon: fileIcon,
                        style_class: 'clipboard-item-image',
                        icon_size: 64, // Bigger thumbnail
                        x_align: Clutter.ActorAlign.START
                    });
                } catch (e) {
                    contentWidget = new St.Label({
                        text: '[Error loading image]',
                        style_class: 'clipboard-item-text error-text'
                    });
                }
            }

            const mainBtn = new St.Button({
                style_class: 'button clipboard-content-button',
                child: contentWidget,
                x_expand: true,
                reactive: true,
                can_focus: true
            });
            mainBtn.connect('clicked', () => {
                this.onSelect(item);
            });

            // Delete Button
            const deleteIcon = new St.Icon({
                gicon: Gio.Icon.new_for_string('edit-delete-symbolic'),
                style_class: 'icon-delete',
                icon_size: 16
            });
            const deleteBtn = new St.Button({
                style_class: 'button icon-button delete-button',
                child: deleteIcon,
                reactive: true,
                can_focus: true
            });
            deleteBtn.connect('clicked', () => {
                this.db.deleteItem(item.id);
                this.refresh(searchQuery);
            });

            row.add_child(mainBtn);
            row.add_child(pinBtn);
            row.add_child(deleteBtn);
            
            this.listContainer.add_child(row);
            
            // Keep track of focusable elements
            this.focusableItems.push(mainBtn);
            this.focusableItems.push(pinBtn);
            this.focusableItems.push(deleteBtn);
        });
    }
}
