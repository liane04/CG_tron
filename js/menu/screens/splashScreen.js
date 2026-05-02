// Splash screen — game logo flies toward camera, "PRESS ENTER" pulses below.
// Any key press advances the state machine to the main menu.

import * as THREE from 'three';
import { makeTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxConfirm, unlockAudio, startMusic } from '../audioManager.js';

var group = null;
var logoMesh = null;
var subtitleMesh = null;
var pressMesh = null;
var pressVisible = true;
var pressTimer = 0;
var t = 0;
var enterCallback = null;

export function buildSplashScreen(scene, opts) {
    opts = opts || {};
    var gameTitle = opts.title || 'NEON DRIVE';
    var subtitle = opts.subtitle || 'GRAND PRIX 2087';

    group = new THREE.Group();
    group.position.set(0, 0, 0);

    // Logo
    logoMesh = makeTextPlane(gameTitle, {
        fontSize: 220, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 2.6
    });
    logoMesh.position.set(0, 5.2, 0);
    logoMesh.scale.set(0.05, 0.05, 0.05); // start tiny → flies toward camera
    group.add(logoMesh);

    // Subtitle
    subtitleMesh = makeTextPlane(subtitle, {
        fontSize: 80, color: '#ffe46b', glowColor: '#ff7a00', worldHeight: 0.5
    });
    subtitleMesh.position.set(0, 3.6, 0);
    subtitleMesh.material.opacity = 0;
    group.add(subtitleMesh);

    // PRESS ENTER prompt
    pressMesh = makeTextPlane('PRESS ENTER', {
        fontSize: 60, color: '#00eaff', glowColor: '#00eaff', worldHeight: 0.45
    });
    pressMesh.position.set(0, 1.8, 0);
    pressMesh.material.opacity = 0;
    group.add(pressMesh);

    scene.add(group);
}

export function showSplash() {
    if (!group) return;
    group.visible = true;

    // Logo flies in from far away
    tween(logoMesh.scale, { x: 1, y: 1, z: 1 }, {
        duration: 1.2, easing: Easing.easeOutBack
    });
    tween(logoMesh.position, { z: 0 }, {
        duration: 1.2, easing: Easing.easeOut
    });

    // Subtitle fades in shortly after
    tween(subtitleMesh.material, { opacity: 1 }, {
        duration: 0.6, easing: Easing.easeOut, delay: 0.7
    });

    // Press prompt fades in last
    tween(pressMesh.material, { opacity: 1 }, {
        duration: 0.6, easing: Easing.easeOut, delay: 1.2
    });
}

export function hideSplash() {
    if (group) group.visible = false;
}

export function getSplashHandler(onEnter) {
    enterCallback = onEnter;
    return {
        onEnter: function () {},
        onLeave: function () {},
        onKey: function (key) {
            // Any key advances. We only act once the logo has finished flying.
            if (!group || !group.visible) return false;
            unlockAudio();
            startMusic();
            sfxConfirm();
            if (enterCallback) enterCallback();
            return true;
        },
        onClick: function () {
            unlockAudio();
            startMusic();
            sfxConfirm();
            if (enterCallback) enterCallback();
        }
    };
}

export function updateSplash(dt) {
    if (!group || !group.visible) return;
    t += dt;
    pressTimer += dt;
    // Blink the press prompt at ~1.2 Hz
    if (pressTimer > 0.45) {
        pressTimer = 0;
        pressVisible = !pressVisible;
        if (pressMesh) pressMesh.material.opacity = pressVisible ? 1.0 : 0.05;
    }
    // Subtle floating animation on the logo
    if (logoMesh) logoMesh.position.y = 5.2 + Math.sin(t * 1.4) * 0.08;
}
