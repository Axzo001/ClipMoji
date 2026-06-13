import St from 'gi://St';
import Clutter from 'gi://Clutter';

const COLUMNS = 8; // Emoji grid columns

export class EmojiTab {
    constructor(popup, emojiData, onSelectCallback) {
        this.popup = popup;
        this.emojiData = emojiData;
        this.onSelect = onSelectCallback;

        this.currentCategory = null;
        this.focusableItems = [];

        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container',
        });

        this._createUI();
    }

    _createUI() {
        const categories = Object.keys(this.emojiData.emojis || {});
        this.currentCategory = categories[0] || 'Smileys';

        // Category bar (emoji icons)
        this.categoryBar = new St.BoxLayout({
            style_class: 'category-selector-bar',
            x_expand: true,
        });

        const categoryIcons = {
            'Smileys': '😀', 'People': '👋', 'Animals': '🐱',
            'Food': '🍕', 'Activities': '⚽', 'Travel': '✈️',
            'Objects': '💡', 'Symbols': '❤️', 'Flags': '🏳️',
        };

        this.categoryButtons = {};
        categories.forEach(cat => {
            const icon = categoryIcons[cat] || cat[0];
            const btn = new St.Button({
                label: icon,
                style_class: 'button category-button',
                can_focus: true,
            });
            btn.connect('clicked', () => this.selectCategory(cat));
            this.categoryBar.add_child(btn);
            this.categoryButtons[cat] = btn;
        });

        this.widget.add_child(this.categoryBar);

        // Scroll view
        this.scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style_class: 'clipmoji-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });

        this.gridContainer = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'emoji-grid-container',
        });

        this.scrollView.add_child(this.gridContainer);
        this.widget.add_child(this.scrollView);

        this.selectCategory(this.currentCategory);
    }

    selectCategory(category) {
        this.currentCategory = category;

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

        const emojisObj = this.emojiData.emojis || {};
        let items = [];

        if (searchQuery) {
            this.categoryBar.hide();
            const lowerQ = searchQuery.toLowerCase();
            Object.values(emojisObj).forEach(catItems => {
                catItems.forEach(item => {
                    if (item.name.toLowerCase().includes(lowerQ)) {
                        items.push(item);
                    }
                });
            });
        } else {
            this.categoryBar.show();
            items = emojisObj[this.currentCategory] || [];
        }

        if (items.length === 0) {
            this.gridContainer.add_child(new St.Label({
                text: 'No emojis found',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
            }));
            return;
        }

        this._renderGrid(items, COLUMNS, item => item.char, item => ({
            type: 'text',
            content: item.char,
        }), 'emoji-cell');
    }

    _renderGrid(items, columns, labelFn, itemFn, cellClass) {
        const gridLayout = new Clutter.GridLayout({
            column_spacing: 4,
            row_spacing: 4,
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'emoji-grid',
        });

        items.forEach((item, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const btn = new St.Button({
                label: labelFn(item),
                style_class: `button ${cellClass}`,
                can_focus: true,
                reactive: true,
            });
            btn.set_track_hover(true);
            btn.connect('clicked', () => this.onSelect(itemFn(item)));

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
