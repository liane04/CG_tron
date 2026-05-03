// Track Select screen — pick which arena to race on. Cards are pulled from
// mapas.js so adding new maps automatically extends this screen.

import * as THREE from 'three';
import { makeTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../../audioManager.js';
import { mapas } from '../../mapas.js';

var group = null;
var cards = [];
var selectedIndex = 0;
var titleLabel = null;
var hintLabel = null;
var t = 0;
var callbacks = {};

function cssToHex(css) {
    if (!css) return 0xffffff;
    if (css[0] === '#') return parseInt(css.slice(1), 16);
    return 0xffffff;
}

function makeCard(mapa, idx) {
    var card = new THREE.Group();
    card.userData.mapa = mapa;
    card.userData.index = idx;

    var color = cssToHex(mapa.corCSS);

    // Solid dark body — kept below the bloom threshold so the body itself
    // does not glow. The neon identity comes from the border + accents.
    var frameMat = new THREE.MeshBasicMaterial({ color: 0x140a25 });
    var frame = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.8), frameMat);
    card.add(frame);
    card.userData.frame = frame;

    // Neon border (LineSegments — thin, bright, blooms naturally)
    var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(frame.geometry),
        new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.95, toneMapped: false, linewidth: 2 })
    );
    edges.position.z = 0.005;
    card.add(edges);
    card.userData.border = edges;

    // Map name
    var name = makeTextPlane(mapa.nome, {
        fontSize: 96, color: '#ffffff', glowColor: mapa.corCSS, worldHeight: 0.42
    });
    name.position.set(0, 0.85, 0.02);
    card.add(name);

    // Description
    var desc = makeTextPlane(mapa.descricao, {
        fontSize: 36, color: '#cccccc', glowColor: '#666666', worldHeight: 0.18
    });
    desc.position.set(0, 0.35, 0.02);
    card.add(desc);

    // Theme swatch — a coloured bar in the centre. This one DOES glow because
    // it's the deliberate accent.
    var swatchMat = new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
    var swatch = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.18), swatchMat);
    swatch.position.set(0, -0.05, 0.02);
    card.add(swatch);

    // Mini synthwave grid preview at the bottom
    var grid = new THREE.GridHelper(1.6, 8, color, color);
    grid.position.set(0, -0.7, 0.02);
    grid.rotation.x = -Math.PI / 3;
    grid.material.transparent = true;
    grid.material.opacity = 0.7;
    card.add(grid);

    return card;
}

function highlightSelected() {
    cards.forEach(function (card, i) {
        var selected = (i === selectedIndex);
        var s = selected ? 1.12 : 0.92;
        tween(card.scale, { x: s, y: s, z: s }, { duration: 0.3, easing: Easing.easeOut });
        tween(card.userData.border.material, { opacity: selected ? 1.0 : 0.4 }, { duration: 0.25 });
    });
}

export function buildTrackSelect(scene) {
    group = new THREE.Group();
    group.position.set(0, 4, 0);

    titleLabel = makeTextPlane('SELECT TRACK', {
        fontSize: 90, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.55
    });
    titleLabel.position.set(0, 2.6, 0);
    group.add(titleLabel);

    var spacing = 3.0;
    var startX = -((mapas.length - 1) * spacing) / 2;
    mapas.forEach(function (m, i) {
        var card = makeCard(m, i);
        card.position.set(startX + i * spacing, 0, 0);
        cards.push(card);
        group.add(card);
    });

    hintLabel = makeTextPlane('< >  pista    [ENTER] confirmar    [ESC] voltar', {
        fontSize: 36, color: '#9999cc', glowColor: '#3344aa', worldHeight: 0.18
    });
    hintLabel.position.set(0, -2.0, 0);
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
    highlightSelected();
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
                if (callbacks.onConfirm) {
                    callbacks.onConfirm({ mapId: mapas[selectedIndex].id });
                }
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
                if (callbacks.onConfirm) {
                    callbacks.onConfirm({ mapId: mapas[selectedIndex].id });
                }
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
        if (i === selectedIndex) card.position.y = Math.sin(t * 1.8) * 0.06;
        else card.position.y = 0;
    });
}
