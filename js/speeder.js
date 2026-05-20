// Speeder X1 — carro de Fórmula 1 cyberpunk desportivo construído a partir
// das primitivas de Three.js (Box, Cylinder, Cone, Sphere, Torus, Plane).
// Texturizado com uma mistura de materiais nativos (emissivos para neon,
// faróis e luzes traseiras) e texturas PBR importadas:
//   - textures/neon/metal scifi1 (Metal_Plate_040) → chassis monocoque
//   - textures/neon/metal scifi2 (Greeble_Techno_001) → sidepods e asas
//   - textures/neon/vidro (Glass_Window_003)        → para-brisas
// A convenção (front = -Z) segue mota.js e o sistema de input.

import * as THREE from 'three';

const _speederAnimData = [];

export function atualizarSpeeder(delta) {
    const t = performance.now() * 0.001;
    for (const d of _speederAnimData) {
        if (d.underglow) d.underglow.material.opacity = 0.8 + Math.sin(t * 3.2) * 0.15;
        if (d.luzUnderglow) d.luzUnderglow.intensity = 2.2 + Math.sin(t * 3.2) * 0.6;
        if (d.escapes) {
            const pulso = 2.0 + Math.sin(t * 10) * 0.8;
            for (const e of d.escapes) e.material.emissiveIntensity = pulso;
        }
        if (d.luzEscape) d.luzEscape.intensity = 0.9 + Math.sin(t * 10) * 0.4;
        if (d.taillights) {
            const tail = 1.6 + Math.sin(t * 5) * 0.4;
            for (const l of d.taillights) l.material.emissiveIntensity = tail;
        }
        if (d.rodas) {
            // Rotação em torno do eixo Z local (eixo do rodado) para girar corretamente
            for (const r of d.rodas) r.rotation.z -= delta * 12.0;
        }
    }
}

export function criarSpeeder(corNeon = 0x00ffff) {
    // Escala ajustada para 0.75 como meio-termo ideal: claramente maior e mais
    // imponente que a mota/skate, mas sem ocupar espaço excessivo na arena.
    const ESCALA = 0.75;
    const raiz = new THREE.Group();
    const corpo = new THREE.Group();
    raiz.add(corpo);
    raiz.userData.tipo = 'speeder';
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
        t.anisotropy = 4; // Limitado: valor alto é pesado em GPUs integradas
    });
    [texChDiff, texChNor, texChRou, texChMet, texChAO].forEach(t => t.repeat.set(2, 1));
    [texGrDiff, texGrNor, texGrRou, texGrMet].forEach(t => t.repeat.set(1.5, 1));

    // ─── Materiais ─────────────────────────────────────────────────────────
    const matChassi = new THREE.MeshStandardMaterial({
        map: texChDiff, normalMap: texChNor, roughnessMap: texChRou,
        metalnessMap: texChMet, aoMap: texChAO,
        color: 0x1a1a24, metalness: 1.0, roughness: 0.45
    });

    const matGreeble = new THREE.MeshStandardMaterial({
        map: texGrDiff, normalMap: texGrNor, roughnessMap: texGrRou,
        metalnessMap: texGrMet,
        color: 0x333344, metalness: 0.9, roughness: 0.55
    });

    const matVidro = new THREE.MeshStandardMaterial({
        map: texViDiff, normalMap: texViNor, roughnessMap: texViRou,
        color: 0x112233, transparent: true, opacity: 0.65,
        roughness: 0.1, metalness: 0.4
        // MeshPhysicalMaterial com transmission removido: é o material mais pesado do Three.js
        // (activa um render pass extra). MeshStandard com opacity dá resultado visual equivalente.
    });

    // Materiais nativos (sem textura) — neon, luzes, pneus
    const matNeon = new THREE.MeshStandardMaterial({
        color: corNeon, emissive: corNeon, emissiveIntensity: 4.0,
        metalness: 0.1, roughness: 0.2, toneMapped: false
    });
    const matFarol = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false
    });
    const matTaillight = new THREE.MeshStandardMaterial({
        color: 0xff2244, emissive: 0xff2244, emissiveIntensity: 2.0,
        roughness: 0.3, metalness: 0.2, toneMapped: false
    });
    const matEscape = new THREE.MeshStandardMaterial({
        color: 0xff7733, emissive: 0xff5522, emissiveIntensity: 2.2,
        roughness: 0.3, metalness: 0.5, toneMapped: false
    });
    const matPneu = new THREE.MeshStandardMaterial({
        color: 0x0f0f0f, roughness: 0.95, metalness: 0.05
    });
    const matJante = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa, metalness: 1.0, roughness: 0.25
    });
    const matEdge = new THREE.LineBasicMaterial({
        color: corNeon, transparent: true, opacity: 0.85
    });

    // helper: adicionar arestas neon para a silhueta cyber
    // Limitado a peças-chave para evitar EdgesGeometry excessivas (custo CPU)
    function addEdges(mesh, mat) {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), mat || matEdge);
        e.position.copy(mesh.position);
        e.rotation.copy(mesh.rotation);
        e.scale.copy(mesh.scale);
        corpo.add(e);
    }

    // ─── 1. Monocoque Central / Fuselagem (Box) ────────────────────────────
    const chassisInf = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.32, 0.8), matChassi);
    chassisInf.position.set(0, 0.32, 0);
    chassisInf.castShadow = true;
    chassisInf.geometry.setAttribute('uv2', chassisInf.geometry.attributes.uv);
    corpo.add(chassisInf);
    addEdges(chassisInf); // Apenas chassi principal tem edges (otimização)

    // ─── 2. Bico F1 (Cone) e Asa Frontal ───────────────────────────────────
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 4), matChassi);
    nose.position.set(2.1, 0.32, 0);
    nose.rotation.z = -Math.PI / 2;
    nose.scale.set(1.0, 1.0, 0.7);
    nose.castShadow = true;
    corpo.add(nose);

    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 2.2), matGreeble);
    frontWing.position.set(2.4, 0.18, 0);
    corpo.add(frontWing);

    [-1, 1].forEach(s => {
        const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.06), matChassi);
        endplate.position.set(2.4, 0.25, s * 1.07);
        corpo.add(endplate);
        // addEdges removido de endplates menores (poupança de EdgesGeometry)
    });

    // ─── 3. Cockpit e Para-brisas do Piloto ────────────────────────────────
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.76), matChassi);
    cabin.position.set(-0.1, 0.65, 0);
    cabin.castShadow = true;
    corpo.add(cabin);
    // addEdges removido do cockpit (poupança de EdgesGeometry)

    const winFrente = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.45), matVidro);
    winFrente.position.set(0.45, 0.72, 0);
    winFrente.rotation.z = -Math.PI * 0.35;
    winFrente.rotation.y = Math.PI / 2;
    corpo.add(winFrente);

    [-1, 1].forEach(s => {
        const winLat = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.25), matVidro);
        winLat.position.set(-0.05, 0.70, s * 0.385);
        winLat.rotation.y = s > 0 ? 0 : Math.PI;
        corpo.add(winLat);
    });

    // ─── 4. Sidepods e Entradas de Ar F1 ───────────────────────────────────
    [-1, 1].forEach(s => {
        const sidepod = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.55), matGreeble);
        sidepod.position.set(-0.2, 0.35, s * 0.65);
        corpo.add(sidepod);
        // addEdges removido de sidepods (poupança de EdgesGeometry)

        const intake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.30, 0.45), matChassi);
        intake.position.set(0.65, 0.35, s * 0.65);
        corpo.add(intake);
    });

    // ─── 5. Airbox e Barbatana de Tubarão (Shark Fin) ──────────────────────
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.45), matChassi);
    airbox.position.set(-0.6, 0.95, 0);
    corpo.add(airbox);

    const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.30, 0.06), matGreeble);
    sharkFin.position.set(-1.2, 0.85, 0);
    corpo.add(sharkFin);

    // ─── 6. Asa Traseira F1 e Difusor ──────────────────────────────────────
    const rearWingMain = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 2.0), matChassi);
    rearWingMain.position.set(-1.8, 1.15, 0);
    corpo.add(rearWingMain);
    addEdges(rearWingMain); // Asa traseira tem edges (destaque visual importante)

    const rearWingFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 1.9), matNeon);
    rearWingFlap.position.set(-1.95, 1.25, 0);
    corpo.add(rearWingFlap);

    [-1, 1].forEach(s => {
        const rwEndplate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.06), matGreeble);
        rwEndplate.position.set(-1.8, 0.95, s * 0.97);
        corpo.add(rwEndplate);

        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 8), matJante);
        pillar.position.set(-1.6, 0.65, s * 0.3);
        corpo.add(pillar);
    });

    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 1.4), matGreeble);
    diffuser.position.set(-1.75, 0.22, 0);
    corpo.add(diffuser);

    // ─── 7. Rodas F1 e Braços de Suspensão (Wishbones) ─────────────────────
    const rodas = [];
    const posicoesRodas = [
        [1.35,  0.36,  1.05, true],  // Dianteira Esq
        [1.35,  0.36, -1.05, true],  // Dianteira Dir
        [-1.35, 0.40,  1.10, false], // Traseira Esq
        [-1.35, 0.40, -1.10, false]  // Traseira Dir
    ];

    posicoesRodas.forEach(p => {
        const rodaGrupo = new THREE.Group();
        rodaGrupo.position.set(p[0], p[1], p[2]);

        const isFront = p[3];
        const raio = isFront ? 0.36 : 0.40;
        const largura = isFront ? 0.28 : 0.34;

        // Pneu (CylinderGeometry) — alinhado no eixo Z (rotation.x = PI/2)
        const pneu = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, largura, 24), matPneu);
        pneu.rotation.x = Math.PI / 2;
        pneu.castShadow = true;
        rodaGrupo.add(pneu);

        // Jante interior metálica
        const jante = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.6, raio * 0.6, largura + 0.04, 16), matJante);
        jante.rotation.x = Math.PI / 2;
        rodaGrupo.add(jante);

        // Aro Neon embutido brilhante (CylinderGeometry tal como na mota)
        const aroNeon = new THREE.Mesh(new THREE.CylinderGeometry(raio * 0.85, raio * 0.85, largura + 0.02, 32), matNeon);
        aroNeon.rotation.x = Math.PI / 2;
        rodaGrupo.add(aroNeon);

        // Aro neon exterior (Torus) para acentuar a silhueta
        const aro = new THREE.Mesh(
            new THREE.TorusGeometry(raio * 0.75, 0.03, 8, 24),
            new THREE.MeshBasicMaterial({ color: corNeon, toneMapped: false })
        );
        rodaGrupo.add(aro);

        corpo.add(rodaGrupo);
        rodas.push(rodaGrupo);

        // Braço de suspensão (Wishbone) conectando ao chassi
        const wishbone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), matJante);
        wishbone.position.set(p[0], p[1], p[2] * 0.55);
        wishbone.rotation.x = Math.PI / 2;
        corpo.add(wishbone);
    });

    // ─── 8. Iluminação Underglow e Detalhes (Sem o anel estranho!) ─────────
    const underglowPlate = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.05, 0.8),
        new THREE.MeshBasicMaterial({ color: corNeon, transparent: true, opacity: 0.9, toneMapped: false })
    );
    underglowPlate.position.set(0, 0.15, 0);
    corpo.add(underglowPlate);

    const taillights = [];
    [-1, 1].forEach(s => {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.35), matTaillight.clone());
        tail.position.set(-1.8, 0.45, s * 0.5);
        corpo.add(tail);
        taillights.push(tail);
    });

    // Rain light F1 central
    const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), matTaillight.clone());
    rainLight.position.set(-1.85, 0.28, 0);
    corpo.add(rainLight);
    taillights.push(rainLight);

    const escapes = [];
    [-1, 1].forEach(s => {
        const escape = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.35, 14), matEscape.clone());
        escape.rotation.z = Math.PI / 2;
        escape.position.set(-1.85, 0.38, s * 0.25);
        corpo.add(escape);
        escapes.push(escape);
    });

    // Luzes PointLights reais — reduzidas a 2 por veículo (performance)
    const luzUnderglow = new THREE.PointLight(corNeon, 2.5, 4.5, 2);
    luzUnderglow.position.set(0, 0.1, 0);
    corpo.add(luzUnderglow);

    // Luz de escape (animada em atualizarSpeeder)
    const luzEscape = new THREE.PointLight(0xff5522, 1.0, 2.5, 2);
    luzEscape.position.set(-2.0, 0.38, 0);
    corpo.add(luzEscape);
    // Nota: faínhas frontais e luz traseira removidas para reduzir carga de iluminação

    // O build acima tem a frente em +X. Rodar para -Z (convenção do input).
    corpo.rotation.y = Math.PI / 2;

    _speederAnimData.push({
        underglow: underglowPlate, escapes: escapes,
        taillights: taillights, rodas: rodas,
        luzUnderglow: luzUnderglow, luzEscape: luzEscape
    });
    return raiz;
}
