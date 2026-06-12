import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

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

        // 4. Ignore Sensitive Data Switch Row
        const ignoreSensitiveRow = new Adw.SwitchRow({
            title: _('Ignore Sensitive Data'),
            subtitle: _('Do not capture copies marked as private or copied from password managers'),
            active: settings.get_boolean('ignore-sensitive')
        });
        settings.bind('ignore-sensitive', ignoreSensitiveRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(ignoreSensitiveRow);

        // 5. Enable GIFs Switch Row
        const enableGifsRow = new Adw.SwitchRow({
            title: _('Enable GIF Tab'),
            subtitle: _('Show the online GIF search tab in the picker popup'),
            active: settings.get_boolean('enable-gifs')
        });
        settings.bind('enable-gifs', enableGifsRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enableGifsRow);

        // 6. Tenor API Key Entry Row
        const tenorRow = new Adw.EntryRow({
            title: _('Tenor GIF API Key'),
            text: settings.get_string('tenor-api-key')
        });
        settings.bind('tenor-api-key', tenorRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(tenorRow);

        // Bind sensitivity of Tenor API Key entry to the Enable GIFs switch
        enableGifsRow.bind_property('active', tenorRow, 'sensitive', 
            GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE);
    }
}
