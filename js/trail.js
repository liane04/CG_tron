import * as THREE from 'three';

// Trail de luz tipo "cauda de cobra": fila FIFO de pontos com tamanho máximo.
// Geometria é uma ribbon de quads (2 vértices por ponto) construída no plano XZ
// com largura constante. O buffer é de tamanho fixo — só atualizamos posições
// e o drawRange à medida que a cauda cresce/encolhe.

const ALTURA_TRAIL = 0.25;
const LARGURA_DEFAULT = 0.3;
const DIST_MIN_DEFAULT = 0.3;

export function criarTrail(cor, comprimentoMax = 300) {
    const maxLen = Math.max(2, comprimentoMax | 0);

    const positions = new Float32Array(maxLen * 2 * 3);
    const numQuads = maxLen - 1;
    const indices = new Uint16Array(numQuads * 6);
    for (let i = 0; i < numQuads; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        indices[i * 6 + 0] = a;
        indices[i * 6 + 1] = b;
        indices[i * 6 + 2] = c;
        indices[i * 6 + 3] = b;
        indices[i * 6 + 4] = d;
        indices[i * 6 + 5] = c;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setDrawRange(0, 0);

    const material = new THREE.MeshBasicMaterial({
        color: cor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;

    return {
        cor: cor,
        maxLen: maxLen,
        largura: LARGURA_DEFAULT,
        distMin: DIST_MIN_DEFAULT,
        pontos: [],
        ultimo: null,
        positions: positions,
        geometry: geometry,
        material: material,
        mesh: mesh
    };
}

export function adicionarPonto(trail, posicao) {
    if (!trail) return;
    if (trail.ultimo) {
        const dx = posicao.x - trail.ultimo.x;
        const dz = posicao.z - trail.ultimo.z;
        if (dx * dx + dz * dz < trail.distMin * trail.distMin) return;
    }
    const p = new THREE.Vector3(posicao.x, ALTURA_TRAIL, posicao.z);
    trail.pontos.push(p);
    trail.ultimo = p;
    if (trail.pontos.length > trail.maxLen) trail.pontos.shift();
    reconstruirGeometria(trail);
}

function reconstruirGeometria(trail) {
    const pontos = trail.pontos;
    const half = trail.largura * 0.5;
    const positions = trail.positions;
    const n = pontos.length;

    for (let i = 0; i < n; i++) {
        const p = pontos[i];
        let tx, tz;
        if (n === 1) {
            tx = 1; tz = 0;
        } else if (i === 0) {
            tx = pontos[1].x - p.x;
            tz = pontos[1].z - p.z;
        } else if (i === n - 1) {
            tx = p.x - pontos[i - 1].x;
            tz = p.z - pontos[i - 1].z;
        } else {
            tx = pontos[i + 1].x - pontos[i - 1].x;
            tz = pontos[i + 1].z - pontos[i - 1].z;
        }
        const len = Math.hypot(tx, tz) || 1;
        tx /= len; tz /= len;
        const px = -tz * half;
        const pz =  tx * half;

        const off = i * 6;
        positions[off + 0] = p.x + px;
        positions[off + 1] = ALTURA_TRAIL;
        positions[off + 2] = p.z + pz;
        positions[off + 3] = p.x - px;
        positions[off + 4] = ALTURA_TRAIL;
        positions[off + 5] = p.z - pz;
    }

    trail.geometry.attributes.position.needsUpdate = true;
    const numQuads = Math.max(0, n - 1);
    trail.geometry.setDrawRange(0, numQuads * 6);
    if (n > 0) trail.geometry.computeBoundingSphere();
}

export function obterSegmentos(trail) {
    return trail ? trail.pontos : [];
}

export function resetarTrail(trail) {
    if (!trail) return;
    trail.pontos.length = 0;
    trail.ultimo = null;
    trail.geometry.setDrawRange(0, 0);
}

export function destruirTrail(trail, cena) {
    if (!trail) return;
    if (cena && trail.mesh.parent === cena) cena.remove(trail.mesh);
    else if (trail.mesh.parent) trail.mesh.parent.remove(trail.mesh);
    trail.geometry.dispose();
    trail.material.dispose();
    trail.pontos.length = 0;
    trail.ultimo = null;
}
