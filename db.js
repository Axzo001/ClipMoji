import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class ClipMojiDatabase {
    constructor() {
        this.configDir = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/clipmoji`);
        this.cacheDir = Gio.File.new_for_path(`${GLib.get_user_cache_dir()}/clipmoji`);
        this.dbFile = this.configDir.get_child('history.json');
        
        this._ensureDirectories();
        this.history = this._loadHistory();
        this.maxSize = 25; // Default limit, will be updated by settings
        this._saveTimeoutId = 0;
    }

    _ensureDirectories() {
        try {
            if (!this.configDir.query_exists(null)) {
                this.configDir.make_directory_with_parents(null);
            }
            if (!this.cacheDir.query_exists(null)) {
                this.cacheDir.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to create directories: ${e.message}`);
        }
    }

    _loadHistory() {
        try {
            if (this.dbFile.query_exists(null)) {
                const [success, contents] = this.dbFile.load_contents(null);
                if (success) {
                    const decoder = new TextDecoder('utf-8');
                    const jsonStr = decoder.decode(contents);
                    return JSON.parse(jsonStr);
                }
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to load history, starting fresh: ${e.message}`);
        }
        return [];
    }

    save() {
        if (this._saveTimeoutId) {
            GLib.source_remove(this._saveTimeoutId);
            this._saveTimeoutId = 0;
        }

        this._saveTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._saveTimeoutId = 0;
            this._writeToDisk();
            return GLib.SOURCE_REMOVE;
        });
    }

    flush() {
        if (this._saveTimeoutId) {
            GLib.source_remove(this._saveTimeoutId);
            this._saveTimeoutId = 0;
        }
        this._writeToDisk();
    }

    _writeToDisk() {
        try {
            const encoder = new TextEncoder();
            const jsonStr = JSON.stringify(this.history, null, 2);
            const bytes = encoder.encode(jsonStr);
            
            this.dbFile.replace_contents(
                bytes,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );
        } catch (e) {
            console.error(`ClipMoji: Failed to write history to disk: ${e.message}`);
        }
    }

    addText(text) {
        if (!text || !text.trim()) return null;
        
        // Remove existing identical content to avoid duplicates (and move it to top)
        const existingIndex = this.history.findIndex(item => item.type === 'text' && item.content === text);
        let pinned = false;
        if (existingIndex !== -1) {
            pinned = this.history[existingIndex].pinned;
            this.history.splice(existingIndex, 1);
        }

        const newItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
            type: 'text',
            content: text,
            pinned: pinned,
            timestamp: Date.now()
        };

        this.history.unshift(newItem);
        this._truncate();
        this.save();
        return newItem;
    }

    addImage(gbytes) {
        if (!gbytes) return null;

        const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
        const fileName = `${id}.png`;
        const file = this.cacheDir.get_child(fileName);
        const filePath = file.get_path();

        try {
            file.replace_contents(
                gbytes.get_data(),
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );

            const newItem = {
                id: id,
                type: 'image',
                content: filePath,
                pinned: false,
                timestamp: Date.now()
            };

            this.history.unshift(newItem);
            this._truncate();
            this.save();
            return newItem;
        } catch (e) {
            console.error(`ClipMoji: Failed to save clipboard image: ${e.message}`);
            return null;
        }
    }

    togglePin(id) {
        const item = this.history.find(i => i.id === id);
        if (item) {
            item.pinned = !item.pinned;
            this.save();
        }
        return item;
    }

    deleteItem(id) {
        const index = this.history.findIndex(i => i.id === id);
        if (index !== -1) {
            const item = this.history[index];
            // If it's an image, clean up the file
            if (item.type === 'image') {
                this._deleteImageFile(item.content);
            }
            this.history.splice(index, 1);
            this.save();
        }
    }

    _deleteImageFile(filePath) {
        try {
            const file = Gio.File.new_for_path(filePath);
            if (file.query_exists(null)) {
                file.delete(null);
            }
        } catch (e) {
            console.error(`ClipMoji: Failed to delete image file ${filePath}: ${e.message}`);
        }
    }

    clearAll() {
        // Only keep pinned items
        const pinnedItems = this.history.filter(item => item.pinned);
        const unpinnedItems = this.history.filter(item => !item.pinned);

        // Delete unpinned image files from disk
        unpinnedItems.forEach(item => {
            if (item.type === 'image') {
                this._deleteImageFile(item.content);
            }
        });

        this.history = pinnedItems;
        this.save();
    }

    _truncate() {
        // Separate pinned and unpinned
        const pinned = this.history.filter(item => item.pinned);
        const unpinned = this.history.filter(item => !item.pinned);

        const allowedUnpinnedCount = Math.max(0, this.maxSize - pinned.length);
        
        // Items to delete
        const toDelete = unpinned.slice(allowedUnpinnedCount);
        toDelete.forEach(item => {
            if (item.type === 'image') {
                this._deleteImageFile(item.content);
            }
        });

        // Reassemble history
        this.history = [...pinned, ...unpinned.slice(0, allowedUnpinnedCount)];
    }

    setMaxSize(size) {
        this.maxSize = size;
        this._truncate();
        this.save();
    }
}
