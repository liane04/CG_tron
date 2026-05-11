// Speeder X1 — carro cyberpunk desportivo construído inteiramente a partir
// das primitivas de Three.js (Box, Cylinder, Cone, Sphere, Torus, Ring, Plane).
// Texturizado com uma mistura de materiais nativos (emissivos para neon,
// faróis e luzes traseiras) e texturas PBR importadas:
//   - textures/neon/metal scifi1 (Metal_Plate_040) → chassis
//   - textures/neon/metal scifi2 (Greeble_Techno_001) → painéis técnicos
//   - textures/neon/vidro (Glass_Window_003)        → para-brisas e vidros
// A convenção (front = -Z) segue mota.js e o sistema de input.

import * as THREE from 'three';

const _speederAnimData = [];

export function atualizarSpeeder(delta) {
    const t = performance.now() * 0.001;
    for (const d of _speederAnimData) {
        if (d.underglow) d.underglow.material.opacity = 0.55 + Math.sin(t * 3.2) * 0.2;
        if (d.escapes) {
            const pulso = 1.4 + Math.sin(t * 10) * 0.6;
            for (const e of d.escapes) e.material.emissiveIntensity = pulso;
        }
        if (d.taillights) {
            const tail = 1.0 + Math.sin(t * 5) * 0.3;
            for (const l of d.taillights) l.material.emissiveIntensity = tail;
        }
        if (d.rodas) {
            for (const r of d.rodas) r.rotation.x += delta * 6.0;
        }
    }
}

export function criarSpeeder(corNeon = 0x00ffff) {
    const ESCALA = 0.6;
    const raiz = new THREE.Group();
    const corpo = new THREE.Group();
    raiz.add(corpo);
    raiz.scale.set(ESCALA, ESCALA, ESCALA);

    // ─── Texturas PBR ──────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();

    const pathChassi  = './textures/neon/metal scifi1/Metal_Plate_040_';
    const texChDiff   = loader.load(pathChassi + 'basecolor.jpg');
    const texChNor    = loader.load(pathChassi + 'normal.jpg');
    const texChRou    = loader.load(pathChassi + 'roughness.jpg');
    const texChMet    = loader.load(pathChassi + 'metallic.jpg');
    const texChAO     = loader.load(pathChassi + 'ambientOcclusion.jpg');

    const pathGreeble = './textures/neon/metal scifi2/Greeble_Techno_001_';
    const texGrDiff   = loader.load(pathGreeble + 'basecolor.jpg');
    const texGrNor    = loader.load(pathGreeble + 'normal.jpg');
    const texGrRou    = loader.load(pathGreeble + 'roughness.jpg');
    const texGrMet    = loader.load(pathGreeble + 'metallic.jpg');

    const pathVidro   = './textures/neon/vidro/Glass_Window_003_';
    const texViDiff   = loader.load(pathVidro + 'basecolor.jpg');
    const texViNor    = loader.load(pathVidro + 'normal.jpg');
    const texViRou    = loader.load(pathVidro + 'roughness.jpg');
    const texViOpa    = loader.load(pathVidro + 'opacity.jpg');

    [texChDiff, texChNor, texChRou, texChMet, texChAO,
     texGrDiff, texGrNor, texGrRou, texGrMet,
     texViDiff, texViNor, texViRou, texViOpa].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 8;
    });
    [texChDiff, texChNor, texChRou, texChMet, texChAO].forEach(t => t.repeat.set(2, 1));
    [texGrDiff, texGrNor, texGrRou, texGrMet].forEach(t => t.repeat.set(1.5, 1));

    // ─── Materiais ─────────────────────────────────────────────────────────
    const matChassi = new THREE.MeshStandardMaterial({
        map: texChDiff, normalMap: texChNor, roughnessMap: texChRou,
        metalnessMap: texChMet, aoMap: texChAO,
        color: 0x222233, metalness: 1.0, roughness: 0.45
    });

    const matGreeble = new THREE.MeshStandardMaterial({
        map: texGrDiff, normalMap: texGrNor, roughnessMap: texGrRou,
        metalnessMap: texGrMet,
        color: 0x444455, metalness: 0.9, roughness: 0.55
    });

    const matVidro = new THREE.MeshPhysicalMaterial({
        map: texViDiff, normalMap: texViNor, roughnessMap: texViRou,
        alphaMap: texViOpa,
        color: 0x223344, transparent: true, opacity: 0.55,
        roughness: 0.1, metalness: 0.4, transmission: 0.4
    });

    // Materiais nativos (sem textura) — neon, luzes, pneus
    const matNeon = new THREE.MeshStandardMaterial({
        color: corNeon, emissive: corNeon, emissiveIntensity: 1.4,
        metalness: 0.3, roughness: 0.35, toneMapped: false
    });
    const matFarol = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false
    });
    const matTaillight = new THREE.MeshStandardMaterial({
        color: 0xff2244, emissive: 0xff2244, emissiveIntensity: 1.0,
        roughness: 0.3, metalness: 0.2, toneMapped: false
    });
    const matEscape = new THREE.MeshStandardMaterial({
        color: 0xff7733, emissive: 0xff5522, emissiveIntensity: 1.4,
        roughness: 0.3, metalness: 0.5, toneMapped: false
    });
    const matPneu = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a, roughness: 0.95, metalness: 0.05
    });
    const matJante = new THREE.MeshStandardMaterial({
        color: 0xbbbbcc, metalness: 1.0, roughness: 0.25
    });
    const matEdge = new THREE.LineBasicMaterial({
        color: corNeon, transparent: true, opacity: 0.85
    });

    // helper: adicionar arestas neon para a silhueta cyber
    function addEdges(mesh, mat) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), mat || matEdge);
        e.position.copy(mesh.position);
        e.rotation.copy(mesh.rotation);
        e.scale.copy(mesh.scale);
        corpo.add(e);
    }

    // ─── Chassis inferior (Box) ────────────────────────────────────────────
    const chassisInf = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 1.5), matChassi);
    chassisInf.position.set(0, 0.4, 0);
    chassisInf.castShadow = true;
    chassisInf.geometry.setAttribute('uv2', chassisInf.geometry.attributes.uv);
    corpo.add(chassisInf);
    addEdges(chassisInf);

    // ─── Hood (Box) com painel greeble ─────────────────────────────────────
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.3), matGreeble);
    hood.position.set(0.85, 0.72, 0);
    hood.castShadow = true;
    corpo.add(hood);

    // ─── Cockpit / cabine (Box) ────────────────────────────────────────────
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.15), matChassi);
    cabin.position.set(-0.1, 0.95, 0);
    cabin.castShadow = true;
    corpo.add(cabin);
    addEdges(cabin);

    // ─── Para-brisas inclinado (Plane) ─────────────────────────────────────
    const winFrente = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.65), matVidro);
    winFrente.position.set(0.55, 1.0, 0);
    winFrente.rotation.z = -Math.PI * 0.30;
    winFrente.rotation.y = Math.PI / 2;
    corpo.add(winFrente);

    // ─── Janelas laterais (Planes) ─────────────────────────────────────────
    [-1, 1].forEach(s => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.35), matVidro);
        win.position.set(-0.1, 0.98, s * 0.58);
        win.rotation.y = s > 0 ? 0 : Math.PI;
        corpo.add(win);
    });

    // ─── Vidro traseiro inclinado ──────────────────────────────────────────
    const winTras = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), matVidro);
    winTras.position.set(-0.8, 0.95, 0);
    winTras.rotation.z = Math.PI * 0.28;
    winTras.rotation.y = -Math.PI / 2;
    corpo.add(winTras);

    // ─── Convés traseiro (Box) ─────────────────────────────────────────────
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.4), matGreeble);
    deck.position.set(-1.1, 0.72, 0);
    corpo.add(deck);

    // ─── Nariz cunha (Cone) ────────────────────────────────────────────────
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 4), matChassi);
    nose.position.set(2.05, 0.42, 0);
    nose.rotation.z = -Math.PI / 2;
    nose.scale.set(1.0, 1.0, 0.55);
    nose.castShadow = true;
    corpo.add(nose);

    // ─── Splitter frontal (Box) ────────────────────────────────────────────
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 1.7), matGreeble);
    splitter.position.set(1.85, 0.16, 0);
    corpo.add(splitter);

    // ─── Saias laterais (Boxes) ────────────────────────────────────────────
    [-1, 1].forEach(s => {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 0.12), matGreeble);
        skirt.position.set(0, 0.22, s * 0.78);
        corpo.add(skirt);
    });

    // ─── Spoiler traseiro (Box + 2 Cylinders) ──────────────────────────────
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.4), matChassi);
    wing.position.set(-1.55, 1.05, 0);
    corpo.add(wing);
    addEdges(wing);
    [-1, 1].forEach(s => {
        const strut = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.32, 12), matJante
        );
        strut.position.set(-1.55, 0.88, s * 0.5);
        corpo.add(strut);
    });

    // ─── Tira underglow (Box emissivo) ─────────────────────────────────────
    const underglow = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.05, 1.0),
        new THREE.MeshBasicMaterial({
            color: corNeon, transparent: true, opacity: 0.7, toneMapped: false
        })
    );
    underglow.position.y = 0.12;
    corpo.add(underglow);

    // ─── Tira neon na cintura (Box emissivo) ───────────────────────────────
    [-1, 1].forEach(s => {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.04, 0.03), matNeon);
        stripe.position.set(0, 0.55, s * 0.76);
        corpo.add(stripe);
    });
    // tira no tejadilho
    const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.06), matNeon);
    roofStripe.position.set(-0.1, 1.22, 0);
    corpo.add(roofStripe);

    // ─── Faróis frontais: Cylinder bezel + Sphere lente ────────────────────
    [-1, 1].forEach(s => {
        const bezel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.16, 0.12, 16), matJante
        );
        bezel.rotation.z = Math.PI / 2;
        bezel.position.set(1.65, 0.55, s * 0.5);
        corpo.add(bezel);

        const farol = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), matFarol);
        farol.position.set(1.72, 0.55, s * 0.5);
        corpo.add(farol);
    });

    // ─── Luzes traseiras (Boxes emissivos) ─────────────────────────────────
    const taillights = [];
    [-1, 1].forEach(s => {
        const tail = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.18, 0.45), matTaillight.clone()
        );
        tail.position.set(-1.85, 0.55, s * 0.45);
        corpo.add(tail);
        taillights.push(tail);
    });
    // Barra LED traseira (Box emissivo entre as duas luzes)
    const ledBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.06, 0.85),
        new THREE.MeshBasicMaterial({ color: 0xff2244, toneMapped: false })
    );
    ledBar.position.set(-1.85, 0.65, 0);
    corpo.add(ledBar);

    // ─── Grelha frontal (Box com greeble) ──────────────────────────────────
    const grelha = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.9), matGreeble);
    grelha.position.set(1.62, 0.35, 0);
    corpo.add(grelha);

    // ─── Escapes (2 Cylinders) ─────────────────────────────────────────────
    const escapes = [];
    [-1, 1].forEach(s => {
        const escape = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.32, 14), matEscape.clone()
        );
        escape.rotation.z = Math.PI / 2;
        escape.position.set(-1.92, 0.32, s * 0.32);
        corpo.add(escape);
        escapes.push(escape);
    });

    // ─── Rodas (4): Cylinder pneu + Torus rim accent + Cylinder hub ────────
    const rodas = [];
    const posicoesRodas = [
        [-1.15, 0.32,  0.78], [1.05, 0.32,  0.78],
        [-1.15, 0.32, -0.78], [1.05, 0.32, -0.78]
    ];
    posicoesRodas.forEach(p => {
        const rodaGrupo = new THREE.Group();
        rodaGrupo.position.set(p[0], p[1], p[2]);

        // Pneu (CylinderGeometry)
        const pneu = new THREE.Mesh(
            new THREE.CylinderGeometry(0.36, 0.36, 0.24, 22), matPneu
        );
        pneu.rotation.z = Math.PI / 2;
        pneu.castShadow = true;
        rodaGrupo.add(pneu);

        // Jante interior (Cylinder)
        const jante = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16), matJante
        );
        jante.rotation.z = Math.PI / 2;
        rodaGrupo.add(jante);

        // Aro neon (Torus)
        const aro = new THREE.Mesh(
            new THREE.TorusGeometry(0.30, 0.025, 8, 24),
            new THREE.MeshBasicMaterial({ color: corNeon, toneMapped: false })
        );
        aro.rotation.y = Math.PI / 2;
        rodaGrupo.add(aro);

        corpo.add(rodaGrupo);
        rodas.push(rodaGrupo);
    });

    // ─── Antena (Cylinder fino) ────────────────────────────────────────────
    const antena = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), matJante
    );
    antena.position.set(-0.65, 1.45, 0.45);
    corpo.add(antena);
    const antenaTopo = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 8),
        new THREE.MeshBasicMaterial({ color: corNeon, toneMapped: false })
    );
    antenaTopo.position.set(-0.65, 1.7, 0.45);
    corpo.add(antenaTopo);

    // ─── Anel underglow tipo halo (Ring) sob o carro ───────────────────────
    const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.5, 32),
        new THREE.MeshBasicMaterial({
            color: corNeon, transparent: true, opacity: 0.35,
            side: THREE.DoubleSide, toneMapped: false, depthWrite: false
        })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.02;
    corpo.add(halo);

    // O build acima tem a frente em +X. Rodar para -Z (convenção do input).
    corpo.rotation.y = Math.PI / 2;

    _speederAnimData.push({
        underglow: underglow, escapes: escapes,
        taillights: taillights, rodas: rodas
    });
    return raiz;
}
