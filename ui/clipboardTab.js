import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';

export class ClipboardTab {
    constructor(popup, database, onSelectCallback) {
        this.popup = popup;
        this.db = database;
        this.onSelect = onSelectCallback;

        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container',
        });

        this.focusableItems = [];
        this._createUI();
    }

    _createUI() {
        // Header with "Clear All" button
        const header = new St.BoxLayout({
            style_class: 'tab-header',
            x_expand: true,
        });

        this.clearButton = new St.Button({
            label: 'Clear All',
            style_class: 'button clear-button',
            reactive: true,
            can_focus: true,
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
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });

        this.listContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'clipboard-list',
        });

        this.scrollView.add_child(this.listContainer);
        this.widget.add_child(this.scrollView);
    }

    refresh(searchQuery = '') {
        this.listContainer.destroy_all_children();
        this.focusableItems = [];

        const history = this.db.history;
        const lowerQuery = searchQuery.toLowerCase();

        const filtered = history.filter(item => {
            if (!searchQuery) return true;
            if (item.type === 'text') {
                return item.content.toLowerCase().includes(lowerQuery);
            }
            return false;
        });

        // Update clear button state
        const hasUnpinned = history.some(item => !item.pinned);
        this.clearButton.set_reactive(hasUnpinned);
        if (hasUnpinned) {
            this.clearButton.remove_style_class_name('disabled');
        } else {
            this.clearButton.add_style_class_name('disabled');
        }

        if (filtered.length === 0) {
            const empty = new St.Label({
                text: searchQuery ? 'No matching items' : 'Clipboard history is empty',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
            });
            this.listContainer.add_child(empty);
            return;
        }

        filtered.forEach(item => {
            this._buildRow(item, searchQuery);
        });
    }

    _buildRow(item, searchQuery) {
        const row = new St.BoxLayout({
            style_class: `clipboard-row-item${item.pinned ? ' pinned' : ''}`,
            x_expand: true,
            reactive: true,
        });

        // Content button
        let contentWidget;
        if (item.type === 'text') {
            let preview = item.content.replace(/\s+/g, ' ').trim();
            if (preview.length > 120) {
                preview = preview.substring(0, 120) + '…';
            }
            contentWidget = new St.Label({
                text: preview,
                style_class: 'clipboard-item-text',
                x_align: Clutter.ActorAlign.START,
            });
            // Allow text wrapping for readability
            contentWidget.clutter_text.ellipsize = 3; // Pango.EllipsizeMode.END
        } else if (item.type === 'image') {
            try {
                const file = Gio.File.new_for_path(item.content);
                contentWidget = new St.Icon({
                    gicon: new Gio.FileIcon({ file }),
                    style_class: 'clipboard-item-image',
                    icon_size: 56,
                    x_align: Clutter.ActorAlign.START,
                });
            } catch (_e) {
                contentWidget = new St.Label({
                    text: '[Image]',
                    style_class: 'clipboard-item-text',
                });
            }
        }

        const mainBtn = new St.Button({
            style_class: 'button clipboard-content-button',
            child: contentWidget,
            x_expand: true,
            reactive: true,
            can_focus: true,
        });
        mainBtn.connect('clicked', () => this.onSelect(item));

        // Pin button
        const pinIcon = new St.Icon({
            icon_name: item.pinned ? 'starred-symbolic' : 'non-starred-symbolic',
            style_class: item.pinned ? 'icon-pinned' : 'icon-unpinned',
            icon_size: 16,
        });
        const pinBtn = new St.Button({
            style_class: 'button icon-button pin-button',
            child: pinIcon,
            reactive: true,
            can_focus: true,
        });
        pinBtn.connect('clicked', () => {
            this.db.togglePin(item.id);
            this.refresh(searchQuery);
        });

        // Delete button
        const deleteIcon = new St.Icon({
            icon_name: 'edit-delete-symbolic',
            style_class: 'icon-delete',
            icon_size: 16,
        });
        const deleteBtn = new St.Button({
            style_class: 'button icon-button delete-button',
            child: deleteIcon,
            reactive: true,
            can_focus: true,
        });
        deleteBtn.connect('clicked', () => {
            this.db.deleteItem(item.id);
            this.refresh(searchQuery);
        });

        row.add_child(mainBtn);
        row.add_child(pinBtn);
        row.add_child(deleteBtn);
        this.listContainer.add_child(row);

        this.focusableItems.push(mainBtn, pinBtn, deleteBtn);
    }
}
