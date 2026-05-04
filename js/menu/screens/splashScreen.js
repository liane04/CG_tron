// Splash screen — extruded 3D title rises through the floor while the camera
// settles into place. PRESS ENTER pulses below; any key advances to the menu.

import * as THREE from 'three';
import { makeTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxConfirm, unlockAudio, startMusic } from '../audioManager.js';

var group = null;
var logo3d = null;        // multi-layer extruded title group
var logoCore = null;      // bright front layer (referenced for glitch jitter)
var subtitleMesh = null;
var pressMesh = null;
var taglineMesh = null;
var underlineLeft = null;
var underlineRight = null;
var pressVisible = true;
var pressTimer = 0;
var t = 0;
var enterCallback = null;
var glitchTimer = 0;

export function buildSplashScreen(scene, opts) {
    opts = opts || {};
    // Hardcoded so the splash always shows the new branding regardless of host opts
    var gameTitle = 'TRON';
    var subtitle = opts.subtitle || 'GRAND PRIX 2087';

    group = new THREE.Group();
    group.position.set(0, 0, 0);

    // ----- Extruded 3D logo (multi-layer fake depth) -----
    // We build one back-tone texture (magenta) and stack lightweight clones
    // for the extrusion, then a single bright front layer for the core.
    logo3d = new THREE.Group();
    logo3d.position.set(0, 5.4, 0);

    var backTemplate = makeTextPlane(gameTitle, {
        fontSize: 220, color: '#ff2bd6', glowColor: '#ff2bd6',
        worldHeight: 2.7, letterSpacing: 8, weight: '900', glowStrength: 0.6
    });
    // Hide the original — we only use it as a texture/geometry source
    backTemplate.visible = false;

    var depthLayers = 8;
    for (var i = 0; i < depthLayers; i++) {
        var k = i / (depthLayers - 1);
        var clone = new THREE.Mesh(
            backTemplate.geometry,
            new THREE.MeshBasicMaterial({
                map: backTemplate.material.map,
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                toneMapped: false,
                opacity: 0.12 + k * 0.35
            })
        );
        clone.position.z = -0.4 + i * 0.05;
        clone.renderOrder = i;
        logo3d.add(clone);
    }

    // Bright cyan/white front core layer (its own texture for the crisp glow)
    logoCore = makeTextPlane(gameTitle, {
        fontSize: 240, color: '#ffffff', glowColor: '#00eaff',
        worldHeight: 2.7, letterSpacing: 8, weight: '900', glowStrength: 0.7
    });
    logoCore.position.z = 0.05;
    logoCore.renderOrder = depthLayers + 1;
    logo3d.add(logoCore);
    // Start hidden below the floor and tiny, then rise into place
    logo3d.position.y = -3;
    logo3d.scale.set(0.6, 0.6, 0.6);
    group.add(logo3d);

    // Underline accent — two short cyan bars that slide together under the title
    underlineLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 0.07),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    underlineLeft.position.set(-7, 4.0, 0);
    underlineLeft.material.transparent = true;
    underlineLeft.material.opacity = 0;
    group.add(underlineLeft);

    underlineRight = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xff2bd6, toneMapped: false })
    );
    underlineRight.position.set(7, 4.0, 0);
    underlineRight.material.transparent = true;
    underlineRight.material.opacity = 0;
    group.add(underlineRight);

    // Subtitle
    subtitleMesh = makeTextPlane(subtitle, {
        fontSize: 72,
        color: '#ffe46b',
        glowColor: '#ff7a00',
        worldHeight: 0.55,
        letterSpacing: 10,
        weight: '700',
        glowStrength: 0.9
    });
    subtitleMesh.position.set(0, 3.4, 0.05);
    subtitleMesh.material.opacity = 0;
    group.add(subtitleMesh);

    // Tagline: small horizontally-spaced text below subtitle
    taglineMesh = makeTextPlane('// LIGHT  CYCLE  CHAMPIONSHIP //', {
        fontSize: 40,
        color: '#a0e8ff',
        glowColor: '#00eaff',
        worldHeight: 0.24,
        letterSpacing: 4,
        weight: '500',
        glowStrength: 0.7
    });
    taglineMesh.position.set(0, 2.8, 0.05);
    taglineMesh.material.opacity = 0;
    group.add(taglineMesh);

    // PRESS ENTER prompt
    pressMesh = makeTextPlane('PRESS  ENTER  TO  CONTINUE', {
        fontSize: 56,
        color: '#ffffff',
        glowColor: '#00eaff',
        worldHeight: 0.4,
        letterSpacing: 6,
        weight: '700',
        glowStrength: 1.1
    });
    pressMesh.position.set(0, 1.6, 0);
    pressMesh.material.opacity = 0;
    group.add(pressMesh);

    scene.add(group);
}

export function showSplash() {
    if (!group) return;
    group.visible = true;

    // Logo rises from below the floor with a settling overshoot
    logo3d.position.y = -3;
    logo3d.scale.set(0.6, 0.6, 0.6);
    tween(logo3d.position, { y: 5.4 }, {
        duration: 1.3, easing: Easing.easeOutBack
    });
    tween(logo3d.scale, { x: 1, y: 1, z: 1 }, {
        duration: 1.0, easing: Easing.easeOut, delay: 0.1
    });

    // Underlines slide in from the sides toward the centre
    underlineLeft.position.x = -10; underlineLeft.material.opacity = 0;
    underlineRight.position.x = 10; underlineRight.material.opacity = 0;
    tween(underlineLeft.position,  { x: -2.6 }, { duration: 0.8, easing: Easing.easeOut, delay: 0.7 });
    tween(underlineRight.position, { x:  2.6 }, { duration: 0.8, easing: Easing.easeOut, delay: 0.7 });
    tween(underlineLeft.material,  { opacity: 0.95 }, { duration: 0.4, delay: 0.7 });
    tween(underlineRight.material, { opacity: 0.95 }, { duration: 0.4, delay: 0.7 });

    // Subtitle + tagline fade in
    tween(subtitleMesh.material, { opacity: 1 }, { duration: 0.6, delay: 1.1 });
    tween(taglineMesh.material, { opacity: 0.85 }, { duration: 0.6, delay: 1.4 });

    // Press prompt fades in last
    tween(pressMesh.material, { opacity: 1 }, { duration: 0.6, delay: 1.7 });
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

    // Pulsing PRESS ENTER (smooth sinusoid rather than hard blink)
    if (pressMesh) {
        var p = 0.55 + 0.45 * (Math.sin(t * 3.2) * 0.5 + 0.5);
        pressMesh.material.opacity = p;
    }

    // Subtle floating animation on the logo group
    if (logo3d) {
        logo3d.position.y = 5.4 + Math.sin(t * 1.0) * 0.06;
        logo3d.rotation.y = Math.sin(t * 0.5) * 0.02;
    }

    // Random glitch — every ~3-6s briefly offset the front logo layer
    glitchTimer -= dt;
    if (glitchTimer <= 0) {
        glitchTimer = 3 + Math.random() * 3;
        if (logoCore) {
            var ox = (Math.random() - 0.5) * 0.08;
            var oy = (Math.random() - 0.5) * 0.04;
            tween(logoCore.position, { x: ox, y: oy }, {
                duration: 0.05, onComplete: function () {
                    tween(logoCore.position, { x: 0, y: 0 }, { duration: 0.1 });
                }
            });
        }
    }
}
