import St from 'gi://St';
import Clutter from 'gi://Clutter';

const COLUMNS = 8;

export class SymbolsTab {
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
        const categories = Object.keys(this.emojiData.symbols || {});
        this.currentCategory = categories[0] || 'General';

        const categoryIcons = {
            'General': '★', 'Math/Science': '∑', 'Currency': '€',
            'Arrows': '→', 'Punctuation': '«', 'Latin': 'Ä',
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
                style_class: 'button category-button symbol-cat-button',
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
            style_class: 'symbol-grid-container',
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

        const symbolsObj = this.emojiData.symbols || {};
        let items = [];

        if (searchQuery) {
            this.categoryBar.hide();
            // For single-char symbols, search if the query matches any symbol directly
            // or search in category name
            Object.entries(symbolsObj).forEach(([cat, syms]) => {
                syms.forEach(sym => {
                    if (sym.includes(searchQuery) ||
                        cat.toLowerCase().includes(searchQuery.toLowerCase())) {
                        items.push(sym);
                    }
                });
            });
            // Deduplicate
            items = [...new Set(items)];
        } else {
            this.categoryBar.show();
            items = symbolsObj[this.currentCategory] || [];
        }

        if (items.length === 0) {
            this.gridContainer.add_child(new St.Label({
                text: 'No symbols found',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
            }));
            return;
        }

        const gridLayout = new Clutter.GridLayout({
            column_spacing: 4,
            row_spacing: 4,
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'symbol-grid',
        });

        items.forEach((sym, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;

            const btn = new St.Button({
                label: sym,
                style_class: 'button symbol-cell',
                can_focus: true,
                reactive: true,
            });
            btn.connect('clicked', () => this.onSelect({ type: 'text', content: sym }));

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
