import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

export default class ClipMojiPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // 1. Create General Settings Page
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // 2. Create Settings Group
        const group = new Adw.PreferencesGroup({
            title: _('ClipMoji Preferences'),
            description: _('Configure clipboard history limits and online services.'),
        });
        page.add(group);

        // 3. History Size Spin Row
        const historyRow = new Adw.SpinRow({
            title: _('History Size'),
            subtitle: _('Maximum number of clipboard history items to retain'),
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 100,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('history-size')
            })
        });
        settings.bind('history-size', historyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(historyRow);

        // 4. Tenor API Key Entry Row
        const tenorRow = new Adw.EntryRow({
            title: _('Tenor GIF API Key'),
            text: settings.get_string('tenor-api-key')
        });
        settings.bind('tenor-api-key', tenorRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(tenorRow);
    }
}
