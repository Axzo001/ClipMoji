import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import GLib from 'gi://GLib';

export default class ClipMojiPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(700, 720);
        const settings = this.getSettings();

        // ── Page: General ───────────────────────────────────────────────────
        const generalPage = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(generalPage);

        // Clipboard group
        const clipGroup = new Adw.PreferencesGroup({
            title: _('Clipboard History'),
            description: _('Configure what ClipMoji captures and keeps.'),
        });
        generalPage.add(clipGroup);

        const historyRow = new Adw.SpinRow({
            title: _('History Size'),
            subtitle: _('Maximum number of clipboard entries to retain (pinned items excluded)'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 200,
                step_increment: 5,
                page_increment: 25,
                value: settings.get_int('history-size'),
            }),
        });
        settings.bind('history-size', historyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        clipGroup.add(historyRow);

        const ignoreSensitiveRow = new Adw.SwitchRow({
            title: _('Ignore Sensitive Data'),
            subtitle: _('Skip clipboard entries marked as private by password managers (KeePassXC, KDE Wallet)'),
        });
        settings.bind('ignore-sensitive', ignoreSensitiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        clipGroup.add(ignoreSensitiveRow);

        // GIF group
        const gifGroup = new Adw.PreferencesGroup({
            title: _('GIF Search'),
            description: _('Configure the online GIF search tab (requires a free Tenor API key).'),
        });
        generalPage.add(gifGroup);

        const enableGifsRow = new Adw.SwitchRow({
            title: _('Enable GIF Tab'),
            subtitle: _('Show the Tenor GIF search tab in the popup'),
        });
        settings.bind('enable-gifs', enableGifsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        gifGroup.add(enableGifsRow);

        const tenorRow = new Adw.EntryRow({
            title: _('Tenor GIF API Key'),
            show_apply_button: true,
        });
        tenorRow.set_text(settings.get_string('tenor-api-key'));
        tenorRow.connect('apply', () => {
            settings.set_string('tenor-api-key', tenorRow.get_text().trim());
        });
        settings.bind('enable-gifs', tenorRow, 'sensitive', Gio.SettingsBindFlags.GET);
        gifGroup.add(tenorRow);

        // Help row for Tenor
        const tenorHelpRow = new Adw.ActionRow({
            title: _('Get a free Tenor API key'),
            subtitle: _('Visit tenor.com/gifapi → click "Get Started" → copy your API key'),
            activatable: true,
        });
        const linkIcon = new Gtk.Image({
            icon_name: 'external-link-symbolic',
            pixel_size: 16,
        });
        tenorHelpRow.add_suffix(linkIcon);
        tenorHelpRow.connect('activated', () => {
            Gtk.show_uri(window, 'https://tenor.com/gifapi', GLib.CURRENT_TIME);
        });
        settings.bind('enable-gifs', tenorHelpRow, 'sensitive', Gio.SettingsBindFlags.GET);
        gifGroup.add(tenorHelpRow);

        // ── Page: Shortcuts ─────────────────────────────────────────────────
        const shortcutsPage = new Adw.PreferencesPage({
            title: _('Shortcuts'),
            icon_name: 'input-keyboard-symbolic',
        });
        window.add(shortcutsPage);

        const shortcutGroup = new Adw.PreferencesGroup({
            title: _('Keyboard Shortcuts'),
            description: _('Click a row to record a new shortcut. Press Backspace or Delete to clear.'),
        });
        shortcutsPage.add(shortcutGroup);

        this._addShortcutRow(shortcutGroup, settings, window,
            'shortcut-clipboard',
            _('Open Clipboard History'),
            _('Default: Ctrl+Super+V')
        );

        this._addShortcutRow(shortcutGroup, settings, window,
            'shortcut-emoji',
            _('Open Emoji / Symbol Picker'),
            _('Default: Ctrl+Super+. or Ctrl+Super+Space')
        );

        // Shortcut format info
        const infoGroup = new Adw.PreferencesGroup();
        shortcutsPage.add(infoGroup);

        const infoRow = new Adw.ActionRow({
            title: _('Shortcut Format Reference'),
            subtitle: _('Examples: [Control][Super]v  •  [Control][Alt]space  •  [Shift]F10\n'
                + 'Modifiers: [Control]  [Super]  [Alt]  [Shift]'),
        });
        infoGroup.add(infoRow);

        // ── Page: About ─────────────────────────────────────────────────────
        const aboutPage = new Adw.PreferencesPage({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });
        window.add(aboutPage);

        const aboutGroup = new Adw.PreferencesGroup({ title: _('ClipMoji') });
        aboutPage.add(aboutGroup);

        const versionRow = new Adw.ActionRow({
            title: _('Version'),
            subtitle: '1.0',
        });
        aboutGroup.add(versionRow);

        const githubRow = new Adw.ActionRow({
            title: _('Source Code'),
            subtitle: _('github.com/Axzo001/ClipMoji'),
            activatable: true,
        });
        githubRow.add_suffix(new Gtk.Image({ icon_name: 'external-link-symbolic', pixel_size: 16 }));
        githubRow.connect('activated', () => {
            Gtk.show_uri(window, 'https://github.com/Axzo001/ClipMoji', GLib.CURRENT_TIME);
        });
        aboutGroup.add(githubRow);

        const issueRow = new Adw.ActionRow({
            title: _('Report an Issue'),
            subtitle: _('github.com/Axzo001/ClipMoji/issues'),
            activatable: true,
        });
        issueRow.add_suffix(new Gtk.Image({ icon_name: 'external-link-symbolic', pixel_size: 16 }));
        issueRow.connect('activated', () => {
            Gtk.show_uri(window, 'https://github.com/Axzo001/ClipMoji/issues', GLib.CURRENT_TIME);
        });
        aboutGroup.add(issueRow);
    }

    _addShortcutRow(group, settings, window, key, title, subtitle) {
        const currentValues = settings.get_strv(key);
        const currentShortcut = currentValues[0] ?? '';

        const row = new Adw.ActionRow({ title, subtitle });

        // Display the current shortcut accelerator
        const accelLabel = new Gtk.ShortcutLabel({
            accelerator: currentShortcut || '',
            disabled_text: _('Disabled'),
            valign: Gtk.Align.CENTER,
        });

        const editButton = new Gtk.Button({
            icon_name: 'edit-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: _('Click to record shortcut'),
        });

        const clearButton = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: _('Clear shortcut'),
        });

        // Update display when settings change externally
        settings.connect(`changed::${key}`, () => {
            const vals = settings.get_strv(key);
            accelLabel.set_accelerator(vals[0] ?? '');
        });

        editButton.connect('clicked', () => {
            this._showShortcutDialog(window, title, key, settings, accelLabel);
        });

        clearButton.connect('clicked', () => {
            settings.set_strv(key, []);
            accelLabel.set_accelerator('');
        });

        row.add_suffix(accelLabel);
        row.add_suffix(editButton);
        row.add_suffix(clearButton);
        group.add(row);
    }

    _showShortcutDialog(parentWindow, title, settingsKey, settings, accelLabel) {
        const dialog = new Adw.Dialog({
            title: _('Set Shortcut'),
            content_width: 400,
            content_height: 200,
        });

        const toolbarView = new Adw.ToolbarView();
        dialog.set_child(toolbarView);

        const header = new Adw.HeaderBar({ show_end_title_buttons: false });
        toolbarView.add_top_bar(header);

        const content = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 16,
            margin_top: 24,
            margin_bottom: 24,
            margin_start: 24,
            margin_end: 24,
            valign: Gtk.Align.CENTER,
        });
        toolbarView.set_content(content);

        const label = new Gtk.Label({
            label: `<b>${_('Press your desired key combination for')}</b>\n${title}`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            wrap: true,
        });
        content.append(label);

        const hint = new Gtk.Label({
            label: _('Press Backspace or Delete to clear. Press Escape to cancel.'),
            css_classes: ['dim-label', 'caption'],
            justify: Gtk.Justification.CENTER,
            wrap: true,
        });
        content.append(hint);

        // Key capture controller
        const keyController = new Gtk.EventControllerKey();
        dialog.add_controller(keyController);

        keyController.connect('key-pressed', (_ctrl, keyval, keycode, state) => {
            // Filter out standalone modifier presses
            const modifiers = [
                Gtk.accelerator_get_default_mod_mask(),
                0xffe1, 0xffe2, 0xffe3, 0xffe4,  // Shift L/R
                0xffe5, 0xffe6,                    // Caps Lock
                0xffe7, 0xffe8,                    // Meta L/R
                0xffe9, 0xffea,                    // Alt L/R
                0xffeb, 0xffec,                    // Super L/R
                0xffed, 0xffee,                    // Hyper
                0xffe1, 0xffe2,                    // Shift
            ];

            // Clear on Backspace or Delete
            if (keyval === Gtk.KEY_BackSpace || keyval === Gtk.KEY_Delete) {
                settings.set_strv(settingsKey, []);
                accelLabel.set_accelerator('');
                dialog.close();
                return true;
            }

            // Cancel on Escape
            if (keyval === Gtk.KEY_Escape) {
                dialog.close();
                return true;
            }

            // Ignore pure modifier keys
            const cleanMask = state & Gtk.accelerator_get_default_mod_mask();
            if (!cleanMask && (keyval === Gtk.KEY_Shift_L || keyval === Gtk.KEY_Shift_R ||
                keyval === Gtk.KEY_Control_L || keyval === Gtk.KEY_Control_R ||
                keyval === Gtk.KEY_Alt_L || keyval === Gtk.KEY_Alt_R ||
                keyval === Gtk.KEY_Super_L || keyval === Gtk.KEY_Super_R)) {
                return false;
            }

            // Build accelerator string
            const accel = Gtk.accelerator_name(keyval, cleanMask);
            if (accel && Gtk.accelerator_valid(keyval, cleanMask)) {
                settings.set_strv(settingsKey, [accel]);
                accelLabel.set_accelerator(accel);
                dialog.close();
            }

            return true;
        });

        dialog.present(parentWindow);
    }
}
