import * as THREE from 'three';

export function adicionarObjetosDeserto(grupo, ARENA) {
    // Aqui usas as tuas BoxGeometry e CylinderGeometry
    const geo = new THREE.BoxGeometry(2, 5, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const pilar = new THREE.Mesh(geo, mat);
    pilar.position.set(15, 2.5, 15);
    pilar.castShadow = true;
    grupo.add(pilar);
}