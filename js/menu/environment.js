// Shared synthwave environment used as the backdrop for every menu screen.
// Builds: scrolling neon grid, distant sun glow, starfield, retrowave road,
// distant mountains and atmospheric lights. Exposes update(dt) for animation.

import * as THREE from 'three';

var grid = null;
var stars = null;
var sun = null;
var roadLines = [];
var mountains = null;
var ambientPulse = null;

export function buildEnvironment(scene) {
    var group = new THREE.Group();
    group.name = 'synthwaveEnvironment';

    // --- Background gradient (dark purple to black) ---
    scene.background = new THREE.Color(0x05000d);
    scene.fog = new THREE.Fog(0x05000d, 30, 220);

    // --- Floor grid (neon magenta lines, kept dim and static) ---
    var size = 400;
    var divisions = 80;
    grid = new THREE.GridHelper(size, divisions, 0xff2bd6, 0x331166);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    grid.position.y = -1;
    group.add(grid);

    // Solid dark floor under the grid for depth
    var floorGeo = new THREE.PlaneGeometry(size, size);
    var floorMat = new THREE.MeshBasicMaterial({ color: 0x05000d });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.05;
    group.add(floor);

    // --- Sun (radial gradient sprite) ---
    sun = makeSun();
    sun.position.set(0, 16, -180);
    sun.scale.set(0.8, 0.8, 1);
    group.add(sun);

    // --- Stars ---
    stars = makeStars();
    group.add(stars);

    // --- Distant mountains ---
    mountains = makeMountains();
    mountains.position.set(0, 0, -160);
    group.add(mountains);

    // --- Road surface ---
    // A dark asphalt strip running down the centre of the scene, with two
    // solid white edge lines and a broken centre line (the dashes).
    var roadGroup = new THREE.Group();
    var roadWidth = 8;
    var roadLength = 600;

    var asphaltMat = new THREE.MeshStandardMaterial({
        color: 0x140a1f, roughness: 0.95, metalness: 0.0
    });
    var asphalt = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadLength), asphaltMat);
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.set(0, -0.97, -roadLength / 2 + 30);
    roadGroup.add(asphalt);

    // Solid white edges
    var edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var edgeWidth = 0.18;
    var leftEdge = new THREE.Mesh(new THREE.PlaneGeometry(edgeWidth, roadLength), edgeMat);
    leftEdge.rotation.x = -Math.PI / 2;
    leftEdge.position.set(-roadWidth / 2 + edgeWidth / 2, -0.96, -roadLength / 2 + 30);
    roadGroup.add(leftEdge);
    var rightEdge = leftEdge.clone();
    rightEdge.position.x = roadWidth / 2 - edgeWidth / 2;
    roadGroup.add(rightEdge);

    // Broken centre line (the existing scrolling dashes, now layered on the
    // asphalt instead of free-floating on the grid).
    var dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (var i = 0; i < 40; i++) {
        var dashGeo = new THREE.PlaneGeometry(0.4, 4);
        var dash = new THREE.Mesh(dashGeo, dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, -0.95, -i * 10);
        roadGroup.add(dash);
        roadLines.push(dash);
    }
    group.add(roadGroup);

    // --- Atmospheric lights ---
    // Kept deliberately calm — no per-frame pulsing, lower intensities so the
    // menu doesn't compete with the foreground for the user's attention.
    var ambient = new THREE.AmbientLight(0x332255, 0.55);
    scene.add(ambient);
    ambientPulse = null;

    var dirLight = new THREE.DirectionalLight(0xaa66aa, 0.55);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    var pinkPoint = new THREE.PointLight(0xff2bd6, 0.45, 35);
    pinkPoint.position.set(-15, 6, 5);
    scene.add(pinkPoint);

    var cyanPoint = new THREE.PointLight(0x00eaff, 0.45, 35);
    cyanPoint.position.set(15, 6, 5);
    scene.add(cyanPoint);

    scene.add(group);
    return {
        group: group,
        sun: sun,
        stars: stars,
        grid: grid,
        cyanLight: cyanPoint,
        pinkLight: pinkPoint
    };
}

function makeSun() {
    var canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    var ctx = canvas.getContext('2d');
    var grd = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    grd.addColorStop(0, '#ffe46b');
    grd.addColorStop(0.4, '#ff6ad6');
    grd.addColorStop(0.85, '#7a1f99');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);

    // Horizontal scan bars across the lower half (classic synthwave sun)
    ctx.globalCompositeOperation = 'destination-out';
    for (var y = 256; y < 512; y += 14) {
        var thickness = 5 + Math.floor((y - 256) / 30);
        ctx.fillRect(0, y, 512, thickness);
    }
    ctx.globalCompositeOperation = 'source-over';

    var tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    var mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, toneMapped: false
    });
    var geo = new THREE.PlaneGeometry(60, 60);
    return new THREE.Mesh(geo, mat);
}

function makeStars() {
    var count = 800;
    var positions = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
        var theta = Math.random() * Math.PI * 2;
        // Confine stars to the upper hemisphere only — pick phi in [0, PI/2]
        var phi = Math.random() * (Math.PI * 0.5);
        var r = 130 + Math.random() * 60;
        positions[i*3]     = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3 + 1] = r * Math.cos(phi) + 8;
        positions[i*3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta));
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.7, sizeAttenuation: true,
        transparent: true, opacity: 0.85
    });
    return new THREE.Points(geo, mat);
}

function makeMountains() {
    var group = new THREE.Group();
    // A few wireframe-style triangle silhouettes — distant range.
    var matLine = new THREE.LineBasicMaterial({ color: 0x6a1cb0, transparent: true, opacity: 0.9 });
    for (var i = 0; i < 14; i++) {
        var w = 18 + Math.random() * 14;
        var h = 12 + Math.random() * 10;
        var pts = [
            new THREE.Vector3(-w/2, 0, 0),
            new THREE.Vector3(0, h, 0),
            new THREE.Vector3(w/2, 0, 0)
        ];
        var geo = new THREE.BufferGeometry().setFromPoints(pts);
        var line = new THREE.Line(geo, matLine);
        line.position.set((i - 7) * 22, -1, -10 - Math.random() * 30);
        group.add(line);
    }
    return group;
}

var t = 0;
export function updateEnvironment(dt) {
    t += dt;
    // Scroll the road dashes toward the camera, looping at the horizon
    for (var i = 0; i < roadLines.length; i++) {
        var d = roadLines[i];
        d.position.z += 30 * dt;
        if (d.position.z > 30) d.position.z -= roadLines.length * 10;
    }
    // Grid + ambient kept static. Star drift is the only ambient motion.
    if (stars) stars.rotation.y += dt * 0.005;
}
