// Garage screen — vehicle selection (left/right), color selection (up/down to focus
// the swatch row, left/right cycles colours within it), live stats panel,
// CONFIRM advances to the game.

import * as THREE from 'three';
import { makeTextPlane, updateTextPlane } from '../textSprite.js';
import { tween, Easing } from '../tween.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../../audioManager.js';
import { VEHICLES, COLORS } from '../garageVehicles.js';

var group = null;
var podium = null;
var spotlightLeft = null;
var spotlightRight = null;
var currentVehicleMesh = null;
var currentVehicleIndex = 0;
var currentColorIndex = 0;
var t = 0;

var nameLabel = null;
var statBars = [];          // { fill, label, percent target }
var colorSwatches = [];
var colorNameLabel = null;
var confirmBtn = null;
var hintLabel = null;

var callbacks = {};

function makePodium() {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.6, 0.3, 32),
        new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.6, roughness: 0.3 })
    );
    disc.position.y = 0.05;
    g.add(disc);

    // Edge ring
    var ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.45, 0.04, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.22;
    g.add(ring);

    // Inner glow ring
    var ring2 = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 2.2, 48),
        new THREE.MeshBasicMaterial({ color: 0x4422aa, side: THREE.DoubleSide, transparent: true, opacity: 0.5, toneMapped: false })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.07;
    g.add(ring2);
    return g;
}

function makeSpotlight(color) {
    var spot = new THREE.SpotLight(color, 1.2, 16, Math.PI * 0.18, 0.4, 1.2);
    spot.position.set(0, 7, 0);
    var target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    spot.target = target;
    return { spot: spot, target: target };
}

function makeStatBar(label, x, y) {
    var g = new THREE.Group();
    g.position.set(x, y, 0);

    var labelMesh = makeTextPlane(label, {
        fontSize: 56, color: '#cccccc', glowColor: '#666688', worldHeight: 0.22
    });
    labelMesh.position.set(-1.45, 0, 0);
    g.add(labelMesh);

    // Background bar
    var bg = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x331144, transparent: true, opacity: 0.6, toneMapped: false })
    );
    bg.position.set(0.4, 0, 0);
    g.add(bg);

    // Fill bar (anchor at left edge)
    var fillGroup = new THREE.Group();
    fillGroup.position.set(-0.7, 0, 0);
    var fill = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    fill.position.set(1.1, 0, 0.005); // shift so the geometry's left edge is at the group origin
    fillGroup.add(fill);
    fillGroup.scale.x = 0.0;
    g.add(fillGroup);

    return { group: g, fill: fillGroup, fillMesh: fill, label: labelMesh };
}

function setVehicleStats(vehicle) {
    var keys = ['speed', 'acceleration', 'handling'];
    keys.forEach(function (k, i) {
        var bar = statBars[i];
        if (!bar) return;
        tween(bar.fill.scale, { x: vehicle.stats[k] }, { duration: 0.5, easing: Easing.easeOut });
    });
}

function buildColorPalette() {
    // Vertical column of colour swatches placed on the LEFT side of the
    // garage. Up/Down arrows cycle through them; clicking a swatch picks
    // it directly.
    var palette = new THREE.Group();
    palette.position.set(-5.6, 1.0, 0);

    // Title above the column
    var title = makeTextPlane('COLOR', {
        fontSize: 56, color: '#ffe46b', glowColor: '#ff7a00', worldHeight: 0.26
    });
    title.position.set(0, 1.9, 0);
    palette.add(title);

    var spacing = 0.55;
    var startY = ((COLORS.length - 1) * spacing) / 2;
    COLORS.forEach(function (c, idx) {
        var matFinish;
        if (c.finish === 'matte')      matFinish = { roughness: 0.85, metalness: 0.1, emissive: 0x000000, emissiveIntensity: 0 };
        else if (c.finish === 'neon')  matFinish = { roughness: 0.4,  metalness: 0.5, emissive: c.hex,    emissiveIntensity: 1.4 };
        else                           matFinish = { roughness: 0.25, metalness: 0.85, emissive: c.hex,   emissiveIntensity: 0.5 };

        var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 24, 16),
            new THREE.MeshStandardMaterial({
                color: c.hex,
                roughness: matFinish.roughness, metalness: matFinish.metalness,
                emissive: matFinish.emissive, emissiveIntensity: matFinish.emissiveIntensity
            })
        );
        sphere.position.set(0, startY - idx * spacing, 0);
        sphere.userData.colorIndex = idx;
        sphere.userData.hoverable = true;
        palette.add(sphere);
        colorSwatches.push(sphere);
    });
    return palette;
}

function highlightColor() {
    colorSwatches.forEach(function (s, i) {
        var selected = (i === currentColorIndex);
        var s01 = selected ? 1.6 : 1.0;
        tween(s.scale, { x: s01, y: s01, z: s01 }, { duration: 0.25, easing: Easing.easeOut });
    });
    var c = COLORS[currentColorIndex];
    if (colorNameLabel) {
        updateTextPlane(colorNameLabel, c.name, {
            fontSize: 50, color: '#ffffff', glowColor: '#' + c.hex.toString(16).padStart(6, '0'),
            worldHeight: 0.22
        });
    }
    // Real vehicle factories bake the colour at construction time, so we
    // rebuild the showcased mesh whenever the colour changes.
    if (podium && currentVehicleMesh) rebuildVehicleMesh();
}

function rebuildVehicleMesh() {
    var vehicle = VEHICLES[currentVehicleIndex];
    var color = COLORS[currentColorIndex];
    var oldRotY = currentVehicleMesh ? currentVehicleMesh.rotation.y : 0;
    if (currentVehicleMesh && currentVehicleMesh.parent) currentVehicleMesh.parent.remove(currentVehicleMesh);
    var mesh = vehicle.build(color);
    mesh.position.set(0, 0.25 + (vehicle.podiumOffsetY || 0), 0);
    // Preserve the spinning angle so the colour change isn't a visual jump
    mesh.rotation.y += oldRotY;
    podium.add(mesh);
    currentVehicleMesh = mesh;
}

function swapVehicle(direction) {
    // Slide-out / slide-in animation
    var oldMesh = currentVehicleMesh;
    if (oldMesh) {
        tween(oldMesh.position, { x: direction * 4, y: 0.25 }, {
            duration: 0.35, easing: Easing.easeIn,
            onComplete: function () {
                if (oldMesh.parent) oldMesh.parent.remove(oldMesh);
            }
        });
    }

    var vehicle = VEHICLES[currentVehicleIndex];
    var color = COLORS[currentColorIndex];
    var mesh = vehicle.build(color);
    mesh.position.set(-direction * 4, 0.25 + (vehicle.podiumOffsetY || 0), 0);
    podium.add(mesh);
    currentVehicleMesh = mesh;
    tween(mesh.position, { x: 0 }, { duration: 0.45, easing: Easing.easeOut });

    // Update name label
    if (nameLabel) {
        updateTextPlane(nameLabel, vehicle.name, {
            fontSize: 96, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.5
        });
    }
    setVehicleStats(vehicle);
}

// Single-mode UX now: arrows always cycle vehicles, up/down cycle colours.
// No more focus-toggle, so no per-row hint repaint is needed.

export function buildGarage(scene) {
    group = new THREE.Group();
    group.position.set(0, 0, 0);

    podium = makePodium();
    podium.position.y = 0;
    group.add(podium);

    var sl = makeSpotlight(0xff2bd6);
    var sr = makeSpotlight(0x00eaff);
    sl.spot.position.set(-4, 8, 5);
    sr.spot.position.set(4, 8, 5);
    spotlightLeft = sl; spotlightRight = sr;
    group.add(sl.spot); group.add(sl.target);
    group.add(sr.spot); group.add(sr.target);

    // Vehicle name above the podium
    nameLabel = makeTextPlane(VEHICLES[0].name, {
        fontSize: 96, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.5
    });
    nameLabel.position.set(0, 4.0, 0);
    group.add(nameLabel);

    // Stats panel (right of stage)
    var statsPanel = new THREE.Group();
    statsPanel.position.set(4.6, 1.6, 0);
    var statsTitle = makeTextPlane('STATS', {
        fontSize: 64, color: '#ffe46b', glowColor: '#ff7a00', worldHeight: 0.28
    });
    statsTitle.position.set(0, 0.9, 0);
    statsPanel.add(statsTitle);

    var bs = makeStatBar('SPEED', 0, 0.4);
    var ba = makeStatBar('ACCEL', 0, 0.0);
    var bh = makeStatBar('HANDLE', 0, -0.4);
    statBars = [bs, ba, bh];
    [bs, ba, bh].forEach(function (b) { statsPanel.add(b.group); });
    group.add(statsPanel);

    // Vertical color palette on the LEFT
    var colorPalette = buildColorPalette();
    group.add(colorPalette);
    // Color name shown beneath the palette so the player can read which
    // colour is currently selected.
    colorNameLabel = makeTextPlane(COLORS[0].name, {
        fontSize: 44, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.20
    });
    colorNameLabel.position.set(-5.6, -1.3, 0);
    group.add(colorNameLabel);

    // Confirm button (corner)
    var confirmGroup = new THREE.Group();
    confirmGroup.position.set(4.6, -1.5, 0);
    var btnFrame = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.2, toneMapped: false })
    );
    var btnEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(btnFrame.geometry),
        new THREE.LineBasicMaterial({ color: 0x00ff88, toneMapped: false })
    );
    var btnLabel = makeTextPlane('CONFIRM', {
        fontSize: 60, color: '#ffffff', glowColor: '#00ff88', worldHeight: 0.28
    });
    btnLabel.position.z = 0.01;
    confirmGroup.add(btnFrame); confirmGroup.add(btnEdges); confirmGroup.add(btnLabel);
    confirmGroup.userData.hoverable = true;
    confirmGroup.userData.action = 'confirm';
    btnFrame.userData.confirmBtn = true;
    confirmBtn = { group: confirmGroup, frame: btnFrame };
    group.add(confirmGroup);

    // Hint at bottom — clarifies the new dual-axis controls
    hintLabel = makeTextPlane('< >  Veiculo    ^ v  Cor    [ENTER] Confirmar    [ESC] Voltar', {
        fontSize: 36, color: '#9999cc', glowColor: '#3344aa', worldHeight: 0.18
    });
    hintLabel.position.set(0, -2.6, 0);
    group.add(hintLabel);

    // Initial vehicle
    var firstVehicle = VEHICLES[0];
    currentVehicleMesh = firstVehicle.build(COLORS[0]);
    currentVehicleMesh.position.set(0, 0.25 + (firstVehicle.podiumOffsetY || 0), 0);
    podium.add(currentVehicleMesh);
    if (nameLabel) updateTextPlane(nameLabel, firstVehicle.name, {
        fontSize: 96, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.5
    });
    setVehicleStats(firstVehicle);

    scene.add(group);
    group.visible = false;
}

export function showGarage(initial) {
    if (!group) return;
    group.visible = true;
    if (initial) {
        var vIdx = VEHICLES.findIndex(function (v) { return v.id === initial.vehicleId; });
        var cIdx = COLORS.findIndex(function (c) { return c.id === initial.colorId; });
        if (vIdx >= 0) currentVehicleIndex = vIdx;
        if (cIdx >= 0) currentColorIndex = cIdx;
    }
    // Rebuild current vehicle for the saved selection
    if (currentVehicleMesh && currentVehicleMesh.parent) currentVehicleMesh.parent.remove(currentVehicleMesh);
    var v = VEHICLES[currentVehicleIndex];
    var c = COLORS[currentColorIndex];
    currentVehicleMesh = v.build(c);
    currentVehicleMesh.position.set(0, 0.25 + (v.podiumOffsetY || 0), 0);
    podium.add(currentVehicleMesh);
    if (nameLabel) updateTextPlane(nameLabel, v.name, {
        fontSize: 96, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.5
    });
    setVehicleStats(v);
    highlightColor();
}

export function hideGarage() {
    if (group) group.visible = false;
}

export function getGarageHandler(handlers) {
    callbacks = handlers || {};
    return {
        onEnter: function () {},
        onLeave: function () {},
        onKey: function (key) {
            // Horizontal — vehicle cycle (always)
            if (key === 'LEFT' || key === 'A') {
                currentVehicleIndex = (currentVehicleIndex - 1 + VEHICLES.length) % VEHICLES.length;
                sfxNavigate(); swapVehicle(-1); return true;
            }
            if (key === 'RIGHT' || key === 'D') {
                currentVehicleIndex = (currentVehicleIndex + 1) % VEHICLES.length;
                sfxNavigate(); swapVehicle(1); return true;
            }
            // Vertical — colour cycle through the left palette
            if (key === 'UP' || key === 'W') {
                currentColorIndex = (currentColorIndex - 1 + COLORS.length) % COLORS.length;
                sfxNavigate(); highlightColor(); return true;
            }
            if (key === 'DOWN' || key === 'S') {
                currentColorIndex = (currentColorIndex + 1) % COLORS.length;
                sfxNavigate(); highlightColor(); return true;
            }
            if (key === 'ENTER') {
                sfxConfirm();
                if (callbacks.onConfirm) {
                    callbacks.onConfirm({
                        vehicleId: VEHICLES[currentVehicleIndex].id,
                        colorId:   COLORS[currentColorIndex].id
                    });
                }
                return true;
            }
            if (key === 'ESC' || key === 'BACK') {
                sfxBack();
                if (callbacks.onBack) callbacks.onBack({
                    vehicleId: VEHICLES[currentVehicleIndex].id,
                    colorId:   COLORS[currentColorIndex].id
                });
                return true;
            }
            return false;
        },
        onHover: function (obj) {
            if (!obj) return;
            if (obj.userData && obj.userData.colorIndex !== undefined) {
                if (obj.userData.colorIndex !== currentColorIndex) {
                    currentColorIndex = obj.userData.colorIndex;
                    highlightColor();
                }
            }
        },
        onClick: function (obj) {
            if (obj && obj.userData) {
                if (obj.userData.colorIndex !== undefined) {
                    currentColorIndex = obj.userData.colorIndex;
                    sfxConfirm();
                    highlightColor();
                    return;
                }
                if (obj.userData.confirmBtn) {
                    sfxConfirm();
                    if (callbacks.onConfirm) {
                        callbacks.onConfirm({
                            vehicleId: VEHICLES[currentVehicleIndex].id,
                            colorId:   COLORS[currentColorIndex].id
                        });
                    }
                }
            }
        }
    };
}

export function getGarageHoverables() {
    var list = colorSwatches.slice();
    if (confirmBtn) list.push(confirmBtn.frame);
    return list;
}

export function updateGarage(dt) {
    if (!group || !group.visible) return;
    t += dt;
    // Slow rotation of the showcased vehicle
    if (currentVehicleMesh) currentVehicleMesh.rotation.y += dt * 0.45;
    // Pulse the podium ring
    if (podium && podium.children[1]) {
        podium.children[1].material.opacity = 0.85 + Math.sin(t * 2.0) * 0.1;
    }
}
