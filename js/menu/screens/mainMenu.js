// Main menu — four cards arranged on an arc. Selected card slides forward and
// glows; left/right cycles, Enter confirms, Esc returns to the splash.

import * as THREE from 'three';
import { makeTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../../audioManager.js';

var OPTIONS = [
    { id: 'play',     label: 'PLAY',     color: 0x00eaff, hint: 'Iniciar corrida' },
    { id: 'garage',   label: 'GARAGE',   color: 0xff2bd6, hint: 'Personalizar veículo' },
    { id: 'settings', label: 'SETTINGS', color: 0xffe46b, hint: 'Configurações' },
    { id: 'records',  label: 'RECORDS',  color: 0x59ff7c, hint: 'Recordes locais' }
];

var group = null;
var cards = [];
var selectedIndex = 0;
var hintText = null;
var titleText = null;
var t = 0;
var callbacks = {};

function makeCard(option, idx, total) {
    var card = new THREE.Group();
    card.userData.option = option;
    card.userData.index = idx;
    card.userData.hoverable = true;

    // Solid dark body — kept below the bloom threshold so it doesn't glow.
    // The colour-coded look comes from the neon border, not the body.
    var frameMat = new THREE.MeshBasicMaterial({ color: 0x140a25 });
    var frame = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), frameMat);
    card.add(frame);

    // Neon border — thicker line (two stacked LineSegments at slight offsets
    // so the edges read as a glow band rather than a hairline).
    var edgeGeo = new THREE.EdgesGeometry(frame.geometry);
    var edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
        color: option.color, transparent: true, opacity: 0.95, toneMapped: false, linewidth: 2
    }));
    edgeLine.position.z = 0.005;
    card.add(edgeLine);
    card.userData.border = edgeLine;

    // A thin coloured strip along the bottom — accent that matches the option
    // colour without lighting up the whole card.
    var accentMat = new THREE.MeshBasicMaterial({ color: option.color, toneMapped: false });
    var accent = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.06), accentMat);
    accent.position.set(0, -0.78, 0.01);
    card.add(accent);

    // Label — white text, no glow tint (the border carries the colour identity)
    var label = makeTextPlane(option.label, {
        fontSize: 96, color: '#ffffff', glowColor: '#222244', worldHeight: 0.42
    });
    label.position.z = 0.02;
    card.add(label);

    frame.userData.cardRoot = card;
    card.userData.frame = frame;

    return card;
}

export function buildMainMenu(scene) {
    group = new THREE.Group();
    group.position.set(0, 4, 0);

    titleText = makeTextPlane('MAIN MENU', {
        fontSize: 90, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.55
    });
    titleText.position.set(0, 2.2, 0);
    group.add(titleText);

    // Arrange the cards on a wide arc — each card 2.6 units wide, 4 cards.
    var arcRadius = 9;
    var arcAngle  = 1.5; // total horizontal sweep (radians) — ~86°
    OPTIONS.forEach(function (opt, i) {
        var t01 = OPTIONS.length === 1 ? 0.5 : i / (OPTIONS.length - 1);
        var angle = -arcAngle / 2 + t01 * arcAngle;
        var card = makeCard(opt, i, OPTIONS.length);
        card.position.set(Math.sin(angle) * arcRadius, 0, -Math.cos(angle) * arcRadius + arcRadius);
        card.rotation.y = -angle * 0.7;
        card.userData.basePosition = card.position.clone();
        card.userData.baseRotation = card.rotation.clone();
        group.add(card);
        cards.push(card);
    });

    hintText = makeTextPlane(OPTIONS[0].hint, {
        fontSize: 56, color: '#aaaaff', glowColor: '#5566ff', worldHeight: 0.32
    });
    hintText.position.set(0, -1.5, 0);
    group.add(hintText);

    scene.add(group);
    group.visible = false;
}

function highlightSelected() {
    cards.forEach(function (card, i) {
        var selected = (i === selectedIndex);
        var base = card.userData.basePosition;
        var targetZ = base.z + (selected ? 1.2 : 0);
        var targetScale = selected ? 1.1 : 0.95;
        var targetOpacity = selected ? 1.0 : 0.5;

        tween(card.position, { z: targetZ }, { duration: 0.35, easing: Easing.easeOut });
        tween(card.scale,    { x: targetScale, y: targetScale, z: targetScale }, { duration: 0.35, easing: Easing.easeOut });
        tween(card.userData.border.material, { opacity: targetOpacity }, { duration: 0.3 });
    });
    // Update hint label by replacing the plane (avoids extra texture instancing on every frame)
    var opt = OPTIONS[selectedIndex];
    if (hintText && hintText.parent) {
        hintText.parent.remove(hintText);
        hintText.material.map.dispose();
        hintText.material.dispose();
        hintText.geometry.dispose();
    }
    hintText = makeTextPlane(opt.hint, {
        fontSize: 56, color: '#aaaaff', glowColor: '#5566ff', worldHeight: 0.32
    });
    hintText.position.set(0, -1.5, 0);
    group.add(hintText);
}

export function showMainMenu() {
    if (!group) return;
    group.visible = true;
    selectedIndex = 0;
    highlightSelected();
}

export function hideMainMenu() {
    if (group) group.visible = false;
}

export function getMainMenuHandler(handlers) {
    callbacks = handlers || {};
    return {
        onEnter: function () { highlightSelected(); },
        onLeave: function () {},
        onKey: function (key) {
            if (key === 'LEFT' || key === 'A') {
                selectedIndex = (selectedIndex - 1 + OPTIONS.length) % OPTIONS.length;
                sfxNavigate(); highlightSelected(); return true;
            }
            if (key === 'RIGHT' || key === 'D') {
                selectedIndex = (selectedIndex + 1) % OPTIONS.length;
                sfxNavigate(); highlightSelected(); return true;
            }
            if (key === 'ENTER' || key === 'SPACE') {
                sfxConfirm();
                var opt = OPTIONS[selectedIndex];
                if (callbacks.onSelect) callbacks.onSelect(opt.id);
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
            // Walk up to find the card root
            var root = obj;
            while (root && !root.userData.option) root = root.parent;
            if (!root) return;
            if (root.userData.index !== selectedIndex) {
                selectedIndex = root.userData.index;
                highlightSelected();
            }
        },
        onClick: function (obj) {
            var root = obj;
            while (root && !root.userData.option) root = root.parent;
            if (!root) return;
            selectedIndex = root.userData.index;
            highlightSelected();
            sfxConfirm();
            if (callbacks.onSelect) callbacks.onSelect(root.userData.option.id);
        }
    };
}

export function getMainMenuHoverables() {
    return cards.map(function (c) { return c.userData.frame; }).filter(Boolean);
}

export function updateMainMenu(dt) {
    if (!group || !group.visible) return;
    t += dt;
    // Subtle hover bob on selected card
    cards.forEach(function (card, i) {
        if (i === selectedIndex) {
            var base = card.userData.basePosition;
            card.position.y = base.y + Math.sin(t * 2.0) * 0.08;
        } else {
            card.position.y = card.userData.basePosition.y;
        }
    });
}
