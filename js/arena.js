import * as THREE from 'three';

export function criarArena(cena, ARENA, mapa) {
    var grupo = new THREE.Group();
    var loader = new THREE.TextureLoader();

    // --- Chão ---
    var geoChao = new THREE.PlaneGeometry(ARENA, ARENA);
    var matChao;

    if (mapa.texturas) {
        var texDiff   = loader.load(mapa.texturas.diffuse);
        var texNormal = loader.load(mapa.texturas.normal);
        var texRough  = loader.load(mapa.texturas.rough);

        [texDiff, texNormal, texRough].forEach(function (t) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(8, 8);
        });

        matChao = new THREE.MeshStandardMaterial({
            map: texDiff,
            normalMap: texNormal,
            roughnessMap: texRough,
            roughness: 1.0,
        });
    } else {
        matChao = new THREE.MeshStandardMaterial({
            color: mapa.corChao,
            roughness: 0.9,
            metalness: 0.2
        });
    }

    var chao = new THREE.Mesh(geoChao, matChao);
    chao.rotation.x = -Math.PI / 2;
    grupo.add(chao);

    // --- Grid neon (apenas em mapas que o pedem) ---
    if (mapa.mostrarGrid) {
        var grid = new THREE.GridHelper(ARENA, ARENA / 2, mapa.corGrid1, mapa.corGrid2);
        grid.position.y = 0.02;
        grupo.add(grid);
    }

    // --- Paredes ---
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

    cena.add(grupo);
    return grupo;
}
