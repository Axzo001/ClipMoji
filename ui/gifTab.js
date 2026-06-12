import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import Pango from 'gi://Pango';

export class GifTab {
    constructor(popup, settings, onSelectCallback) {
        this.popup = popup;
        this.settings = settings;
        this.onSelect = onSelectCallback;
        
        this.session = new Soup.Session();
        this.tmpDir = Gio.File.new_for_path('/tmp/clipmoji');
        this._ensureTmpDir();

        this.widget = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'tab-content-container'
        });

        this._createUI();
        this.focusableItems = [];
        this.activeRequests = [];
    }

    _ensureTmpDir() {
        try {
            if (!this.tmpDir.query_exists(null)) {
                this.tmpDir.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to create temp directory: ${e.message}`);
        }
    }

    _createUI() {
        this.scrollView = new St.ScrollView({
            x_expand: true,
            y_expand: true,
            style_class: 'clipmoji-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC
        });

        this.container = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'gif-container'
        });

        this.scrollView.add_child(this.container);
        this.widget.add_child(this.scrollView);
    }

    refresh(searchQuery = '') {
        // Cancel any pending HTTP requests
        this.activeRequests.forEach(req => req.cancel());
        this.activeRequests = [];

        this.container.destroy_all_children();
        this.focusableItems = [];

        const apiKey = this.settings.get_string('tenor-api-key');

        if (!apiKey) {
            this._showKeyWarning();
            return;
        }

        if (!searchQuery) {
            // Show trending GIFs if search is empty
            this._fetchGifs('https://tenor.googleapis.com/v2/featured?key=' + apiKey + '&client_key=clipmoji&limit=12');
            return;
        }

        const encodedQuery = encodeURIComponent(searchQuery);
        const url = `https://tenor.googleapis.com/v2/search?q=${encodedQuery}&key=${apiKey}&client_key=clipmoji&limit=12`;
        this._fetchGifs(url);
    }

    _showKeyWarning() {
        const warningBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            y_expand: true,
            style_class: 'warning-container',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        const warningLabel = new St.Label({
            text: 'Tenor API Key Required',
            style_class: 'warning-title',
            x_align: Clutter.ActorAlign.CENTER
        });

        const infoLabel = new St.Label({
            text: 'Please set your free Tenor API Key in the Extension settings to search and paste GIFs.',
            style_class: 'warning-desc',
            x_align: Clutter.ActorAlign.CENTER
        });
        
        infoLabel.clutter_text.line_wrap = true;
        infoLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;

        warningBox.add_child(warningLabel);
        warningBox.add_child(infoLabel);
        this.container.add_child(warningBox);
    }

    _fetchGifs(url) {
        // Show loading state
        const loadingLabel = new St.Label({
            text: 'Searching Tenor GIFs...',
            style_class: 'loading-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.container.add_child(loadingLabel);

        try {
            const message = Soup.Message.new('GET', url);
            const cancelable = new Gio.Cancellable();
            this.activeRequests.push(cancelable);

            this.session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                cancelable,
                (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        if (bytes) {
                            const decoder = new TextDecoder('utf-8');
                            const jsonStr = decoder.decode(bytes.get_data());
                            const response = JSON.parse(jsonStr);
                            this._renderGifs(response.results || []);
                        }
                    } catch (e) {
                        // Don't show error if request was cancelled
                        if (!cancelable.is_cancelled()) {
                            this._showError(`Failed to fetch GIFs: ${e.message}`);
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
        const label = new St.Label({
            text: msg,
            style_class: 'error-label',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_expand: true
        });
        this.container.add_child(label);
    }

    _renderGifs(results) {
        this.container.destroy_all_children();
        this.focusableItems = [];

        if (results.length === 0) {
            const label = new St.Label({
                text: 'No GIFs found',
                style_class: 'empty-state-label',
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true
            });
            this.container.add_child(label);
            return;
        }

        const columns = 2;
        const gridLayout = new Clutter.GridLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            column_spacing: 6,
            row_spacing: 6
        });

        const gridWidget = new St.Widget({
            layout_manager: gridLayout,
            x_expand: true,
            style_class: 'gif-grid'
        });

        results.forEach((gifItem, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            // Get direct URL and preview URL
            const formats = gifItem.media_formats || {};
            const gifUrl = formats.tinygif?.url || formats.gif?.url || '';
            const thumbUrl = formats.nanogif?.url || formats.tinygif?.url || '';

            // Loading placeholder button
            const btn = new St.Button({
                style_class: 'button gif-cell',
                can_focus: true,
                reactive: true,
                x_expand: true,
                y_expand: true
            });
            
            // Set size for layout cell
            btn.set_size(150, 100);

            btn.connect('clicked', () => {
                if (gifUrl) {
                    this.onSelect({
                        type: 'text',
                        content: gifUrl
                    });
                }
            });

            gridLayout.attach(btn, col, row, 1, 1);
            this.focusableItems.push(btn);

            // Fetch and set the thumbnail icon asynchronously
            if (thumbUrl) {
                this._downloadThumbnail(thumbUrl, gifItem.id, (filePath) => {
                    try {
                        const file = Gio.File.new_for_path(filePath);
                        const fileIcon = new Gio.FileIcon({ file: file });
                        
                        const icon = new St.Icon({
                            gicon: fileIcon,
                            style_class: 'gif-thumbnail',
                            x_expand: true,
                            y_expand: true
                        });
                        
                        btn.set_child(icon);
                    } catch (err) {
                        console.error(`ClipMoji: Failed to apply GIF thumbnail: ${err.message}`);
                    }
                });
            }
        });

        this.container.add_child(gridWidget);
    }

    _downloadThumbnail(url, id, callback) {
        const file = this.tmpDir.get_child(`${id}.gif`);
        const filePath = file.get_path();

        // If already cached in /tmp, use it
        if (file.query_exists(null)) {
            callback(filePath);
            return;
        }

        try {
            const message = Soup.Message.new('GET', url);
            const cancelable = new Gio.Cancellable();
            this.activeRequests.push(cancelable);

            this.session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                cancelable,
                (session, result) => {
                    try {
                        const bytes = session.send_and_read_finish(result);
                        if (bytes && !cancelable.is_cancelled()) {
                            file.replace_contents(
                                bytes.get_data(),
                                null,
                                false,
                                Gio.FileCreateFlags.REPLACE_DESTINATION,
                                null
                            );
                            callback(filePath);
                        }
                    } catch (e) {
                        // Silent fail for thumbnail download
                    }
                }
            );
        } catch (e) {
            // Silent fail
        }
    }

    destroy() {
        this.activeRequests.forEach(req => req.cancel());
        this.activeRequests = [];
    }
}
