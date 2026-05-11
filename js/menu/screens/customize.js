// Customize screen — Select color and trail while the vehicle is driving.
// The vehicle stays at origin, but the ground and trail move to simulate speed.

import * as THREE from 'three';
import { makeTextPlane, updateTextPlane } from '../textSprite.js';
import { sfxNavigate, sfxConfirm, sfxBack } from '../../audioManager.js';
import { VEHICLES, COLORS, TRAILS, findVehicle } from '../garageVehicles.js';
import { criarTrail, adicionarPonto, destruirTrail, atualizarTrail } from '../../trail.js';

var group = null;
var vehicleMesh = null;
var currentTrail = null;
var grid = null;

var vehicleId = 'mota';
var colorId = 'cyan';
var trailId = 'wireframe';

var colorSwatches = [];
var trailSwatches = [];
var currentColorIndex = 0;
var currentTrailIndex = 0;

var titleLabel = null;
var playerLabel = null;        // "PLAYER 1" / "PLAYER 2" — só visível no fluxo 1v1
var colorNameLabel = null;
var trailNameLabel = null;
var confirmBtn = null;
var t = 0;
var speed = 15; // Speed of the movement simulation
var callbacks = {};

export function buildCustomize(scene) {
    group = new THREE.Group();
    group.visible = false;
    scene.add(group);

    // Grid Floor that will move
    grid = new THREE.GridHelper(200, 40, 0x00eaff, 0x081122);
    grid.position.y = -0.01;
    group.add(grid);

    // Title
    titleLabel = makeTextPlane('CUSTOMIZE', {
        fontSize: 80, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.5, weight: '900'
    });
    titleLabel.position.set(0, 5, 0);
    group.add(titleLabel);

    playerLabel = makeTextPlane('PLAYER 1', {
        fontSize: 72, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.42, weight: '900'
    });
    playerLabel.position.set(0, 4.3, 0);
    playerLabel.visible = false;
    group.add(playerLabel);

    // Palette on Left (Spheres like before)
    var colorPanel = buildColorPanel();
    colorPanel.position.set(-6, 2.5, 0);
    group.add(colorPanel);

    colorNameLabel = makeTextPlane(COLORS[0].name, {
        fontSize: 70, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.4
    });
    colorNameLabel.position.set(-6, 0.1, 0);
    group.add(colorNameLabel);

    // Trails on Right
    var trailPanel = buildTrailPanel();
    trailPanel.position.set(6, 2.5, 0);
    group.add(trailPanel);

    trailNameLabel = makeTextPlane(TRAILS[0].name, {
        fontSize: 70, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.4
    });
    trailNameLabel.position.set(6, 0.1, 0);
    group.add(trailNameLabel);

    // Confirm Button
    var confirmGroup = new THREE.Group();
    confirmGroup.position.set(0, -2.5, 0);
    var btnFrame = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.2 })
    );
    var btnLabel = makeTextPlane('START', { fontSize: 60, color: '#ffffff', worldHeight: 0.3 });
    confirmGroup.add(btnFrame); confirmGroup.add(btnLabel);
    confirmGroup.userData.hoverable = true;
    confirmGroup.userData.action = 'confirm';
    confirmBtn = confirmGroup;
    group.add(confirmGroup);
}

function buildColorPanel() {
    var p = new THREE.Group();
    var title = makeTextPlane('COLOR', { fontSize: 56, color: '#ffe46b', worldHeight: 0.26 });
    title.position.y = 1.9;
    p.add(title);

    var spacing = 0.55;
    var startY = ((COLORS.length - 1) * spacing) / 2;
    COLORS.forEach(function (c, idx) {
        var sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 24, 16),
            new THREE.MeshStandardMaterial({
                color: c.hex, metalness: 0.8, roughness: 0.2,
                emissive: c.hex, emissiveIntensity: 0.5
            })
        );
        sphere.position.set(0, startY - idx * spacing, 0);
        sphere.userData.colorIndex = idx;
        sphere.userData.hoverable = true;
        p.add(sphere);
        colorSwatches.push(sphere);
    });
    return p;
}

function buildTrailPanel() {
    var p = new THREE.Group();
    var title = makeTextPlane('TRAIL', { fontSize: 56, color: '#00eaff', worldHeight: 0.26 });
    title.position.y = 1.9;
    p.add(title);

    var spacing = 0.55;
    var startY = ((TRAILS.length - 1) * spacing) / 2;
    TRAILS.forEach((tr, idx) => {
        var box = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.35, 0.1),
            new THREE.MeshBasicMaterial({ 
                color: 0x888888, 
                wireframe: tr.id === 'wireframe'
            })
        );
        box.position.set(0, startY - idx * spacing, 0);
        box.userData.trailIndex = idx;
        box.userData.hoverable = true;
        p.add(box);
        trailSwatches.push(box);
    });
    return p;
}

export function showCustomize(garageSettings, playerNum) {
    vehicleId = garageSettings.vehicleId;
    colorId = garageSettings.colorId;
    trailId = garageSettings.trailId;

    currentColorIndex = COLORS.findIndex(c => c.id === colorId);
    currentTrailIndex = TRAILS.findIndex(t => t.id === trailId);
    if (currentColorIndex < 0) currentColorIndex = 0;
    if (currentTrailIndex < 0) currentTrailIndex = 0;

    if (playerLabel) {
        if (playerNum === 1 || playerNum === 2) {
            var glow = playerNum === 1 ? '#00eaff' : '#ff2bd6';
            updateTextPlane(playerLabel, 'PLAYER ' + playerNum, {
                fontSize: 72, color: '#ffffff', glowColor: glow, worldHeight: 0.42, weight: '900'
            });
            playerLabel.visible = true;
        } else {
            playerLabel.visible = false;
        }
    }

    group.visible = true;
    rebuildPreview();
}

export function hideCustomize() {
    group.visible = false;
    if (currentTrail) {
        destruirTrail(currentTrail, group);
        currentTrail = null;
    }
}

function rebuildPreview() {
    if (vehicleMesh) group.remove(vehicleMesh);
    if (currentTrail) destruirTrail(currentTrail, group);

    var vDef = findVehicle(vehicleId);
    var color = COLORS[currentColorIndex];
    vehicleMesh = vDef.build(color);
    vehicleMesh.position.set(0, vDef.podiumOffsetY || 0, 0);
    vehicleMesh.rotation.y = Math.PI / 2; // Face sideways (parallel to screen)
    // Veículos têm PointLights próprios para o glow dentro do jogo — no menu
    // ficavam demasiado iluminados, basta o emissivo dos materiais.
    vehicleMesh.traverse(function (child) {
        if (child.isLight) child.intensity = 0;
    });
    group.add(vehicleMesh);

    currentTrail = criarTrail(color.hex, 150, TRAILS[currentTrailIndex].id);
    group.add(currentTrail.mesh);
    
    // Initial points to start the trail
    currentTrail.ultimo = new THREE.Vector3(0, 0, 0);
    
    if (colorNameLabel) {
        updateTextPlane(colorNameLabel, color.name, {
            fontSize: 70, color: '#ffffff', glowColor: '#' + color.hex.toString(16).padStart(6, '0'),
            worldHeight: 0.4
        });
    }
    if (trailNameLabel) {
        updateTextPlane(trailNameLabel, TRAILS[currentTrailIndex].name, {
            fontSize: 70, color: '#ffffff', glowColor: '#00eaff', worldHeight: 0.4
        });
    }

    // Highlight swatches
    colorSwatches.forEach((s, i) => {
        var sel = (i === currentColorIndex);
        s.scale.setScalar(sel ? 1.5 : 1.0);
    });
    trailSwatches.forEach((s, i) => {
        var sel = (i === currentTrailIndex);
        s.scale.setScalar(sel ? 1.5 : 1.0);
        s.material.color.setHex(sel ? 0x00eaff : 0x888888);
    });
}

export function updateCustomize(dt) {
    if (!group.visible) return;
    t += dt;

    // 1. Move Grid sideways
    grid.position.x = (grid.position.x + dt * speed) % 5;

    // 2. Add Trail point at fixed vehicle position
    if (currentTrail) {
        var distToMove = speed * dt;
        // Move the trail group leftwards (X decreasing) as vehicle "moves" right
        currentTrail.mesh.position.x -= distToMove;
        
        // Calculate vehicle's local position in the trail group's space
        // We add an offset of -1.8 on X because the vehicle is rotated 90deg (facing +X)
        var localPos = new THREE.Vector3(-currentTrail.mesh.position.x - 1.8, 0, 0);
        
        adicionarPonto(currentTrail, localPos);
        atualizarTrail(currentTrail, dt, null);
    }

    // Floating effect for vehicle
    if (vehicleMesh) {
        vehicleMesh.position.y = (findVehicle(vehicleId).podiumOffsetY || 0) + Math.sin(t * 4) * 0.05;
    }
}

export function getCustomizeHandler(h) {
    callbacks = h;
    return {
        onKey: function (key) {
            if (key === 'UP' || key === 'W') {
                currentColorIndex = (currentColorIndex - 1 + COLORS.length) % COLORS.length;
                sfxNavigate(); rebuildPreview(); return true;
            }
            if (key === 'DOWN' || key === 'S') {
                currentColorIndex = (currentColorIndex + 1) % COLORS.length;
                sfxNavigate(); rebuildPreview(); return true;
            }
            if (key === 'LEFT' || key === 'A' || key === '[' || key === '{') {
                currentTrailIndex = (currentTrailIndex - 1 + TRAILS.length) % TRAILS.length;
                sfxNavigate(); rebuildPreview(); return true;
            }
            if (key === 'RIGHT' || key === 'D' || key === ']' || key === '}') {
                currentTrailIndex = (currentTrailIndex + 1) % TRAILS.length;
                sfxNavigate(); rebuildPreview(); return true;
            }
            if (key === 'ENTER') {
                sfxConfirm();
                if (callbacks.onConfirm) callbacks.onConfirm({
                    colorId: COLORS[currentColorIndex].id,
                    trailId: TRAILS[currentTrailIndex].id
                });
                return true;
            }
            if (key === 'ESC') {
                sfxBack();
                if (callbacks.onBack) callbacks.onBack({
                    colorId: COLORS[currentColorIndex].id,
                    trailId: TRAILS[currentTrailIndex].id
                });
                return true;
            }
            return false;
        },
        onHover: function (obj) {
            if (!obj) return;
            if (obj.userData.colorIndex !== undefined) {
                if (currentColorIndex !== obj.userData.colorIndex) {
                    currentColorIndex = obj.userData.colorIndex;
                    rebuildPreview();
                }
            }
            if (obj.userData.trailIndex !== undefined) {
                if (currentTrailIndex !== obj.userData.trailIndex) {
                    currentTrailIndex = obj.userData.trailIndex;
                    rebuildPreview();
                }
            }
        },
        onClick: function (obj) {
            if (obj && (obj.userData.action === 'confirm' || obj.parent.userData.action === 'confirm')) {
                sfxConfirm();
                if (callbacks.onConfirm) callbacks.onConfirm({
                    colorId: COLORS[currentColorIndex].id,
                    trailId: TRAILS[currentTrailIndex].id
                });
            }
        }
    };
}

export function getCustomizeHoverables() {
    return [...colorSwatches, ...trailSwatches, confirmBtn.children[0]];
}
