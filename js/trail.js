import * as THREE from 'three';

// Trail de luz: lista de meshes individuais (segmentos).
// Suporta diferentes estilos: wireframe (neon grid), sólido (wall) e fita (classic).

const ALTURA_WALL = 0.6;
const ALTURA_RIBBON = 0.15;
const ESPESSURA_TRAIL = 0.3;
const DIST_MIN_DEFAULT = 0.5;

export function criarTrail(cor, comprimentoMax = 300, trailId = 'wireframe') {
    const group = new THREE.Group();
    group.name = 'trailGroup';

    const isWireframe = (trailId === 'wireframe');
    const isRibbon = (trailId === 'ribbon');
    const isCubes = (trailId === 'cubes');

    const material = new THREE.MeshBasicMaterial({
        color: cor,
        wireframe: isWireframe,
        transparent: true,
        opacity: isCubes ? 1.0 : (isRibbon ? 0.9 : 0.8),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
    });

    return {
        id: trailId,
        cor: cor,
        maxLen: comprimentoMax,
        espessura: ESPESSURA_TRAIL,
        altura: isRibbon ? ALTURA_RIBBON : ALTURA_WALL,
        distMin: isCubes ? 0.7 : DIST_MIN_DEFAULT, // Cubos mais próximos
        pontos: [],
        segmentos: [],
        ultimo: null,
        material: material,
        mesh: group
    };
}

export function adicionarPonto(trail, posicao) {
    if (!trail) return;
    
    if (trail.ultimo) {
        const dx = posicao.x - trail.ultimo.x;
        const dz = posicao.z - trail.ultimo.z;
        if (dx * dx + dz * dz < trail.distMin * trail.distMin) return;
    }

    const p = new THREE.Vector3(posicao.x, 0, posicao.z);

    if (trail.id === 'cubes') {
        criarCuboDados(trail, p);
    } else if (trail.ultimo) {
        criarSegmentoMuro(trail, trail.ultimo, p);
    }

    trail.pontos.push(p);
    trail.ultimo = p;

    if (trail.segmentos.length > trail.maxLen) {
        const antigo = trail.segmentos.shift();
        trail.mesh.remove(antigo);
        antigo.geometry.dispose();
        trail.pontos.shift();
    }
}

function criarCuboDados(trail, p) {
    const size = 0.5;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, trail.material);
    mesh.position.copy(p);
    mesh.position.y = 0.6; // Flutua no ar
    mesh.name = "trailSegmentoAtivo";
    
    // Rotação aleatória inicial para parecer mais orgânico
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    trail.mesh.add(mesh);
    trail.segmentos.push(mesh);
}

function criarSegmentoMuro(trail, p1, p2) {
    const dist = p1.distanceTo(p2);
    const geo = new THREE.BoxGeometry(trail.espessura, trail.altura, dist, 1, (trail.id === 'wireframe' ? 4 : 1), 1);
    geo.translate(0, trail.altura / 2, dist / 2);

    const segmento = new THREE.Mesh(geo, trail.material);
    segmento.name = "trailSegmentoAtivo";
    
    segmento.position.copy(p1);
    segmento.lookAt(p2);
    
    trail.mesh.add(segmento);
    trail.segmentos.push(segmento);
}

export function obterSegmentos(trail) {
    return trail ? trail.pontos : [];
}

export function resetarTrail(trail) {
    if (!trail) return;
    while (trail.segmentos.length > 0) {
        const s = trail.segmentos.pop();
        trail.mesh.remove(s);
        s.geometry.dispose();
    }
    trail.pontos.length = 0;
    trail.ultimo = null;
}

export function destruirTrail(trail, cena) {
    if (!trail) return;
    resetarTrail(trail);
    if (cena) cena.remove(trail.mesh);
    trail.material.dispose();
}

export function atualizarTrail(trail, dt) {
    if (!trail || !trail.mesh) return;
    const agora = Date.now();
    const intensidadeTremor = 0.15;
    const velocidadeTremor = 0.05;
    const velocidadePulsoBrilho = 0.005;

    const isCubes = (trail.id === 'cubes');

    trail.segmentos.forEach(objeto => {
        if (isCubes) {
            // Rotação constante para os cubos
            objeto.rotation.x += dt * 1.5;
            objeto.rotation.y += dt * 2;
            // Pulsação individual de escala
            const pulse = 1 + Math.sin(agora * 0.01 + objeto.position.x + objeto.position.z) * 0.3;
            objeto.scale.setScalar(pulse);
        } else {
            // Tremor na largura (X local) para os muros
            const tremorScale = 1 + (Math.sin(agora * velocidadeTremor + objeto.position.x + objeto.position.z) * intensidadeTremor);
            objeto.scale.x = tremorScale;
        }
    });

    // Pulso de brilho no material partilhado (faz os cubos "piscarem" em conjunto)
    trail.material.opacity = 0.6 + Math.sin(agora * velocidadePulsoBrilho) * 0.2;
}

