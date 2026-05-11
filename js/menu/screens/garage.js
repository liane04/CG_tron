// Garage screen — vehicle selection only.
// Pressing ENTER advances to the CUSTOMIZE screen.

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
var t = 0;

var nameLabel = null;
var statBars = [];
var confirmBtn = null;
var hintLabel = null;

var callbacks = {};

function makePodium() {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6, 2.8, 0.35, 48),
        new THREE.MeshStandardMaterial({ color: 0x111128, metalness: 0.85, roughness: 0.18 })
    );
    disc.position.y = 0.05;
    g.add(disc);

    var ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.65, 0.06, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x00eaff, toneMapped: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.24;
    g.add(ring);

    var glowDisc = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 2.55, 48),
        new THREE.MeshBasicMaterial({
            color: 0x4422aa, side: THREE.DoubleSide,
            transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false
        })
    );
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = 0.07;
    g.add(glowDisc);
    g.userData.glowDisc = glowDisc;

    return g;
}

function makeStatBar(label, x, y) {
    var g = new THREE.Group();
    g.position.set(x, y, 0);
    var labelMesh = makeTextPlane(label, { fontSize: 56, color: '#cccccc', worldHeight: 0.22 });
    labelMesh.position.set(-1.45, 0, 0);
    g.add(labelMesh);
    var bg = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.18), new THREE.MeshBasicMaterial({ color: 0x331144, transparent: true, opacity: 0.6 }));
    bg.position.set(0.4, 0, 0);
    g.add(bg);
    var fillGroup = new THREE.Group();
    fillGroup.position.set(-0.7, 0, 0);
    var fill = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.18), new THREE.MeshBasicMaterial({ color: 0x00eaff }));
    fill.position.set(1.1, 0, 0.005);
    fillGroup.add(fill);
    fillGroup.scale.x = 0.0;
    g.add(fillGroup);
    return { group: g, fill: fillGroup };
}

function setVehicleStats(vehicle) {
    var keys = ['speed', 'acceleration', 'handling'];
    keys.forEach(function (k, i) {
        var bar = statBars[i];
        if (bar) tween(bar.fill.scale, { x: vehicle.stats[k] }, { duration: 0.5, easing: Easing.easeOut });
    });
}

function rebuildVehicleMesh() {
    var vehicle = VEHICLES[currentVehicleIndex];
    var color = COLORS[0]; 
    var oldRotY = currentVehicleMesh ? currentVehicleMesh.rotation.y : 0;
    if (currentVehicleMesh && currentVehicleMesh.parent) currentVehicleMesh.parent.remove(currentVehicleMesh);
    var mesh = vehicle.build(color);
    mesh.position.set(0, 0.25 + (vehicle.podiumOffsetY || 0), 0);
    mesh.rotation.y = oldRotY;
    podium.add(mesh);
    currentVehicleMesh = mesh;
}

function swapVehicle(direction) {
    var oldMesh = currentVehicleMesh;
    if (oldMesh) {
        tween(oldMesh.position, { x: direction * 4 }, {
            duration: 0.3, easing: Easing.easeIn,
            onComplete: function () { if (oldMesh.parent) oldMesh.parent.remove(oldMesh); }
        });
    }
    var vehicle = VEHICLES[currentVehicleIndex];
    var mesh = vehicle.build(COLORS[0]);
    mesh.position.set(-direction * 4, 0.25 + (vehicle.podiumOffsetY || 0), 0);
    podium.add(mesh);
    currentVehicleMesh = mesh;
    tween(mesh.position, { x: 0 }, { duration: 0.4, easing: Easing.easeOut });
    if (nameLabel) updateTextPlane(nameLabel, "<  " + vehicle.name + "  >", { fontSize: 96, color: '#ffffff', worldHeight: 0.5 });
    setVehicleStats(vehicle);
}

export function buildGarage(scene) {
    group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    podium = makePodium();
    group.add(podium);

    var title = makeTextPlane('GARAGE', { fontSize: 96, color: '#ffffff', glowColor: '#ff2bd6', worldHeight: 0.6 });
    title.position.set(0, 5, 0);
    group.add(title);

    nameLabel = makeTextPlane("<  " + VEHICLES[0].name + "  >", { fontSize: 80, color: '#ffffff', worldHeight: 0.5 });
    nameLabel.position.set(0, 4, 0);
    group.add(nameLabel);

    var statsPanel = new THREE.Group();
    statsPanel.position.set(4.6, 1.6, 0);
    var bs = makeStatBar('SPEED', 0, 0.4);
    var ba = makeStatBar('ACCEL', 0, 0.0);
    var bh = makeStatBar('HANDLE', 0, -0.4);
    statBars = [bs, ba, bh];
    [bs, ba, bh].forEach(b => statsPanel.add(b.group));
    group.add(statsPanel);

    var confirmGroup = new THREE.Group();
    confirmGroup.position.set(0, -2.5, 0);
    var btnFrame = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.6), new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.2 }));
    var btnLabel = makeTextPlane('SELECT', { fontSize: 50, color: '#ffffff', worldHeight: 0.3 });
    confirmGroup.add(btnFrame); confirmGroup.add(btnLabel);
    confirmGroup.userData.hoverable = true;
    confirmGroup.userData.confirmBtn = true;
    confirmBtn = confirmGroup;
    group.add(confirmGroup);

    hintLabel = makeTextPlane('< >  Escolher Veiculo    [ENTER] Selecionar', { fontSize: 32, color: '#aaaaaa', worldHeight: 0.2 });
    hintLabel.position.set(0, -3.5, 0);
    group.add(hintLabel);
}

export function showGarage(initial) {
    group.visible = true;
    if (initial) {
        var idx = VEHICLES.findIndex(v => v.id === initial.vehicleId);
        if (idx >= 0) currentVehicleIndex = idx;
    }
    rebuildVehicleMesh();
    setVehicleStats(VEHICLES[currentVehicleIndex]);
}

export function hideGarage() { group.visible = false; }

export function getGarageHandler(h) {
    callbacks = h;
    return {
        onKey: function (key) {
            if (key === 'LEFT' || key === 'A') { currentVehicleIndex = (currentVehicleIndex - 1 + VEHICLES.length) % VEHICLES.length; sfxNavigate(); swapVehicle(-1); return true; }
            if (key === 'RIGHT' || key === 'D') { currentVehicleIndex = (currentVehicleIndex + 1) % VEHICLES.length; sfxNavigate(); swapVehicle(1); return true; }
            if (key === 'ENTER') { sfxConfirm(); if (callbacks.onConfirm) callbacks.onConfirm({ vehicleId: VEHICLES[currentVehicleIndex].id }); return true; }
            if (key === 'ESC') { sfxBack(); if (callbacks.onBack) callbacks.onBack(); return true; }
            return false;
        },
        onClick: function (obj) { if (obj && obj.parent === confirmBtn) { sfxConfirm(); if (callbacks.onConfirm) callbacks.onConfirm({ vehicleId: VEHICLES[currentVehicleIndex].id }); } }
    };
}

export function getGarageHoverables() { return [confirmBtn.children[0]]; }

export function updateGarage(dt) {
    if (!group.visible) return;
    t += dt;
    if (currentVehicleMesh) currentVehicleMesh.rotation.y += dt * 0.5;
    if (podium.userData.glowDisc) podium.userData.glowDisc.material.opacity = 0.4 + Math.sin(t * 2) * 0.1;
}
