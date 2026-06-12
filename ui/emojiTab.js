import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class EmojiTab {
    constructor(popup, emojiData, onSelectCallback) {
        this.popup = popup;
        this.emojiData = emojiData; // The parsed JSON content of assets/emojis.json
        this.onSelect = onSelectCallback;
        
        this.currentCategory = 'Smileys';
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

        const categories = Object.keys(this.emojiData.emojis || {});
        
        // Define representative icons or short labels for each emoji category
        const categoryLabels = {
            "Smileys": "😀",
            "People": "👋",
            "Animals": "🐱",
            "Food": "🍇",
            "Activities": "🎮",
            "Travel": "🚗",
            "Objects": "💻",
            "Symbols": "❤️"
        };

        this.categoryButtons = {};

        categories.forEach(cat => {
            const btn = new St.Button({
                label: categoryLabels[cat] || cat.substring(0, 2),
                style_class: 'button category-button',
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
            style_class: 'emoji-grid-container'
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
        // Clear grid container
        this.gridContainer.destroy_all_children();
        this.focusableItems = [];

        // Determine list of emojis to show
        let listToShow = [];
        const emojisObj = this.emojiData.emojis || {};

        if (searchQuery) {
            this.categoryBar.hide(); // Hide category bar when searching
            
            // Flatten and filter emojis
            Object.keys(emojisObj).forEach(cat => {
                emojisObj[cat].forEach(item => {
                    if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                        listToShow.push(item);
                    }
                });
            });
        } else {
            this.categoryBar.show();
            listToShow = emojisObj[this.currentCategory] || [];
        }

        if (listToShow.length === 0) {
            const noItemsLabel = new St.Label({
                text: 'No matching emojis',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });
            this.gridContainer.add_child(noItemsLabel);
            return;
        }

        // Render as a grid
        const columns = 6;
        const gridLayout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            column_spacing: 6,
            row_spacing: 6
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'emoji-grid'
        });

        listToShow.forEach((item, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const btn = new St.Button({
                label: item.char,
                style_class: 'button emoji-cell',
                can_focus: true,
                reactive: true
            });

            // Set tooltips if possible using the "name" property
            btn.set_track_hover(true);
            btn.connect('clicked', () => {
                this.onSelect({
                    type: 'text',
                    content: item.char
                });
            });

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
