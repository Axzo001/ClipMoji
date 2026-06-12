import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

export class SymbolsTab {
    constructor(popup, emojiData, onSelectCallback) {
        this.popup = popup;
        this.emojiData = emojiData;
        this.onSelect = onSelectCallback;
        
        this.currentCategory = 'General';
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

        const categories = Object.keys(this.emojiData.symbols || {});
        
        // Short labels/symbols representing each category
        const categoryLabels = {
            "General": "★",
            "Math/Science": "±",
            "Currency": "$"
        };

        this.categoryButtons = {};

        categories.forEach(cat => {
            const btn = new St.Button({
                label: categoryLabels[cat] || cat,
                style_class: 'button category-button symbol-cat-button',
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
            style_class: 'symbol-grid-container'
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
        const symbolsObj = this.emojiData.symbols || {};

        if (searchQuery) {
            this.categoryBar.hide();
            
            // Flatten and filter
            Object.keys(symbolsObj).forEach(cat => {
                symbolsObj[cat].forEach(item => {
                    // Try to filter symbols. Since symbols are single chars, search by character
                    // or if they are in the list we match them.
                    if (item.includes(searchQuery) || searchQuery.length === 1 && item === searchQuery) {
                        listToShow.push(item);
                    }
                });
            });
        } else {
            this.categoryBar.show();
            listToShow = symbolsObj[this.currentCategory] || [];
        }

        if (listToShow.length === 0) {
            const noItemsLabel = new St.Label({
                text: 'No matching symbols',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });
            this.gridContainer.add_child(noItemsLabel);
            return;
        }

        // Render as a 6-column grid
        const columns = 6;
        const gridLayout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            column_spacing: 6,
            row_spacing: 6
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'symbol-grid'
        });

        listToShow.forEach((symbolStr, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            const btn = new St.Button({
                label: symbolStr,
                style_class: 'button symbol-cell',
                can_focus: true,
                reactive: true
            });

            btn.connect('clicked', () => {
                this.onSelect({
                    type: 'text',
                    content: symbolStr
                });
            });

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);
        });

        this.gridContainer.add_child(gridWidget);
    }
}
