// Glider V9 — hovercraft pod. In-game vehicle. Same Group convention as
// mota.js (front faces -Z, scaled root group).

import * as THREE from 'three';

const _gliderAnimData = [];

export function atualizarGlider(delta) {
    const t = performance.now() * 0.001;
    for (const d of _gliderAnimData) {
        if (d.hover) d.hover.position.y = Math.sin(t * 1.6) * 0.12;
        if (d.ring) d.ring.material.opacity = 0.7 + Math.sin(t * 5) * 0.25;
        for (const fin of d.fins) {
            fin.rotation.x = Math.sin(t * 2.5 + fin.userData.offset) * 0.15;
        }
    }
}

export function criarGlider(corNeon = 0x00ffff) {
    const ESCALA = 0.6;
    const raiz = new THREE.Group();
    const hover = new THREE.Group();
    raiz.add(hover);
    raiz.scale.set(ESCALA, ESCALA, ESCALA);

    const matBody = new THREE.MeshStandardMaterial({
        color: corNeon, emissive: corNeon, emissiveIntensity: 0.55,
        roughness: 0.3, metalness: 0.7
    });
    const matCanopy = new THREE.MeshStandardMaterial({
        color: 0x111133, transparent: true, opacity: 0.55,
        roughness: 0.1, metalness: 0.6
    });

    // Hover pod (squashed sphere)
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.95, 24, 16), matBody);
    pod.scale.set(1.7, 0.7, 1.0);
    pod.position.y = 0.95;
    pod.castShadow = true;
    hover.add(pod);

    // Canopy
    const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        matCanopy
    );
    canopy.position.set(0.05, 1.2, 0);
    hover.add(canopy);

    // Underside hover ring (always-on emissive)
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 1.2, 32),
        new THREE.MeshBasicMaterial({
            color: corNeon, side: THREE.DoubleSide,
            toneMapped: false, transparent: true, opacity: 0.85
        })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    hover.add(ring);

    // Stabiliser fins (with subtle wobble)
    const fins = [];
    [-1, 1].forEach(s => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.1), matBody);
        fin.position.set(-1.3, 1.0, s * 0.7);
        fin.userData.offset = s;
        hover.add(fin);
        fins.push(fin);
    });

    // Front "headlight" beacon
    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    );
    beacon.position.set(1.55, 0.95, 0);
    hover.add(beacon);

    // Rotate so forward is -Z (matches mota.js convention used by input.js)
    hover.rotation.y = Math.PI / 2;

    _gliderAnimData.push({ hover: hover, ring: ring, fins: fins });
    return raiz;
}
