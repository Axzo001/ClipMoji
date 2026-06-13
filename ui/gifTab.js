import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import Pango from 'gi://Pango';

const GIF_LIMIT = 12;
const COLUMNS = 2;

export class GifTab {
    constructor(popup, settings, onSelectCallback) {
        this.popup = popup;
        this.settings = settings;
        this.onSelect = onSelectCallback;

        this._session = null;
        this._cancellable = null;
        this._tmpDir = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_tmp_dir(), 'clipmoji-gifs'])
        );
        this._ensureTmpDir();

        this.focusableItems = [];

        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container',
        });

        this._createUI();
    }

    _ensureTmpDir() {
        try {
            if (!this._tmpDir.query_exists(null)) {
                this._tmpDir.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`ClipMoji GifTab: Failed to create temp dir: ${e.message}`);
        }
    }

    _getSession() {
        if (!this._session) {
            this._session = new Soup.Session();
            this._session.timeout = 10;
        }
        return this._session;
    }

    _createUI() {
        this.scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style_class: 'clipmoji-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
        });

        this.container = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'gif-container',
        });

        this.scrollView.add_child(this.container);
        this.widget.add_child(this.scrollView);
    }

    refresh(searchQuery = '') {
        // Cancel any pending request
        if (this._cancellable && !this._cancellable.is_cancelled()) {
            this._cancellable.cancel();
        }
        this._cancellable = new Gio.Cancellable();

        this.container.destroy_all_children();
        this.focusableItems = [];

        const apiKey = this.settings.get_string('tenor-api-key');

        if (!apiKey) {
            this._showKeyWarning();
            return;
        }

        const encodedKey = encodeURIComponent(apiKey);
        let url;

        if (searchQuery) {
            const q = encodeURIComponent(searchQuery);
            url = `https://tenor.googleapis.com/v2/search?q=${q}&key=${encodedKey}&client_key=clipmoji&limit=${GIF_LIMIT}&media_filter=tinygif,nanogif`;
        } else {
            url = `https://tenor.googleapis.com/v2/featured?key=${encodedKey}&client_key=clipmoji&limit=${GIF_LIMIT}&media_filter=tinygif,nanogif`;
        }

        this._showLoading();
        this._fetchGifs(url);
    }

    _showLoading() {
        this.container.destroy_all_children();
        this.container.add_child(new St.Label({
            text: 'Loading GIFs…',
            style_class: 'loading-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
        }));
    }

    _showKeyWarning() {
        const box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'warning-container',
        });

        const title = new St.Label({
            text: '🔑 Tenor API Key Required',
            style_class: 'warning-title',
            x_align: Clutter.ActorAlign.CENTER,
        });

        const desc = new St.Label({
            text: 'Get a free API key at tenor.com/gifapi and add it in Extension Settings.',
            style_class: 'warning-desc',
            x_align: Clutter.ActorAlign.CENTER,
        });
        desc.clutter_text.line_wrap = true;
        desc.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;

        box.add_child(title);
        box.add_child(desc);
        this.container.add_child(box);
    }

    _fetchGifs(url) {
        try {
            const session = this._getSession();
            const message = Soup.Message.new('GET', url);

            session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                this._cancellable,
                (sess, result) => {
                    try {
                        if (this._cancellable?.is_cancelled()) return;
                        const bytes = sess.send_and_read_finish(result);
                        if (!bytes) {
                            this._showError('Empty response from Tenor');
                            return;
                        }
                        const json = JSON.parse(new TextDecoder().decode(bytes.get_data()));
                        if (json.error) {
                            this._showError(`Tenor error: ${json.error.message || json.error}`);
                            return;
                        }
                        this._renderGifs(json.results || []);
                    } catch (e) {
                        if (!this._cancellable?.is_cancelled()) {
                            this._showError(`Request failed: ${e.message}`);
                        }
                    }
                }
            );
        } catch (e) {
            this._showError(`Failed to start request: ${e.message}`);
        }
    }

    _showError(msg) {
        this.container.destroy_all_children();
        this.container.add_child(new St.Label({
            text: msg,
            style_class: 'error-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true,
        }));
    }

    _renderGifs(results) {
        this.container.destroy_all_children();
        this.focusableItems = [];

        if (results.length === 0) {
            this.container.add_child(new St.Label({
                text: 'No GIFs found',
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
            style_class: 'gif-grid',
        });

        results.forEach((gifItem, index) => {
            const row = Math.floor(index / COLUMNS);
            const col = index % COLUMNS;

            const formats = gifItem.media_formats || {};
            const gifUrl = formats.tinygif?.url || formats.gif?.url || '';
            const thumbUrl = formats.nanogif?.url || formats.tinygif?.url || '';

            const btn = new St.Button({
                style_class: 'button gif-cell',
                can_focus: true,
                reactive: true,
                x_expand: true,
            });
            btn.set_size(160, 110);

            btn.connect('clicked', () => {
                if (gifUrl) {
                    this.onSelect({ type: 'text', content: gifUrl });
                }
            });

            // Placeholder label
            const placeholder = new St.Label({
                text: '🎞️',
                style_class: 'gif-placeholder',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
            });
            btn.set_child(placeholder);

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);

            if (thumbUrl) {
                this._downloadAndSetThumb(thumbUrl, gifItem.id, btn);
            }
        });

        this.container.add_child(gridWidget);
    }

    _downloadAndSetThumb(url, id, btn) {
        const file = this._tmpDir.get_child(`${id}.gif`);

        if (file.query_exists(null)) {
            this._applyThumb(file.get_path(), btn);
            return;
        }

        try {
            const session = this._getSession();
            const message = Soup.Message.new('GET', url);
            const cancellable = new Gio.Cancellable();

            session.send_and_read_async(
                message,
                GLib.PRIORITY_LOW,
                cancellable,
                (sess, result) => {
                    try {
                        if (cancellable.is_cancelled() || this._cancellable?.is_cancelled()) return;
                        const bytes = sess.send_and_read_finish(result);
                        if (bytes) {
                            file.replace_contents(
                                bytes.get_data(),
                                null,
                                false,
                                Gio.FileCreateFlags.REPLACE_DESTINATION,
                                null
                            );
                            this._applyThumb(file.get_path(), btn);
                        }
                    } catch (_e) {
                        // Silent fail for thumbnails
                    }
                }
            );
        } catch (_e) {
            // Silent fail
        }
    }

    _applyThumb(filePath, btn) {
        try {
            const file = Gio.File.new_for_path(filePath);
            const icon = new St.Icon({
                gicon: new Gio.FileIcon({ file }),
                style_class: 'gif-thumbnail',
                x_expand: true,
                y_expand: true,
            });
            btn.set_child(icon);
        } catch (_e) {
            // Keep placeholder
        }
    }

    destroy() {
        if (this._cancellable && !this._cancellable.is_cancelled()) {
            this._cancellable.cancel();
        }
        this._cancellable = null;
        this._session = null;
    }
}
