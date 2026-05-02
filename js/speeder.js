// Speeder X1 — sleek low-slung car. In-game vehicle following the same
// Group convention as mota.js (front faces -Z, scaled root group).

import * as THREE from 'three';

const _speederAnimData = [];

export function atualizarSpeeder(delta) {
    const t = performance.now() * 0.001;
    for (const d of _speederAnimData) {
        // Underglow strip pulse
        if (d.glow) d.glow.material.opacity = 0.7 + Math.sin(t * 4) * 0.25;
        // Engine intake exhaust flicker
        if (d.exhaust) d.exhaust.material.emissiveIntensity = 1.6 + Math.sin(t * 12) * 0.6;
    }
}

export function criarSpeeder(corNeon = 0x00ffff) {
    const ESCALA = 0.6;
    const raiz = new THREE.Group();
    const corpo = new THREE.Group();
    raiz.add(corpo);
    raiz.scale.set(ESCALA, ESCALA, ESCALA);

    // Body materials
    const matNeon = new THREE.MeshStandardMaterial({
        color: corNeon, emissive: corNeon, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.85
    });
    const matChassis = new THREE.MeshStandardMaterial({
        color: 0x111122, roughness: 0.6, metalness: 0.7
    });
    const matEdge = new THREE.LineBasicMaterial({ color: corNeon, transparent: true, opacity: 0.95 });

    // Lower hull (long sleek box)
    const lower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 1.4), matNeon);
    lower.position.set(0, 0.35, 0);
    lower.castShadow = true;
    corpo.add(lower);
    corpo.add(new THREE.LineSegments(new THREE.EdgesGeometry(lower.geometry), matEdge));

    // Cabin (cabin shifted backward toward +Z because front is -Z; but in this
    // design front is along -X relative to the build, so we orient at the end)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.0), matChassis);
    cabin.position.set(-0.1, 0.78, 0);
    cabin.castShadow = true;
    corpo.add(cabin);
    corpo.add(new THREE.LineSegments(new THREE.EdgesGeometry(cabin.geometry), matEdge));

    // Front nose wedge
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 4), matNeon);
    nose.position.set(2.0, 0.4, 0);
    nose.rotation.z = -Math.PI / 2;
    nose.scale.set(1.0, 1.6, 0.6);
    nose.castShadow = true;
    corpo.add(nose);

    // Underglow strip
    const glow = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.05, 0.9),
        new THREE.MeshBasicMaterial({ color: corNeon, transparent: true, opacity: 0.85, toneMapped: false })
    );
    glow.position.y = 0.1;
    corpo.add(glow);

    // Rear exhaust block
    const exhaust = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.25, 0.7),
        new THREE.MeshStandardMaterial({
            color: 0xff4488, emissive: 0xff4488, emissiveIntensity: 1.6,
            roughness: 0.2, metalness: 0.5
        })
    );
    exhaust.position.set(-1.7, 0.55, 0);
    corpo.add(exhaust);

    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 18);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.6, metalness: 0.4 });
    [
        [-1.1, 0.32, 0.7], [1.0, 0.32, 0.7],
        [-1.1, 0.32, -0.7], [1.0, 0.32, -0.7]
    ].forEach(p => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        corpo.add(w);
    });

    // The procedural build above has its forward direction along +X. Rotate the
    // whole body so forward is along -Z, matching the convention used by mota.js
    // and the input system.
    corpo.rotation.y = Math.PI / 2;

    _speederAnimData.push({ glow: glow, exhaust: exhaust });
    return raiz;
}
