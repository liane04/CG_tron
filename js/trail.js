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
    const isGlitch = (trailId === 'glitch');

    const material = new THREE.MeshBasicMaterial({
        color: cor,
        wireframe: isWireframe,
        transparent: !isRibbon,
        opacity: 1.0,
        blending: isRibbon ? THREE.NormalBlending : THREE.AdditiveBlending,
        side: isGlitch ? THREE.DoubleSide : THREE.FrontSide,
        depthWrite: (isRibbon || isGlitch),
        toneMapped: false
    });

    // Criar geometria partilhada única para este trail
    let baseGeo;
    if (isCubes) {
        const size = ESPESSURA_TRAIL * 0.8;
        baseGeo = new THREE.BoxGeometry(size, size, size);
    } else if (isGlitch) {
        baseGeo = new THREE.PlaneGeometry(1, 1);
    } else {
        const altura = isRibbon ? ALTURA_RIBBON : ALTURA_WALL;
        const subH = isWireframe ? 4 : 1;
        baseGeo = new THREE.BoxGeometry(ESPESSURA_TRAIL, altura, 1, 1, subH, 1);
        baseGeo.translate(0, altura / 2, 0.5 - 0.05);
    }

    const pool = [];
    for (let i = 0; i <= comprimentoMax; i++) {
        const mesh = new THREE.Mesh(baseGeo, material);
        mesh.visible = false;
        mesh.name = "trailSegmentoInativo";
        group.add(mesh);
        pool.push(mesh);
    }

    return {
        id: trailId,
        cor: cor,
        maxLen: comprimentoMax,
        espessura: ESPESSURA_TRAIL,
        altura: isRibbon ? ALTURA_RIBBON : ALTURA_WALL,
        distMin: (isCubes || isGlitch) ? 0.3 : DIST_MIN_DEFAULT,
        pontos: [],
        segmentos: [],
        ultimo: null,
        material: material,
        lineMaterial: new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 1.0, toneMapped: false }),
        mesh: group,
        baseGeo: baseGeo,
        pool: pool
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

    // Obter uma mesh da pool
    let mesh = trail.pool.pop();
    if (!mesh) {
        mesh = new THREE.Mesh(trail.baseGeo, trail.material);
        trail.mesh.add(mesh);
    }

    mesh.visible = true;
    mesh.name = "trailSegmentoAtivo";

    if (trail.id === 'cubes') {
        mesh.position.copy(p);
        mesh.position.y = 0.4 + (Math.random() - 0.5) * 0.2;
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.scale.setScalar(1.0);
        mesh.userData.baseSize = 1.0;
    } else if (trail.id === 'glitch') {
        const size = 0.3 + Math.random() * 0.4;
        mesh.position.copy(p);
        mesh.position.x += (Math.random() - 0.5) * 0.4;
        mesh.position.y = 0.1 + Math.random() * 0.6;
        mesh.position.z += (Math.random() - 0.5) * 0.4;
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        mesh.scale.set(size, size, 1);
        mesh.userData.baseSize = size;
    } else if (trail.ultimo) {
        const dist = trail.ultimo.distanceTo(p) + 0.1;
        mesh.position.copy(trail.ultimo);
        mesh.lookAt(p);
        mesh.scale.set(1, 1, dist);
    } else {
        // Primeiro ponto (sem trail.ultimo), apenas esconde e guarda na pool
        mesh.visible = false;
        mesh.name = "trailSegmentoInativo";
        trail.pool.push(mesh);
        trail.pontos.push(p);
        trail.ultimo = p;
        return;
    }

    trail.pontos.push(p);
    trail.ultimo = p;
    trail.segmentos.push(mesh);

    if (trail.segmentos.length > trail.maxLen) {
        const antigo = trail.segmentos.shift();
        antigo.visible = false;
        antigo.name = "trailSegmentoInativo";
        trail.pool.push(antigo);
        trail.pontos.shift();
    }
}

export function obterSegmentos(trail) {
    return trail ? trail.pontos : [];
}

export function resetarTrail(trail) {
    if (!trail) return;
    while (trail.segmentos.length > 0) {
        const s = trail.segmentos.pop();
        s.visible = false;
        s.name = "trailSegmentoInativo";
        trail.pool.push(s);
    }
    trail.pontos.length = 0;
    trail.ultimo = null;
}

export function destruirTrail(trail, cena) {
    if (!trail) return;
    resetarTrail(trail);
    if (cena) cena.remove(trail.mesh);
    trail.material.dispose();
    if (trail.lineMaterial) trail.lineMaterial.dispose();
    if (trail.baseGeo) trail.baseGeo.dispose();
}

export function atualizarTrail(trail, dt, camara) {
    if (!trail || !trail.mesh) return;
    const agora = Date.now();
    const velocidadePulsoBrilho = 0.005;

    const isCubes = (trail.id === 'cubes');
    const isWireframe = (trail.id === 'wireframe');
    const isGlitch = (trail.id === 'glitch');

    // Pulso de opacidade aplica-se ao material partilhado, válido para todos os estilos.
    trail.material.opacity = 0.7 + Math.sin(agora * velocidadePulsoBrilho) * 0.15;

    // Estilos estáticos (wall/ribbon) não animam segmentos — saltar 300 iterações.
    if (!isCubes && !isWireframe && !isGlitch) return;

    trail.segmentos.forEach(objeto => {
        if (isCubes) {
            objeto.rotation.x += dt * 1.5;
            objeto.rotation.y += dt * 2;
            
            // Pulso base
            const pulse = 1 + Math.sin(agora * 0.01 + objeto.position.x + objeto.position.z) * 0.15;
            
            let fatorCompensacao = 1.0;
            if (camara) {
                if (camara.isOrthographicCamera) {
                    fatorCompensacao = 1.0;
                } else {
                    const distCam = objeto.position.distanceTo(camara.position);
                    fatorCompensacao = THREE.MathUtils.clamp(distCam / 20.0, 0.5, 1.8);
                }
            }
            
            const finalScale = pulse * fatorCompensacao * (objeto.userData.baseSize || 1.0);
            objeto.scale.setScalar(finalScale);
        } else if (isGlitch) {
            // Rotação lenta para os estilhaços
            objeto.rotation.x += dt * 0.5;
            objeto.rotation.z += dt * 0.3;
            
            let fatorGlitch = 1.0;
            if (camara) {
                if (camara.isOrthographicCamera) {
                    fatorGlitch = 1.0;
                } else {
                    const distCam = objeto.position.distanceTo(camara.position);
                    fatorGlitch = THREE.MathUtils.clamp(distCam / 25.0, 0.5, 1.8);
                }
            }
            const base = objeto.userData.baseSize || 0.5;
            objeto.scale.set(base * fatorGlitch, base * fatorGlitch, 1);
        } else if (isWireframe) {
            const intensidadeTremor = 0.15;
            const velocidadeTremor = 0.05;
            const tremorScale = 1 + (Math.sin(agora * velocidadeTremor + objeto.position.x + objeto.position.z) * intensidadeTremor);
            objeto.scale.x = tremorScale;
        }
    });
}
