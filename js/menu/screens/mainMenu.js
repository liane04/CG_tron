// Main menu — four holographic panels arranged on a wide arc with strong
// angle. The selected panel slides forward, brightens, and grows a side glyph.

import * as THREE from 'three';
import { makeTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../audioManager.js';

var OPTIONS = [
    { id: 'play',     label: 'PLAY',     color: 0x00eaff, hint: 'INICIAR  CORRIDA',     icon: '>' },
    { id: 'garage',   label: 'GARAGE',   color: 0xff2bd6, hint: 'PERSONALIZAR  VEICULO', icon: '#' },
    { id: 'settings', label: 'SETTINGS', color: 0xffe46b, hint: 'CONFIGURACOES',         icon: '*' },
    { id: 'records',  label: 'RECORDS',  color: 0x59ff7c, hint: 'RECORDES  LOCAIS',      icon: '^' }
];

var group = null;
var cards = [];
var selectedIndex = 0;
var hintText = null;
var titleText = null;
var subTitleText = null;
var t = 0;
var callbacks = {};

function buildScanlineTexture() {
    var c = document.createElement('canvas');
    c.width = 4; c.height = 256;
    var ctx = c.getContext('2d');
    for (var y = 0; y < 256; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.0)';
        ctx.fillRect(0, y, 4, 2);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 8);
    return tex;
}

var scanlineTex = null;

function makeCard(option, idx) {
    var card = new THREE.Group();
    card.userData.option = option;
    card.userData.index = idx;
    card.userData.hoverable = true;

    var w = 2.6, h = 2.0;

    // 1) Solid translucent body (dark) — the holographic surface
    var bodyMat = new THREE.MeshBasicMaterial({
        color: 0x0a0418, transparent: true, opacity: 0.78,
        depthWrite: false, side: THREE.DoubleSide
    });
    var body = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bodyMat);
    card.add(body);
    card.userData.frame = body;

    // 2) Scanline overlay — gives the holo feel without pulling focus
    if (!scanlineTex) scanlineTex = buildScanlineTexture();
    var scan = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({
            map: scanlineTex.clone(),
            transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false
        })
    );
    scan.material.map.repeat.set(1, 8);
    scan.position.z = 0.005;
    card.add(scan);

    // 3) Neon double border — outer + inset for thicker glow read
    var outerEdges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h));
    var outer = new THREE.LineSegments(outerEdges, new THREE.LineBasicMaterial({
        color: option.color, transparent: true, opacity: 0.95, toneMapped: false
    }));
    outer.position.z = 0.011;
    card.add(outer);
    card.userData.border = outer;

    var innerEdges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w - 0.18, h - 0.18));
    var inner = new THREE.LineSegments(innerEdges, new THREE.LineBasicMaterial({
        color: option.color, transparent: true, opacity: 0.45, toneMapped: false
    }));
    inner.position.z = 0.012;
    card.add(inner);
    card.userData.innerBorder = inner;

    // 4) Corner accents — small L-shaped brackets in each corner
    var corners = makeCorners(w, h, option.color);
    corners.position.z = 0.013;
    card.add(corners);

    // 5) Label — large white core with coloured halo from the canvas
    var label = makeTextPlane(option.label, {
        fontSize: 110, color: '#ffffff',
        glowColor: '#' + option.color.toString(16).padStart(6, '0'),
        worldHeight: 0.46, letterSpacing: 6, weight: '900', glowStrength: 1.2
    });
    label.position.set(0, 0.15, 0.025);
    card.add(label);

    // 6) Subtle bottom-right icon (small, low opacity, decorative)
    var iconLabel = makeTextPlane(option.icon, {
        fontSize: 140, color: '#' + option.color.toString(16).padStart(6, '0'),
        glowColor: '#' + option.color.toString(16).padStart(6, '0'),
        worldHeight: 0.45, weight: '900', glowStrength: 0.4
    });
    iconLabel.position.set(0.78, -0.5, 0.018);
    iconLabel.material.opacity = 0.35;
    card.add(iconLabel);

    // 7) Bottom accent bar
    var accentMat = new THREE.MeshBasicMaterial({ color: option.color, toneMapped: false });
    var accent = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, 0.08), accentMat);
    accent.position.set(0, -h/2 + 0.18, 0.014);
    card.add(accent);
    card.userData.accent = accent;

    // 8) Index marker — "01", "02", … in small text top-left
    var idxLabel = makeTextPlane('0' + (idx + 1), {
        fontSize: 44, color: '#ffffff',
        glowColor: '#' + option.color.toString(16).padStart(6, '0'),
        worldHeight: 0.2, weight: '700', glowStrength: 0.8
    });
    idxLabel.position.set(-w/2 + 0.32, h/2 - 0.22, 0.016);
    card.add(idxLabel);

    return card;
}

function makeCorners(w, h, color) {
    var g = new THREE.Group();
    var len = 0.32;
    var thickness = 0.045;
    var mat = new THREE.MeshBasicMaterial({ color: color, toneMapped: false });

    function corner(x, y, dx, dy) {
        var hor = new THREE.Mesh(new THREE.PlaneGeometry(len, thickness), mat);
        hor.position.set(x + dx * len / 2, y, 0);
        g.add(hor);
        var vert = new THREE.Mesh(new THREE.PlaneGeometry(thickness, len), mat);
        vert.position.set(x, y + dy * len / 2, 0);
        g.add(vert);
    }
    var x0 = -w/2 + 0.04, x1 = w/2 - 0.04;
    var y0 = -h/2 + 0.04, y1 = h/2 - 0.04;
    corner(x0, y1, +1, -1);
    corner(x1, y1, -1, -1);
    corner(x0, y0, +1, +1);
    corner(x1, y0, -1, +1);
    return g;
}

export function buildMainMenu(scene) {
    group = new THREE.Group();
    group.position.set(0, 4, 0);

    titleText = makeTextPlane('MAIN  MENU', {
        fontSize: 110, color: '#ffffff', glowColor: '#ff2bd6',
        worldHeight: 0.8, letterSpacing: 10, weight: '900', glowStrength: 1.2
    });
    titleText.position.set(0, 2.6, 0);
    group.add(titleText);

    subTitleText = makeTextPlane('// SELECT  PROGRAM //', {
        fontSize: 48, color: '#a0e8ff', glowColor: '#00eaff',
        worldHeight: 0.32, letterSpacing: 4, weight: '500', glowStrength: 0.8
    });
    subTitleText.position.set(0, 1.95, 0);
    group.add(subTitleText);

    // Flat row of cards — evenly spaced, all on the same plane, centered around x=0.
    var spacing = 3.0;
    var startX = -((OPTIONS.length - 1) * spacing) / 2;
    OPTIONS.forEach(function (opt, i) {
        var card = makeCard(opt, i);
        card.position.set(startX + i * spacing, 0, 0);
        card.rotation.y = 0;
        card.userData.basePosition = card.position.clone();
        card.userData.baseRotation = card.rotation.clone();
        group.add(card);
        cards.push(card);
    });

    hintText = makeTextPlane(OPTIONS[0].hint, {
        fontSize: 80, color: '#ffffff', glowColor: '#5566ff',
        worldHeight: 0.5, letterSpacing: 6, weight: '700', glowStrength: 0.9
    });
    hintText.position.set(0, -1.85, 0);
    group.add(hintText);

    var ctrlHint = makeTextPlane('< >  navegar    [ENTER] selecionar    [ESC] voltar', {
        fontSize: 52, color: '#aaaacc', glowColor: '#3344aa',
        worldHeight: 0.34, letterSpacing: 2, weight: '500', glowStrength: 0.5
    });
    ctrlHint.position.set(0, -2.55, 0);
    group.add(ctrlHint);

    scene.add(group);
    group.visible = false;
}

function highlightSelected() {
    cards.forEach(function (card, i) {
        var selected = (i === selectedIndex);
        var base = card.userData.basePosition;
        var targetZ = base.z + (selected ? 0.9 : 0);
        var targetY = base.y + (selected ? 0.0 : -0.05);
        var targetScale = selected ? 1.12 : 0.88;
        var targetOpacity = selected ? 1.0 : 0.4;
        var innerOpacity  = selected ? 0.85 : 0.18;
        var bodyOpacity   = selected ? 0.92 : 0.55;

        tween(card.position, { z: targetZ, y: targetY }, { duration: 0.4, easing: Easing.easeOut });
        tween(card.scale,    { x: targetScale, y: targetScale, z: targetScale }, { duration: 0.4, easing: Easing.easeOut });
        tween(card.userData.border.material, { opacity: targetOpacity }, { duration: 0.3 });
        tween(card.userData.innerBorder.material, { opacity: innerOpacity }, { duration: 0.3 });
        tween(card.userData.frame.material, { opacity: bodyOpacity }, { duration: 0.3 });
        tween(card.userData.accent.scale, { x: selected ? 1.0 : 0.4 }, { duration: 0.3 });
    });
    var opt = OPTIONS[selectedIndex];
    if (hintText && hintText.parent) {
        hintText.parent.remove(hintText);
        hintText.material.map.dispose();
        hintText.material.dispose();
        hintText.geometry.dispose();
    }
    hintText = makeTextPlane(opt.hint, {
        fontSize: 56, color: '#ffffff',
        glowColor: '#' + opt.color.toString(16).padStart(6, '0'),
        worldHeight: 0.32, letterSpacing: 6, weight: '700', glowStrength: 1.0
    });
    hintText.position.set(0, -1.6, 0);
    group.add(hintText);
}

export function showMainMenu() {
    if (!group) return;
    group.visible = true;
    selectedIndex = 0;

    // Stagger the cards in
    cards.forEach(function (card, i) {
        var base = card.userData.basePosition;
        card.position.y = base.y - 1.5;
        card.scale.set(0.7, 0.7, 0.7);
        card.userData.frame.material.opacity = 0;
        tween(card.position, { y: base.y }, {
            duration: 0.55, easing: Easing.easeOutBack, delay: i * 0.07
        });
        tween(card.userData.frame.material, { opacity: 0.78 }, {
            duration: 0.4, delay: i * 0.07
        });
    });
    setTimeout(highlightSelected, 350);
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
            var root = obj;
            while (root && !root.userData.option) root = root.parent;
            if (!root) return;
            if (root.userData.index !== selectedIndex) {
                selectedIndex = root.userData.index;
                sfxNavigate();
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
    cards.forEach(function (card, i) {
        if (i === selectedIndex) {
            var base = card.userData.basePosition;
            card.position.y = base.y + Math.sin(t * 2.0) * 0.1;
        }
    });
}
