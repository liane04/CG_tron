// Minimal Tron-inspired backdrop. Just enough to give the menu depth without
// competing with the foreground UI: grid floor, sun, stars, soft lights.

import * as THREE from 'three';

var stars = null;
var grid = null;
var pinkLight = null;
var cyanLight = null;

var t = 0;

export function buildEnvironment(scene) {
    var group = new THREE.Group();
    group.name = 'tronEnvironment';

    // Background gradient
    scene.background = makeBackgroundTexture();
    scene.fog = new THREE.Fog(0x040214, 80, 280);

    // --- Floor: dark base + Tron grid ---
    var size = 600;
    var divisions = 100;

    var floorGeo = new THREE.PlaneGeometry(size, size);
    var floorMat = new THREE.MeshStandardMaterial({
        color: 0x070318, roughness: 0.55, metalness: 0.3
    });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.02;
    group.add(floor);

    grid = new THREE.GridHelper(size, divisions, 0x00eaff, 0x00eaff);
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    grid.material.toneMapped = false;
    grid.material.depthWrite = false;
    grid.position.y = -1.0;
    group.add(grid);

    // --- Stars ---
    stars = makeStars();
    group.add(stars);

    // --- Lights ---
    var ambient = new THREE.AmbientLight(0x221144, 0.55);
    scene.add(ambient);

    var dirLight = new THREE.DirectionalLight(0x99aaff, 0.45);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    pinkLight = new THREE.PointLight(0xff2bd6, 1.0, 50);
    pinkLight.position.set(-12, 6, 4);
    scene.add(pinkLight);

    cyanLight = new THREE.PointLight(0x00eaff, 1.0, 50);
    cyanLight.position.set(12, 6, 4);
    scene.add(cyanLight);

    scene.add(group);
    return {
        group: group, stars: stars, grid: grid,
        cyanLight: cyanLight, pinkLight: pinkLight
    };
}

function makeBackgroundTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = 8; canvas.height = 256;
    var ctx = canvas.getContext('2d');
    var grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0.00, '#000008');
    grd.addColorStop(0.40, '#0a0220');
    grd.addColorStop(0.70, '#1a0635');
    grd.addColorStop(0.88, '#3d0a55');
    grd.addColorStop(1.00, '#150028');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 8, 256);
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function makeStars() {
    var count = 700;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.random() * (Math.PI * 0.5);
        var r = 140 + Math.random() * 80;
        positions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3 + 1] = r * Math.cos(phi) + 6;
        positions[i*3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta));
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.7, sizeAttenuation: true,
        transparent: true, opacity: 0.85, depthWrite: false
    });
    return new THREE.Points(geo, mat);
}

export function updateEnvironment(dt) {
    t += dt;
    if (stars) stars.rotation.y += dt * 0.004;
    if (pinkLight) pinkLight.intensity = 0.9 + Math.sin(t * 1.0) * 0.2;
    if (cyanLight) cyanLight.intensity = 0.9 + Math.sin(t * 1.0 + Math.PI) * 0.2;
}
