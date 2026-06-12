import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

/**
 * Simulates a Ctrl+V key press to paste content into the active application.
 */
export function simulatePaste() {
    try {
        const backend = Clutter.get_default_backend();
        if (!backend) {
            console.error('ClipMoji: Failed to get Clutter backend');
            return;
        }

        const seat = backend.get_default_seat();
        if (!seat) {
            console.error('ClipMoji: Failed to get Clutter seat');
            return;
        }

        const virtualKeyboard = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        if (!virtualKeyboard) {
            console.error('ClipMoji: Failed to create virtual keyboard device');
            return;
        }

        // GNOME/Clutter expects timestamps in microseconds.
        // Clutter.get_current_event_time() returns milliseconds, so we multiply by 1000.
        let eventTime = Clutter.get_current_event_time() * 1000;
        if (eventTime <= 0) {
            eventTime = GLib.get_monotonic_time();
        }

        // Simulate Ctrl+V keypress combination
        virtualKeyboard.notify_keyval(eventTime, Clutter.KEY_Control_L, Clutter.KeyState.PRESSED);
        virtualKeyboard.notify_keyval(eventTime + 1000, Clutter.KEY_v, Clutter.KeyState.PRESSED);
        
        virtualKeyboard.notify_keyval(eventTime + 2000, Clutter.KEY_v, Clutter.KeyState.RELEASED);
        virtualKeyboard.notify_keyval(eventTime + 3000, Clutter.KEY_Control_L, Clutter.KeyState.RELEASED);
    } catch (e) {
        console.error(`ClipMoji: Error simulating Ctrl+V keypress: ${e.message}`);
    }
}
