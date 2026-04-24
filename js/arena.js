import * as THREE from 'three';

/**
 * Cria a estrutura base da arena (chão, grid e paredes padrão).
 * Os objetos decorativos específicos foram movidos para a pasta /objetos/
 * para facilitar a organização.
 */
export function criarArena(cena, ARENA, mapa) {
    var grupo = new THREE.Group();
    var loader = new THREE.TextureLoader();
    var ehJungle  = (mapa.id === 'jungle');
    var ehGelo    = (mapa.id === 'gelo');

    // --- Chão ---
    var geoChao = ehJungle
        ? new THREE.PlaneGeometry(ARENA, ARENA, 20, 20)
        : new THREE.PlaneGeometry(ARENA, ARENA);
    var matChao;

    if (mapa.texturas) {
        var texDiff   = loader.load(mapa.texturas.diffuse);
        var texNormal = loader.load(mapa.texturas.normal);
        var texRough  = loader.load(mapa.texturas.rough);

        [texDiff, texNormal, texRough].forEach(function (t) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(4, 4);
        });

        matChao = new THREE.MeshStandardMaterial({
            normalMap: ehGelo ? texNormal : undefined,
            map: ehGelo ? null : texDiff,
            roughnessMap: ehGelo ? null : texRough,
            color: ehGelo ? 0x9bc4d8 : 0xffffff,
            roughness: ehGelo ? 0.25 : 1.0,
            metalness: ehGelo ? 0.15 : 0.0,
        });
    } else {
        matChao = new THREE.MeshStandardMaterial({
            color: mapa.corChao,
            roughness: 0.9,
            metalness: 0.2
        });
    }

    if (ehJungle) {
        var posChao = geoChao.attributes.position;
        for (var iv = 0; iv < posChao.count; iv++) {
            var zLocal = posChao.getZ(iv);
            posChao.setZ(iv, zLocal + (Math.random() * 0.3 - 0.15));
        }
        posChao.needsUpdate = true;
        geoChao.computeVertexNormals();
    }

    var chao = new THREE.Mesh(geoChao, matChao);
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    grupo.add(chao);

    // --- Grid neon ---
    if (mapa.mostrarGrid) {
        var grid = new THREE.GridHelper(ARENA, ARENA / 2, mapa.corGrid1, mapa.corGrid2);
        grid.position.y = 0.02;
        grupo.add(grid);
    }

    // --- Paredes padrão (apenas se não houver um sistema de paredes específico no objeto da arena) ---
    // Note: Space ainda usa as paredes padrão. Deserto, Jungle e Gelo agora injetam as suas próprias.
    if (mapa.id !== 'deserto' && mapa.id !== 'jungle' && mapa.id !== 'gelo') {
        construirParedesPadrao(grupo, ARENA, mapa);
    }

    // --- Estrelas ---
    if (mapa.mostrarStars) {
        construirEstrelas(grupo);
    }

    cena.add(grupo);
    return grupo;
}

// ---------------------------------------------------------------
// Paredes padrão
// ---------------------------------------------------------------
function construirParedesPadrao(grupo, ARENA, mapa) {
    var alturaParede = 2.0;
    var espessuraParede = 0.2;
    var metade = ARENA / 2;

    var matParede = new THREE.MeshStandardMaterial({
        color: mapa.corParede,
        emissive: mapa.emissividadeParede > 0 ? mapa.corParede : 0x000000,
        emissiveIntensity: mapa.emissividadeParede,
        transparent: mapa.opacidadeParede < 1.0,
        opacity: mapa.opacidadeParede,
        roughness: 0.8,
    });
    var matOutline = new THREE.LineBasicMaterial({ color: mapa.corParede });

    var paredes = [
        { pos: [0, alturaParede / 2, metade],  rot: [0, 0, 0],           tam: [ARENA, alturaParede, espessuraParede] },
        { pos: [0, alturaParede / 2, -metade], rot: [0, 0, 0],           tam: [ARENA, alturaParede, espessuraParede] },
        { pos: [metade, alturaParede / 2, 0],  rot: [0, Math.PI / 2, 0], tam: [ARENA, alturaParede, espessuraParede] },
        { pos: [-metade, alturaParede / 2, 0], rot: [0, Math.PI / 2, 0], tam: [ARENA, alturaParede, espessuraParede] }
    ];

    for (var i = 0; i < paredes.length; i++) {
        var cfg = paredes[i];
        var geoParede = new THREE.BoxGeometry(cfg.tam[0], cfg.tam[1], cfg.tam[2]);
        var parede = new THREE.Mesh(geoParede, matParede);
        parede.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        parede.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        grupo.add(parede);
        var edges = new THREE.EdgesGeometry(geoParede);
        var outline = new THREE.LineSegments(edges, matOutline);
        outline.position.copy(parede.position);
        outline.rotation.copy(parede.rotation);
        grupo.add(outline);
    }
}

// ---------------------------------------------------------------
// Estrelas
// ---------------------------------------------------------------
function construirEstrelas(grupo) {
    var numStars = 1500;
    var posStars = new Float32Array(numStars * 3);
    for (var s = 0; s < numStars; s++) {
        var theta = Math.random() * 2 * Math.PI;
        var phi = Math.acos(2 * Math.random() - 1);
        var r = 80 + Math.random() * 120;
        posStars[s * 3]     = r * Math.sin(phi) * Math.cos(theta);
        posStars[s * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        posStars[s * 3 + 2] = r * Math.cos(phi);
    }
    var geoStars = new THREE.BufferGeometry();
    geoStars.setAttribute('position', new THREE.BufferAttribute(posStars, 3));
    var matStars = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    var stars = new THREE.Points(geoStars, matStars);
    grupo.add(stars);
}
