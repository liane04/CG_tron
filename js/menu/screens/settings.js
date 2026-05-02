// Settings panel — three categories: AUDIO, VISUAL, CONTROLS. Sliders for
// continuous values and 3D toggles for booleans / discrete choices. Up/Down
// navigates, Left/Right adjusts.

import * as THREE from 'three';
import { makeTextPlane, updateTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxToggle, sfxBack } from '../audioManager.js';

var group = null;
var rows = [];
var rowIndex = 0;
var t = 0;
var settingsRef = null;
var callbacks = {};
var titleLabel = null;

function makePanel() {
    var panel = new THREE.Group();
    var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 6.0),
        new THREE.MeshBasicMaterial({ color: 0x110022, transparent: true, opacity: 0.5, toneMapped: false })
    );
    panel.add(bg);
    var border = new THREE.LineSegments(
        new THREE.EdgesGeometry(bg.geometry),
        new THREE.LineBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.8, toneMapped: false })
    );
    panel.add(border);
    return panel;
}

function makeSlider(value) {
    var g = new THREE.Group();
    var track = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x331144, transparent: true, opacity: 0.7, toneMapped: false })
    );
    g.add(track);
    var fillGroup = new THREE.Group();
    fillGroup.position.x = -1.2;
    var fill = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    fill.position.x = 1.2;
    fillGroup.add(fill);
    fillGroup.scale.x = value;
    g.add(fillGroup);
    var knob = new THREE.Mesh(
        new THREE.CircleGeometry(0.13, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    );
    knob.position.set(-1.2 + value * 2.4, 0, 0.01);
    g.add(knob);
    return { group: g, fillGroup: fillGroup, knob: knob };
}

function makeToggle(value) {
    var g = new THREE.Group();
    var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x331144, transparent: true, opacity: 0.6, toneMapped: false })
    );
    g.add(bg);
    var border = new THREE.LineSegments(
        new THREE.EdgesGeometry(bg.geometry),
        new THREE.LineBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    g.add(border);
    var knob = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    knob.position.x = value ? 0.32 : -0.32;
    knob.position.z = 0.01;
    g.add(knob);
    return { group: g, knob: knob };
}

function makeDiscrete(label) {
    var g = new THREE.Group();
    var lbl = makeTextPlane(label, {
        fontSize: 56, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.28
    });
    g.add(lbl);
    return { group: g, label: lbl };
}

function buildRow(def, y) {
    var row = new THREE.Group();
    row.position.y = y;

    // Category prefix tint via glow color
    var labelMesh = makeTextPlane(def.label, {
        fontSize: 56, color: '#ffffff', glowColor: def.glow || '#00eaff', worldHeight: 0.26
    });
    labelMesh.position.set(-2.7, 0, 0);
    row.add(labelMesh);

    var control = null;
    if (def.kind === 'slider') {
        control = makeSlider(def.value);
        control.group.position.set(1.2, 0, 0);
        row.add(control.group);
    } else if (def.kind === 'toggle') {
        control = makeToggle(def.value);
        control.group.position.set(1.6, 0, 0);
        row.add(control.group);
    } else if (def.kind === 'discrete') {
        control = makeDiscrete(def.options[def.index].label);
        control.group.position.set(1.6, 0, 0);
        row.add(control.group);
    }

    var arrowL = makeTextPlane('<', { fontSize: 64, color: '#ffe46b', glowColor: '#ff7a00', worldHeight: 0.3 });
    var arrowR = makeTextPlane('>', { fontSize: 64, color: '#ffe46b', glowColor: '#ff7a00', worldHeight: 0.3 });
    arrowL.position.set(-0.2, 0, 0);
    arrowR.position.set(3.0, 0, 0);
    arrowL.material.opacity = 0; arrowR.material.opacity = 0;
    row.add(arrowL); row.add(arrowR);

    return {
        group: row,
        labelMesh: labelMesh,
        control: control,
        def: def,
        arrowL: arrowL,
        arrowR: arrowR
    };
}

function buildRowDefs(settings) {
    return [
        { id: 'music',   label: 'MUSIC VOLUME', kind: 'slider', value: settings.audio.music,  glow: '#ff2bd6' },
        { id: 'sfx',     label: 'SFX VOLUME',   kind: 'slider', value: settings.audio.sfx,    glow: '#ff2bd6' },
        { id: 'muted',   label: 'MUTE ALL',     kind: 'toggle', value: settings.audio.muted,  glow: '#ff2bd6' },
        { id: 'quality', label: 'GRAPHICS',     kind: 'discrete',
          options: [{ value: 'low', label: 'LOW' }, { value: 'medium', label: 'MEDIUM' }, { value: 'high', label: 'HIGH' }],
          index: ['low','medium','high'].indexOf(settings.visual.quality), glow: '#00eaff' },
        { id: 'cameraMode', label: 'CAMERA',     kind: 'discrete',
          options: [{ value: 'perspective', label: 'PERSPECTIVE' }, { value: 'orthographic', label: 'ORTHOGRAPHIC' }],
          index: ['perspective','orthographic'].indexOf(settings.visual.cameraMode), glow: '#00eaff' },
        { id: 'layout',  label: 'CONTROLS',     kind: 'discrete',
          options: [{ value: 'wasd', label: 'W A S D' }, { value: 'arrows', label: 'ARROWS' }],
          index: ['wasd','arrows'].indexOf(settings.controls.layout), glow: '#59ff7c' }
    ];
}

function readBack(def) {
    if (def.kind === 'slider')   return def.value;
    if (def.kind === 'toggle')   return def.value;
    if (def.kind === 'discrete') return def.options[def.index].value;
    return null;
}

function applyToSettings() {
    if (!settingsRef) return;
    rows.forEach(function (r) {
        var v = readBack(r.def);
        if (r.def.id === 'music')      settingsRef.audio.music = v;
        if (r.def.id === 'sfx')        settingsRef.audio.sfx = v;
        if (r.def.id === 'muted')      settingsRef.audio.muted = v;
        if (r.def.id === 'quality')    settingsRef.visual.quality = v;
        if (r.def.id === 'cameraMode') settingsRef.visual.cameraMode = v;
        if (r.def.id === 'layout')     settingsRef.controls.layout = v;
    });
    if (callbacks.onChange) callbacks.onChange(settingsRef);
}

function highlightRow() {
    rows.forEach(function (r, i) {
        var selected = (i === rowIndex);
        var targetX = selected ? 0.0 : 0.0;
        // Just emphasise the arrows for the selected row
        r.arrowL.material.opacity = selected ? 0.9 : 0;
        r.arrowR.material.opacity = selected ? 0.9 : 0;
        var s = selected ? 1.05 : 1.0;
        tween(r.group.scale, { x: s, y: s, z: s }, { duration: 0.2 });
    });
}

function adjust(dir) {
    var r = rows[rowIndex];
    if (!r) return;
    var def = r.def;
    if (def.kind === 'slider') {
        def.value = Math.max(0, Math.min(1, def.value + dir * 0.1));
        // Animate fill + knob
        tween(r.control.fillGroup.scale, { x: def.value }, { duration: 0.2 });
        tween(r.control.knob.position, { x: -1.2 + def.value * 2.4 }, { duration: 0.2 });
    } else if (def.kind === 'toggle') {
        def.value = !def.value;
        tween(r.control.knob.position, { x: def.value ? 0.32 : -0.32 }, { duration: 0.25, easing: Easing.easeOutBack });
    } else if (def.kind === 'discrete') {
        def.index = (def.index + dir + def.options.length) % def.options.length;
        updateTextPlane(r.control.label, def.options[def.index].label, {
            fontSize: 56, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.28
        });
    }
    applyToSettings();
}

export function buildSettings(scene, settings) {
    settingsRef = settings;
    group = new THREE.Group();
    group.position.set(0, 4.5, 0);

    var panel = makePanel();
    group.add(panel);

    titleLabel = makeTextPlane('SETTINGS', {
        fontSize: 90, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.5
    });
    titleLabel.position.set(0, 2.5, 0.05);
    group.add(titleLabel);

    var defs = buildRowDefs(settings);
    rows = [];
    defs.forEach(function (d, i) {
        var r = buildRow(d, 1.4 - i * 0.7);
        r.group.position.x = 0;
        group.add(r.group);
        rows.push(r);
    });

    var hint = makeTextPlane('^ v  navegar    < >  ajustar    [ESC] voltar', {
        fontSize: 36, color: '#9999cc', glowColor: '#3344aa', worldHeight: 0.18
    });
    hint.position.set(0, -2.7, 0.05);
    group.add(hint);

    scene.add(group);
    group.visible = false;
}

export function showSettings() {
    if (!group) return;
    group.visible = true;
    rowIndex = 0;
    highlightRow();
}

export function hideSettings() { if (group) group.visible = false; }

export function getSettingsHandler(handlers) {
    callbacks = handlers || {};
    return {
        onEnter: function () { highlightRow(); },
        onLeave: function () {},
        onKey: function (key) {
            if (key === 'UP' || key === 'W') {
                rowIndex = (rowIndex - 1 + rows.length) % rows.length;
                sfxNavigate(); highlightRow(); return true;
            }
            if (key === 'DOWN' || key === 'S') {
                rowIndex = (rowIndex + 1) % rows.length;
                sfxNavigate(); highlightRow(); return true;
            }
            if (key === 'LEFT' || key === 'A') { sfxToggle(); adjust(-1); return true; }
            if (key === 'RIGHT' || key === 'D') { sfxToggle(); adjust( 1); return true; }
            if (key === 'ENTER') {
                sfxToggle();
                // Enter on a toggle/discrete row also adjusts (forward)
                adjust(1);
                return true;
            }
            if (key === 'ESC' || key === 'BACK') {
                sfxBack();
                if (callbacks.onBack) callbacks.onBack();
                return true;
            }
            return false;
        }
    };
}

export function updateSettings(dt) {
    if (!group || !group.visible) return;
    t += dt;
    // Subtle floating panel
    group.position.y = 4.5 + Math.sin(t * 0.9) * 0.04;
}
