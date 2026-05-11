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

    return {
        id: trailId,
        cor: cor,
        maxLen: comprimentoMax,
        espessura: ESPESSURA_TRAIL,
        altura: isRibbon ? ALTURA_RIBBON : ALTURA_WALL,
        distMin: (isCubes || isGlitch) ? 0.3 : DIST_MIN_DEFAULT, // Mais denso para glitch
        pontos: [],
        segmentos: [],
        ultimo: null,
        material: material,
        lineMaterial: new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: 1.0, toneMapped: false }),
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
    } else if (trail.id === 'glitch') {
        criarEstilhaco(trail, p);
    } else if (trail.ultimo) {
        criarSegmentoMuro(trail, trail.ultimo, p);
    }

    trail.pontos.push(p);
    trail.ultimo = p;

    if (trail.segmentos.length > trail.maxLen) {
        const antigo = trail.segmentos.shift();
        trail.mesh.remove(antigo);
        // Limpar filhos se houver
        antigo.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
        });
        antigo.geometry.dispose();
        trail.pontos.shift();
    }
}

function criarCuboDados(trail, p) {
    // Cubos mais pequenos conforme pedido para não obstruir a visão em 3ª pessoa
    const size = trail.espessura * 0.8;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, trail.material);
    
    // Posição com flutuação discreta
    mesh.position.copy(p);
    mesh.position.y = 0.4 + (Math.random() - 0.5) * 0.2;
    mesh.name = "trailSegmentoAtivo";
    
    // Rotação aleatória inicial
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    
    trail.mesh.add(mesh);
    trail.segmentos.push(mesh);
}

function criarEstilhaco(trail, p) {
    const size = 0.3 + Math.random() * 0.4;
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, trail.material);
    
    // Spread aleatório lateral e vertical mais contido
    mesh.position.copy(p);
    mesh.position.x += (Math.random() - 0.5) * 0.4;
    mesh.position.y = 0.1 + Math.random() * 0.6;
    mesh.position.z += (Math.random() - 0.5) * 0.4;
    
    // Rotação caótica
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.name = "trailSegmentoAtivo";
    
    trail.mesh.add(mesh);
    trail.segmentos.push(mesh);
}

function criarSegmentoMuro(trail, p1, p2) {
    const dist = p1.distanceTo(p2) + 0.1;
    const isWireframe = (trail.id === 'wireframe');
    
    const subH = isWireframe ? 4 : 1;
    const subL = 1;
    
    const geo = new THREE.BoxGeometry(trail.espessura, trail.altura, dist, 1, subH, subL);
    geo.translate(0, trail.altura / 2, dist / 2 - 0.05);

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
        s.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
        });
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
    if (trail.lineMaterial) trail.lineMaterial.dispose();
}

export function atualizarTrail(trail, dt, camara) {
    if (!trail || !trail.mesh) return;
    const agora = Date.now();
    const velocidadePulsoBrilho = 0.005;

    const isCubes = (trail.id === 'cubes');
    const isWireframe = (trail.id === 'wireframe');
    const isGlitch = (trail.id === 'glitch');

    trail.segmentos.forEach(objeto => {
        if (isCubes) {
            objeto.rotation.x += dt * 1.5;
            objeto.rotation.y += dt * 2;
            
            // Pulso base
            const pulse = 1 + Math.sin(agora * 0.01 + objeto.position.x + objeto.position.z) * 0.15;
            
            // Escala dinâmica baseada na distância da câmara para manter visibilidade
            let finalScale = pulse;
            if (camara) {
                const distCam = objeto.position.distanceTo(camara.position);
                // Compensa o tamanho se estivermos longe (câmara aérea)
                const fatorCompensacao = Math.max(1.0, distCam / 25.0); 
                finalScale *= fatorCompensacao;
            }
            
            objeto.scale.setScalar(finalScale);
        } else if (isGlitch) {
            // Rotação lenta para os estilhaços
            objeto.rotation.x += dt * 0.5;
            objeto.rotation.z += dt * 0.3;
            
            // Compensação de escala para glitch também
            if (camara) {
                const distCam = objeto.position.distanceTo(camara.position);
                const scale = Math.max(1.0, distCam / 30.0);
                objeto.scale.setScalar(scale);
            }
        } else if (isWireframe) {
            const intensidadeTremor = 0.15;
            const velocidadeTremor = 0.05;
            const tremorScale = 1 + (Math.sin(agora * velocidadeTremor + objeto.position.x + objeto.position.z) * intensidadeTremor);
            objeto.scale.x = tremorScale;
        } else {
            objeto.scale.x = 1.0;
        }
    });

    trail.material.opacity = 0.7 + Math.sin(agora * velocidadePulsoBrilho) * 0.15;
}
