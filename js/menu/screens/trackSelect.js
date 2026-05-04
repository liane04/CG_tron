// Track Select — each map is presented as a 3D "portal" with a small live
// diorama of that map (themed sky, grid, and procedural feature) framed by
// neon brackets. The selected portal expands and rotates slightly forward;
// the rest dim and fall back to give it presence.

import * as THREE from 'three';
import { makeTextPlane, updateTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../audioManager.js';
import { mapas } from '../../mapas.js';

var group = null;
var cards = [];
var selectedIndex = 0;
var titleLabel = null;
var hintLabel = null;
var dynamicHint = null;
var t = 0;
var callbacks = {};

function cssToHex(css) {
    if (!css) return 0xffffff;
    if (css[0] === '#') return parseInt(css.slice(1), 16);
    return 0xffffff;
}

// Build a small 3D diorama for each map — keeps each one visually distinct.
function buildDiorama(mapa) {
    var color = cssToHex(mapa.corCSS);
    var d = new THREE.Group();

    // Themed sky disc behind the mini-arena
    var sky = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 1.2),
        new THREE.MeshBasicMaterial({
            color: mapa.corFundo, transparent: true, opacity: 0.92,
            depthWrite: false, side: THREE.DoubleSide, toneMapped: false
        })
    );
    sky.position.set(0, 0.3, -0.05);
    d.add(sky);

    // Themed floor — a tilted grid plane
    var floor = new THREE.GridHelper(2.4, 14, color, color);
    floor.material.transparent = true;
    floor.material.opacity = 0.85;
    floor.material.toneMapped = false;
    floor.rotation.x = -Math.PI / 2.6;
    floor.position.set(0, -0.45, 0);
    d.add(floor);

    // Map-specific feature
    if (mapa.id === 'space') {
        // Floating asteroid + ring
        var ast = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.2, 0),
            new THREE.MeshStandardMaterial({ color: 0x223355, roughness: 0.6, metalness: 0.4 })
        );
        ast.position.set(0.3, 0.3, 0);
        d.add(ast);
        var ring = new THREE.Mesh(
            new THREE.RingGeometry(0.35, 0.42, 32),
            new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, toneMapped: false })
        );
        ring.rotation.x = Math.PI / 3;
        ring.position.set(0.3, 0.3, 0);
        d.add(ring);
        // Tiny stars
        var sgeo = new THREE.BufferGeometry();
        var sp = new Float32Array(80 * 3);
        for (var i = 0; i < 80; i++) {
            sp[i*3]   = (Math.random() - 0.5) * 2;
            sp[i*3+1] = Math.random() * 0.9 - 0.05;
            sp[i*3+2] = -0.2 + Math.random() * 0.05;
        }
        sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        d.add(new THREE.Points(sgeo, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.025, transparent: true, opacity: 0.9, depthWrite: false
        })));
        d.userData.spinTarget = ast;
    } else if (mapa.id === 'deserto') {
        // Dunes — two layered triangles using raw vertex buffers
        function makeTriangle(verts, color) {
            var positions = new Float32Array(9);
            for (var i = 0; i < 3; i++) {
                positions[i*3]   = verts[i].x;
                positions[i*3+1] = verts[i].y;
                positions[i*3+2] = verts[i].z;
            }
            var geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color: color, side: THREE.DoubleSide, toneMapped: false
            }));
        }
        d.add(makeTriangle([
            new THREE.Vector3(-1.2, -0.45, 0),
            new THREE.Vector3(-0.5, -0.05, 0),
            new THREE.Vector3(0.2, -0.45, 0)
        ], 0xc8a060));
        d.add(makeTriangle([
            new THREE.Vector3(-0.2, -0.45, 0),
            new THREE.Vector3(0.4, 0.05, 0),
            new THREE.Vector3(1.0, -0.45, 0)
        ], 0x8b6914));
        // Sun
        var sun = new THREE.Mesh(
            new THREE.CircleGeometry(0.22, 32),
            new THREE.MeshBasicMaterial({ color: 0xffe46b, toneMapped: false })
        );
        sun.position.set(0.4, 0.3, -0.02);
        d.add(sun);
        d.userData.spinTarget = sun;
    } else if (mapa.id === 'jungle') {
        // A few stylised trees (cone + cylinder)
        for (var k = -1; k <= 1; k++) {
            var trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8),
                new THREE.MeshBasicMaterial({ color: 0x4a2a10, toneMapped: false })
            );
            trunk.position.set(k * 0.5, -0.25, 0);
            d.add(trunk);
            var leaves = new THREE.Mesh(
                new THREE.ConeGeometry(0.18, 0.4, 8),
                new THREE.MeshBasicMaterial({ color: 0x22cc44, toneMapped: false })
            );
            leaves.position.set(k * 0.5, 0.05, 0);
            d.add(leaves);
        }
        // Distant moon glow
        var moon = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 32),
            new THREE.MeshBasicMaterial({ color: 0x59ff7c, transparent: true, opacity: 0.6, toneMapped: false })
        );
        moon.position.set(-0.5, 0.45, -0.04);
        d.add(moon);
    } else if (mapa.id === 'gelo') {
        // Ice spikes
        for (var s = -1; s <= 1; s++) {
            var spike = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.5, 6),
                new THREE.MeshStandardMaterial({
                    color: 0x99ccff, roughness: 0.3, metalness: 0.5,
                    emissive: 0x224466, emissiveIntensity: 0.5
                })
            );
            spike.position.set(s * 0.45, -0.15, 0);
            d.add(spike);
        }
        // Aurora-like band
        var aurora = new THREE.Mesh(
            new THREE.PlaneGeometry(2.0, 0.18),
            new THREE.MeshBasicMaterial({
                color: 0x66ddff, transparent: true, opacity: 0.6, toneMapped: false
            })
        );
        aurora.position.set(0, 0.5, -0.03);
        d.add(aurora);
        d.userData.spinTarget = aurora;
    }

    return d;
}

function makeCard(mapa, idx) {
    var card = new THREE.Group();
    card.userData.mapa = mapa;
    card.userData.index = idx;

    var color = cssToHex(mapa.corCSS);
    var w = 2.5, h = 3.1;

    // Body — keeps the diorama framed in dark glass
    var bodyMat = new THREE.MeshBasicMaterial({
        color: 0x06031a, transparent: true, opacity: 0.85,
        depthWrite: false, side: THREE.DoubleSide
    });
    var body = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bodyMat);
    card.add(body);
    card.userData.frame = body;
    card.userData.body = bodyMat;

    // Mini diorama in the upper portion
    var diorama = buildDiorama(mapa);
    diorama.position.set(0, 0.7, 0.02);
    diorama.scale.set(0.95, 0.95, 0.95);
    card.add(diorama);
    card.userData.diorama = diorama;

    // Outer neon double border
    var outer = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.95, toneMapped: false })
    );
    outer.position.z = 0.025;
    card.add(outer);
    card.userData.border = outer;

    var inner = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(w - 0.18, h - 0.18)),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.4, toneMapped: false })
    );
    inner.position.z = 0.026;
    card.add(inner);
    card.userData.innerBorder = inner;

    // Diorama frame — separates the diorama from the text
    var dividerMat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: 0.85, toneMapped: false
    });
    var divider = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 0.04), dividerMat);
    divider.position.set(0, -0.35, 0.03);
    card.add(divider);

    // Map name
    var name = makeTextPlane(mapa.nome, {
        fontSize: 110, color: '#ffffff', glowColor: mapa.corCSS,
        worldHeight: 0.42, letterSpacing: 6, weight: '900', glowStrength: 1.2
    });
    name.position.set(0, -0.7, 0.04);
    card.add(name);

    // Description
    var desc = makeTextPlane(mapa.descricao.toUpperCase(), {
        fontSize: 32, color: '#cccccc', glowColor: '#666666',
        worldHeight: 0.16, letterSpacing: 2, weight: '500', glowStrength: 0.6
    });
    desc.position.set(0, -1.05, 0.04);
    card.add(desc);

    // Track number / id badge
    var badge = makeTextPlane('TRACK 0' + (idx + 1), {
        fontSize: 38, color: '#ffffff', glowColor: mapa.corCSS,
        worldHeight: 0.18, letterSpacing: 4, weight: '700', glowStrength: 0.9
    });
    badge.position.set(0, -1.3, 0.04);
    card.add(badge);

    return card;
}

function highlightSelected() {
    var selectedColor = cssToHex(mapas[selectedIndex].corCSS);

    cards.forEach(function (card, i) {
        var selected = (i === selectedIndex);
        var s = selected ? 1.18 : 0.85;
        var z = selected ? 0.6 : 0;
        tween(card.scale, { x: s, y: s, z: s }, { duration: 0.35, easing: Easing.easeOut });
        tween(card.position, { z: z }, { duration: 0.35, easing: Easing.easeOut });
        tween(card.userData.border.material, { opacity: selected ? 1.0 : 0.35 }, { duration: 0.3 });
        tween(card.userData.innerBorder.material, { opacity: selected ? 0.9 : 0.15 }, { duration: 0.3 });
        tween(card.userData.frame.material, { opacity: selected ? 0.95 : 0.55 }, { duration: 0.3 });

        // Slight tilt toward the camera on the selected card
        tween(card.rotation, { y: selected ? 0 : (i < selectedIndex ? 0.18 : -0.18) }, { duration: 0.35 });
    });

    // Update title glow tint to match the selected map
    if (titleLabel) {
        updateTextPlane(titleLabel, 'SELECT  TRACK', {
            fontSize: 92, color: '#ffffff',
            glowColor: '#' + selectedColor.toString(16).padStart(6, '0'),
            worldHeight: 0.6, letterSpacing: 8, weight: '900', glowStrength: 1.3
        });
    }

    // Dynamic hint shows the selected map's name in its colour
    if (dynamicHint) {
        updateTextPlane(dynamicHint, '> ' + mapas[selectedIndex].nome + '  SELECTED <', {
            fontSize: 50, color: '#ffffff',
            glowColor: '#' + selectedColor.toString(16).padStart(6, '0'),
            worldHeight: 0.28, letterSpacing: 5, weight: '700', glowStrength: 1.0
        });
    }
}

export function buildTrackSelect(scene) {
    group = new THREE.Group();
    group.position.set(0, 4, 0);

    titleLabel = makeTextPlane('SELECT  TRACK', {
        fontSize: 92, color: '#ffffff', glowColor: '#ff2bd6',
        worldHeight: 0.6, letterSpacing: 8, weight: '900', glowStrength: 1.2
    });
    titleLabel.position.set(0, 2.8, 0);
    group.add(titleLabel);

    var sub = makeTextPlane('// CHOOSE  YOUR  ARENA //', {
        fontSize: 36, color: '#a0e8ff', glowColor: '#00eaff',
        worldHeight: 0.22, letterSpacing: 4, weight: '500', glowStrength: 0.8
    });
    sub.position.set(0, 2.32, 0);
    group.add(sub);

    var spacing = 2.6;
    var startX = -((mapas.length - 1) * spacing) / 2;
    mapas.forEach(function (m, i) {
        var card = makeCard(m, i);
        card.position.set(startX + i * spacing, -0.1, 0);
        cards.push(card);
        group.add(card);
    });

    dynamicHint = makeTextPlane('> SPACE SELECTED <', {
        fontSize: 50, color: '#ffffff', glowColor: '#00eaff',
        worldHeight: 0.28, letterSpacing: 5, weight: '700', glowStrength: 1.0
    });
    dynamicHint.position.set(0, -2.0, 0);
    group.add(dynamicHint);

    hintLabel = makeTextPlane('< >  pista    [ENTER] confirmar    [ESC] voltar', {
        fontSize: 40, color: '#aaaacc', glowColor: '#3344aa',
        worldHeight: 0.26, letterSpacing: 2, weight: '500', glowStrength: 0.5
    });
    hintLabel.position.set(0, -2.55, 0);
    group.add(hintLabel);

    scene.add(group);
    group.visible = false;
}

export function showTrackSelect(initial) {
    if (!group) return;
    group.visible = true;
    if (initial && initial.mapId) {
        var idx = mapas.findIndex(function (m) { return m.id === initial.mapId; });
        if (idx >= 0) selectedIndex = idx;
    }
    // Stagger cards in
    cards.forEach(function (card, i) {
        card.scale.set(0.6, 0.6, 0.6);
        card.userData.frame.material.opacity = 0;
        var s = (i === selectedIndex) ? 1.18 : 0.85;
        tween(card.scale, { x: s, y: s, z: s }, {
            duration: 0.5, easing: Easing.easeOutBack, delay: i * 0.08
        });
        tween(card.userData.frame.material, { opacity: i === selectedIndex ? 0.95 : 0.55 }, {
            duration: 0.4, delay: i * 0.08
        });
    });
    setTimeout(highlightSelected, 350);
}

export function hideTrackSelect() {
    if (group) group.visible = false;
}

export function getTrackSelectHandler(handlers) {
    callbacks = handlers || {};
    return {
        onEnter: function () { highlightSelected(); },
        onLeave: function () {},
        onKey: function (key) {
            if (key === 'LEFT' || key === 'A') {
                selectedIndex = (selectedIndex - 1 + cards.length) % cards.length;
                sfxNavigate(); highlightSelected(); return true;
            }
            if (key === 'RIGHT' || key === 'D') {
                selectedIndex = (selectedIndex + 1) % cards.length;
                sfxNavigate(); highlightSelected(); return true;
            }
            if (key === 'ENTER' || key === 'SPACE') {
                sfxConfirm();
                if (callbacks.onConfirm) callbacks.onConfirm({ mapId: mapas[selectedIndex].id });
                return true;
            }
            if (key === 'ESC' || key === 'BACK') {
                sfxBack();
                if (callbacks.onBack) callbacks.onBack();
                return true;
            }
            return false;
        },
        onHover: function (obj) {
            if (!obj) return;
            var root = obj;
            while (root && root.userData && root.userData.index === undefined) root = root.parent;
            if (root && root.userData && root.userData.index !== undefined) {
                if (root.userData.index !== selectedIndex) {
                    selectedIndex = root.userData.index;
                    sfxNavigate();
                    highlightSelected();
                }
            }
        },
        onClick: function (obj) {
            var root = obj;
            while (root && root.userData && root.userData.index === undefined) root = root.parent;
            if (root && root.userData && root.userData.index !== undefined) {
                selectedIndex = root.userData.index;
                sfxConfirm();
                if (callbacks.onConfirm) callbacks.onConfirm({ mapId: mapas[selectedIndex].id });
            }
        }
    };
}

export function getTrackSelectHoverables() {
    return cards.map(function (c) { return c.userData.frame; }).filter(Boolean);
}

export function updateTrackSelect(dt) {
    if (!group || !group.visible) return;
    t += dt;
    cards.forEach(function (card, i) {
        if (i === selectedIndex) {
            card.position.y = -0.1 + Math.sin(t * 1.8) * 0.08;
        } else {
            card.position.y = -0.1;
        }
        // Spin the diorama's spin target if defined
        if (card.userData.diorama && card.userData.diorama.userData.spinTarget) {
            card.userData.diorama.userData.spinTarget.rotation.y += dt * 0.6;
            card.userData.diorama.userData.spinTarget.rotation.z += dt * 0.2;
        }
    });
}
