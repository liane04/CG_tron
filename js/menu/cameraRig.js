// Single shared camera that animates between named anchors. Each menu screen
// declares its anchor; transitions are tweened via the tween utility, so the
// camera never teleports.

import * as THREE from 'three';
import { tween, Easing } from './tween.js';

var camera = null;
var lookTarget = new THREE.Vector3(0, 4, 0);
var anchors = {};
var currentAnchor = null;

export var ANCHORS = {
    SPLASH: {
        position: new THREE.Vector3(0, 4, 18),
        target:   new THREE.Vector3(0, 5, 0)
    },
    MAIN: {
        position: new THREE.Vector3(0, 5, 18),
        target:   new THREE.Vector3(0, 4, 0)
    },
    GARAGE: {
        position: new THREE.Vector3(0, 3.5, 11),
        target:   new THREE.Vector3(0, 1.6, 0)
    },
    SETTINGS: {
        position: new THREE.Vector3(0, 5.5, 12),
        target:   new THREE.Vector3(0, 4.5, 0)
    },
    TRACK_SELECT: {
        position: new THREE.Vector3(0, 5, 16),
        target:   new THREE.Vector3(0, 4, 0)
    },
    GAME_HANDOFF: {
        // Camera sweeps forward along the road as the menu hands off to the game
        position: new THREE.Vector3(0, 2.5, -25),
        target:   new THREE.Vector3(0, 2, -80)
    }
};

export function initCameraRig(cam) {
    camera = cam;
    setAnchorImmediate('SPLASH');
}

export function setAnchorImmediate(name) {
    var a = ANCHORS[name];
    if (!a) return;
    camera.position.copy(a.position);
    lookTarget.copy(a.target);
    camera.lookAt(lookTarget);
    currentAnchor = name;
}

export function moveTo(name, opts) {
    var a = ANCHORS[name];
    if (!a) return null;
    opts = opts || {};
    var duration = opts.duration != null ? opts.duration : 0.9;
    var easing = opts.easing || Easing.easeInOut;

    // Tween position
    tween(camera.position, { x: a.position.x, y: a.position.y, z: a.position.z }, {
        duration: duration,
        easing: easing,
        onComplete: opts.onComplete || null
    });
    // Tween look-at target separately so the camera curves smoothly
    tween(lookTarget, { x: a.target.x, y: a.target.y, z: a.target.z }, {
        duration: duration,
        easing: easing,
        onUpdate: function () { camera.lookAt(lookTarget); }
    });
    currentAnchor = name;
    return name;
}

// Should be called every frame so lookAt is correct even when no tween is active.
export function tickCameraRig() {
    if (camera) camera.lookAt(lookTarget);
}

export function getCurrentAnchor() { return currentAnchor; }
export function getLookTarget() { return lookTarget; }
