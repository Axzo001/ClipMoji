import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class KaomojiTab {
    constructor(popup, emojiData, onSelectCallback) {
        this.popup = popup;
        this.emojiData = emojiData;
        this.onSelect = onSelectCallback;
        
        this.currentCategory = 'Happy';
        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container'
        });

        this._createUI();
    }

    _createUI() {
        // Category Selector Bar
        this.categoryBar = new St.BoxLayout({
            style_class: 'category-selector-bar',
            x_expand: true
        });

        const categories = Object.keys(this.emojiData.kaomojis || {});
        
        // Define short emoji representation for each kaomoji category
        const categoryLabels = {
            "Happy": "😊",
            "Sad/Crying": "😭",
            "Angry": "😡",
            "Surprised": "😲",
            "Action": "¯\\_(ツ)_/¯"
        };

        this.categoryButtons = {};

        categories.forEach(cat => {
            const btn = new St.Button({
                label: categoryLabels[cat] || cat,
                style_class: 'button category-button kaomoji-cat-button',
                can_focus: true
            });
            
            btn.connect('clicked', () => {
                this.selectCategory(cat);
            });

            this.categoryBar.add_child(btn);
            this.categoryButtons[cat] = btn;
        });

        this.widget.add_child(this.categoryBar);

        // Scroll View
        this.scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style_class: 'clipmoji-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });

        this.gridContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'kaomoji-grid-container'
        });

        this.scrollView.add_child(this.gridContainer);
        this.widget.add_child(this.scrollView);

        this.focusableItems = [];
        this.selectCategory(this.currentCategory);
    }

    selectCategory(category) {
        this.currentCategory = category;
        
        // Highlight active category button
        Object.keys(this.categoryButtons).forEach(cat => {
            const btn = this.categoryButtons[cat];
            if (cat === category) {
                btn.add_style_class_name('active');
            } else {
                btn.remove_style_class_name('active');
            }
        });

        this.refresh();
    }

    refresh(searchQuery = '') {
        this.gridContainer.destroy_all_children();
        this.focusableItems = [];

        let listToShow = [];
        const kaomojisObj = this.emojiData.kaomojis || {};

        if (searchQuery) {
            this.categoryBar.hide();
            
            // Flatten and filter
            Object.keys(kaomojisObj).forEach(cat => {
                kaomojisObj[cat].forEach(item => {
                    if (item.toLowerCase().includes(searchQuery.toLowerCase())) {
                        listToShow.push(item);
                    }
                });
            });
        } else {
            this.categoryBar.show();
            listToShow = kaomojisObj[this.currentCategory] || [];
        }

        if (listToShow.length === 0) {
            const noItemsLabel = new St.Label({
                text: 'No matching kaomojis',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });
            this.gridContainer.add_child(noItemsLabel);
            return;
        }

        // Render as a 2-column grid since kaomojis are wide strings
        const columns = 2;
        const gridLayout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            column_spacing: 6,
            row_spacing: 6
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'kaomoji-grid'
        });

        listToShow.forEach((kaomojiStr, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const btn = new St.Button({
                label: kaomojiStr,
                style_class: 'button kaomoji-cell',
                can_focus: true,
                reactive: true,
                x_expand: true
            });

            btn.connect('clicked', () => {
                this.onSelect({
                    type: 'text',
                    content: kaomojiStr
                });
            });

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
