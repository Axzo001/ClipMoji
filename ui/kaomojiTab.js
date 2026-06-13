import St from 'gi://St';
import Clutter from 'gi://Clutter';

const COLUMNS = 2;

export class KaomojiTab {
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
        const categories = Object.keys(this.emojiData.kaomojis || {});
        this.currentCategory = categories[0] || 'Happy';

        const categoryIcons = {
            'Happy': '😊', 'Sad': '😢', 'Sad/Crying': '😭',
            'Angry': '😡', 'Surprised': '😲', 'Action': '🏃',
            'Love': '💕', 'Greeting': '👋',
        };

        // Category bar
        this.categoryBar = new St.BoxLayout({
            style_class: 'category-selector-bar',
            x_expand: true,
        });

        this.categoryButtons = {};
        categories.forEach(cat => {
            const icon = categoryIcons[cat] || cat[0];
            const btn = new St.Button({
                label: icon,
                style_class: 'button category-button kaomoji-cat-button',
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
            style_class: 'kaomoji-grid-container',
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

        const kaomojisObj = this.emojiData.kaomojis || {};
        let items = [];

        if (searchQuery) {
            this.categoryBar.hide();
            const lowerQ = searchQuery.toLowerCase();
            Object.values(kaomojisObj).forEach(catItems => {
                catItems.forEach(k => {
                    if (k.toLowerCase().includes(lowerQ)) {
                        items.push(k);
                    }
                });
            });
        } else {
            this.categoryBar.show();
            items = kaomojisObj[this.currentCategory] || [];
        }

        if (items.length === 0) {
            this.gridContainer.add_child(new St.Label({
                text: 'No kaomojis found',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
            }));
            return;
        }

        const gridLayout = new Clutter.GridLayout({
            column_spacing: 6,
            row_spacing: 6,
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'kaomoji-grid',
        });

        items.forEach((k, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;

            const btn = new St.Button({
                label: k,
                style_class: 'button kaomoji-cell',
                can_focus: true,
                reactive: true,
                x_expand: true,
            });
            btn.connect('clicked', () => this.onSelect({ type: 'text', content: k }));

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
