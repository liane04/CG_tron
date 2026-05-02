// Persisted user preferences for the menu and game.

var KEY = 'neonDrive.settings.v1';

var defaults = {
    audio: {
        music: 0.6,
        sfx: 0.8,
        muted: false
    },
    visual: {
        quality: 'high',           // 'low' | 'medium' | 'high'
        cameraMode: 'perspective'  // 'perspective' | 'orthographic'
    },
    controls: {
        layout: 'wasd'             // 'wasd' | 'arrows'
    },
    garage: {
        vehicleId: 'mota',
        colorId: 'cyan'
    },
    track: {
        mapId: 'space'
    }
};

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function merge(base, patch) {
    var out = deepClone(base);
    Object.keys(patch || {}).forEach(function (k) {
        if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k])) {
            out[k] = merge(out[k] || {}, patch[k]);
        } else {
            out[k] = patch[k];
        }
    });
    return out;
}

export function loadSettings() {
    try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return deepClone(defaults);
        var parsed = JSON.parse(raw);
        return merge(defaults, parsed);
    } catch (e) {
        return deepClone(defaults);
    }
}

export function saveSettings(settings) {
    try {
        localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (e) { /* quota / private mode — ignore */ }
}

export function resetSettings() {
    return deepClone(defaults);
}
