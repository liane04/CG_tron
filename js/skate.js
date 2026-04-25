import * as THREE from 'three';

/**
 * Cria um hoverboard futurista estilo Back to the Future 2 com estética neon Tron.
 * Sem rodas — flutua sobre o chão com propulsores de energia nos cantos.
 * Apenas BoxGeometry e CylinderGeometry — sem modelos externos.
 *
 * @param {number} corNeon  Cor hex do neon (ex: 0x00ffff)
 * @returns {THREE.Group}   Grupo pronto a adicionar à cena
 */
// Referências para animação
const _skateAnimData = [];

export function atualizarSkate(delta) {
    const t = performance.now() * 0.001;
    for (const d of _skateAnimData) {
        // Hover bob
        d.hover.position.y = Math.sin(t * 1.8) * 0.15;
        // Propulsor rotation + pulse
        for (const p of d.propCores) {
            p.rotation.y += delta * 3.0;
            p.material.emissiveIntensity = 3.0 + Math.sin(t * 6) * 1.5;
        }
        // Energy conduit pulse
        for (const c of d.conduits) {
            c.material.emissiveIntensity = 1.5 + Math.sin(t * 4 + c.userData.offset) * 1.0;
        }
    }
}

export function criarSkate(corNeon = 0x00ffff) {

    const ESCALA = 0.38;
    const LARGURA_MULT = 1.0;

    const raiz = new THREE.Group();
    const hover = new THREE.Group();
    raiz.add(hover);
    raiz.scale.set(ESCALA * LARGURA_MULT, ESCALA, ESCALA);

    const animData = { hover, propCores: [], conduits: [] };
    _skateAnimData.push(animData);

    // ─── Texturas PBR ───────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();
    const texMetal = loader.load('./textures/mota/metal_texture.png');
    texMetal.wrapS = texMetal.wrapT = THREE.RepeatWrapping;
    texMetal.repeat.set(2, 2);
    texMetal.anisotropy = 16;

    // ─── Materiais ──────────────────────────────────────────────────────────────
    const matPrancha = new THREE.MeshStandardMaterial({
        map: texMetal,
        color:     0x334455,
        metalness: 0.7,
        roughness: 0.3,
    });

    const matMetal = new THREE.MeshStandardMaterial({
        map: texMetal,
        color:     0x445566,
        metalness: 0.95,
        roughness: 0.1,
    });

    const matMetalEscuro = new THREE.MeshStandardMaterial({
        map: texMetal,
        color:     0x222233,
        metalness: 0.8,
        roughness: 0.4,
    });

    const matNeon = new THREE.MeshStandardMaterial({
        color:             corNeon,
        emissive:          corNeon,
        emissiveIntensity: 4.0,
        roughness:         0.0,
        metalness:         0.0,
        toneMapped:        false,
        side:              THREE.DoubleSide,
    });

    const matNeonFraco = new THREE.MeshStandardMaterial({
        color:             corNeon,
        emissive:          corNeon,
        emissiveIntensity: 1.8,
        roughness:         0.1,
        toneMapped:        false,
        side:              THREE.DoubleSide,
    });

    const matEnergia = new THREE.MeshStandardMaterial({
        color:             corNeon,
        emissive:          corNeon,
        emissiveIntensity: 2.5,
        roughness:         0.0,
        metalness:         0.0,
        transparent:       true,
        opacity:           0.45,
        toneMapped:        false,
        side:              THREE.DoubleSide,
    });

    // ─── Dimensões ──────────────────────────────────────────────────────────────
    const COMP      = 5.0;   // comprimento (mais curto)
    const LARG      = 1.3;   // largura (mais fino)
    const ESPESSURA = 0.12;  // espessura da prancha (mais fino)
    const ALT_HOVER = 0.55;  // altura de flutuação acima do chão

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. PRANCHA PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════════
    // Corpo central
    const prancha = new THREE.Mesh(new THREE.BoxGeometry(LARG, ESPESSURA, COMP), matPrancha);
    prancha.position.set(0, ALT_HOVER, 0);
    hover.add(prancha);

    // Tampas das pontas (arredondamento simulado com caixas finas)
    [-1, 1].forEach(lado => {
        const tampa = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.85, ESPESSURA, 0.25), matMetal);
        tampa.position.set(0, ALT_HOVER, lado * (COMP / 2 - 0.1));
        hover.add(tampa);

        const tampaExt = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.65, ESPESSURA * 0.7, 0.2), matMetalEscuro);
        tampaExt.position.set(0, ALT_HOVER, lado * (COMP / 2 + 0.08));
        hover.add(tampaExt);
    });

    // Reforço central metálico (nervura longitudinal)
    const nervura = new THREE.Mesh(new THREE.BoxGeometry(0.18, ESPESSURA + 0.06, COMP * 0.75), matMetal);
    nervura.position.set(0, ALT_HOVER, 0);
    hover.add(nervura);

    // Placas laterais de blindagem
    [-1, 1].forEach(lado => {
        const placa = new THREE.Mesh(new THREE.BoxGeometry(0.12, ESPESSURA * 1.4, COMP * 0.85), matMetal);
        placa.position.set(lado * (LARG / 2 - 0.05), ALT_HOVER, 0);
        hover.add(placa);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. FRISOS NEON
    // ═══════════════════════════════════════════════════════════════════════════
    // Arestas laterais
    [-1, 1].forEach(lado => {
        const friso = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, COMP * 0.82), matNeon);
        friso.position.set(lado * (LARG / 2 + 0.02), ALT_HOVER, 0);
        hover.add(friso);
    });

    // Friso no topo (linha central)
    const linhaTopo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, COMP * 0.7), matNeon);
    linhaTopo.position.set(0, ALT_HOVER + ESPESSURA / 2 + 0.02, 0);
    hover.add(linhaTopo);


    // Friso inferior (por baixo da prancha — glow de hover)
    const frisoInf = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.85, 0.04, COMP * 0.78), matNeon);
    frisoInf.position.set(0, ALT_HOVER - ESPESSURA / 2 - 0.02, 0);
    hover.add(frisoInf);

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. PROPULSORES DE HOVER NOS CANTOS (4 emissores)
    // ═══════════════════════════════════════════════════════════════════════════
    const POS_X = LARG / 2 - 0.1;
    const POS_Z = COMP / 2 - 0.55;

    function criarPropulsor(x, z) {
        const g = new THREE.Group();
        g.position.set(x, ALT_HOVER - ESPESSURA / 2, z);

        // Carcaça exterior dupla do propulsor
        const carcacaExt = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.30, 0.08, 20), matMetal);
        carcacaExt.position.y = 0.1;
        g.add(carcacaExt);
        const carcaca = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.22, 20), matMetalEscuro);
        g.add(carcaca);

        // Anel neon exterior
        const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 20), matNeon);
        anel.position.y = -0.08;
        g.add(anel);

        // Anel neon interior
        const anelInt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), matNeonFraco);
        anelInt.position.y = -0.10;
        g.add(anelInt);

        // Câmara interna de energia
        const camara = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 16), matMetal);
        g.add(camara);

        // Núcleo de energia ANIMADO (emissivo intenso — roda e pulsa)
        const matNucleoClone = matNeon.clone();
        const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 8), matNucleoClone);
        g.add(nucleo);
        animData.propCores.push(nucleo);

        // Campo de energia translúcido por baixo (matEnergia)
        const campo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.15, 16), matEnergia);
        campo.position.y = -0.18;
        g.add(campo);

        // Suportes radiais (4 braços de fixação)
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const braco = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.18), matMetalEscuro);
            braco.position.set(Math.cos(ang) * 0.24, 0, Math.sin(ang) * 0.24);
            braco.rotation.y = -ang;
            g.add(braco);
        }

        hover.add(g);
    }

    criarPropulsor(-POS_X,  POS_Z);
    criarPropulsor( POS_X,  POS_Z);
    criarPropulsor(-POS_X, -POS_Z);
    criarPropulsor( POS_X, -POS_Z);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. CONDUTOS DE ENERGIA E CIRCUITOS INTERNOS
    // ═══════════════════════════════════════════════════════════════════════════
    // Condutos longitudinais de energia (tubos que ligam propulsores)
    [-1, 1].forEach(lado => {
        const matCondClone = matNeonFraco.clone();
        const conduto = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, COMP * 0.6, 8), matCondClone);
        conduto.rotation.x = Math.PI / 2;
        conduto.position.set(lado * (LARG / 2 - 0.15), ALT_HOVER - ESPESSURA / 2 + 0.05, 0);
        conduto.userData.offset = lado * 1.5;
        hover.add(conduto);
        animData.conduits.push(conduto);
    });

    // Condutos transversais (ligam os dois lados)
    [-POS_Z, 0, POS_Z].forEach((z, i) => {
        const matCondClone = matNeonFraco.clone();
        const trans = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, LARG * 0.5, 8), matCondClone);
        trans.rotation.z = Math.PI / 2;
        trans.position.set(0, ALT_HOVER - ESPESSURA / 2 + 0.05, z);
        trans.userData.offset = i * 2.0;
        hover.add(trans);
        animData.conduits.push(trans);
    });

    // Módulos de processamento nos cruzamentos
    [-POS_Z, 0, POS_Z].forEach(z => {
        [-1, 1].forEach(lado => {
            const modulo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), matMetal);
            modulo.position.set(lado * (LARG / 2 - 0.15), ALT_HOVER - ESPESSURA / 2 + 0.05, z);
            hover.add(modulo);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. DETALHES TECNOLÓGICOS — SENSOR ARRAY E COCKPIT
    // ═══════════════════════════════════════════════════════════════════════════
    // Array de sensores no nose (3 sensores)
    [-1, 0, 1].forEach(i => {
        const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), matNeon);
        sensor.position.set(i * 0.15, ALT_HOVER + 0.12, COMP / 2 - 0.1);
        hover.add(sensor);
    });
    // Visor / heads-up display frontal
    const visor = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.5, 0.15, 0.06), matEnergia);
    visor.position.set(0, ALT_HOVER + 0.18, COMP / 2 - 0.25);
    visor.rotation.x = 0.3;
    hover.add(visor);



    // Estabilizadores laterais expandidos com barbatanas de arrefecimento
    [-1, 1].forEach(lado => {
        // Aleta principal
        const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.6), matMetal);
        aleta.position.set(lado * (LARG / 2 + 0.2), ALT_HOVER, -COMP / 2 + 0.8);
        aleta.rotation.z = lado * 0.25;
        hover.add(aleta);
        // Neon na aleta
        const aletaNeon = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), matNeon);
        aletaNeon.position.set(lado * (LARG / 2 + 0.2), ALT_HOVER + 0.06, -COMP / 2 + 0.8);
        hover.add(aletaNeon);
        // Barbatanas de arrefecimento (cooling fins)
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.04), matMetalEscuro);
            fin.position.set(lado * (LARG / 2 + 0.2), ALT_HOVER, -COMP / 2 + 0.6 + i * 0.12);
            fin.rotation.z = lado * 0.25;
            hover.add(fin);
        }
        // Estabilizadores frontais
        const aletaF = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.35), matMetal);
        aletaF.position.set(lado * (LARG / 2 + 0.12), ALT_HOVER, COMP / 2 - 0.6);
        aletaF.rotation.z = lado * -0.15;
        hover.add(aletaF);
        const aletaFNeon = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.03), matNeonFraco);
        aletaFNeon.position.set(lado * (LARG / 2 + 0.12), ALT_HOVER + 0.05, COMP / 2 - 0.6);
        hover.add(aletaFNeon);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. MOTOR TRASEIRO MULTI-ESTÁGIO (THRUSTER ARRAY)
    // ═══════════════════════════════════════════════════════════════════════════
    // Base do motor
    const propBase = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.6, 0.6, 0.55), matMetalEscuro);
    propBase.position.set(0, ALT_HOVER, -COMP / 2 + 0.2);
    hover.add(propBase);

    // Motor central principal
    const motorExt = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.44, 0.6, 20), matMetal);
    motorExt.rotation.x = Math.PI / 2;
    motorExt.position.set(0, ALT_HOVER, -COMP / 2 - 0.1);
    hover.add(motorExt);
    // Anel neon exterior
    const motorAnel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 20), matNeon);
    motorAnel.rotation.x = Math.PI / 2;
    motorAnel.position.set(0, ALT_HOVER, -COMP / 2 - 0.35);
    hover.add(motorAnel);
    // Bocal de saída
    const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.3, 20), matMetalEscuro);
    bocal.rotation.x = Math.PI / 2;
    bocal.position.set(0, ALT_HOVER, -COMP / 2 - 0.42);
    hover.add(bocal);
    // Núcleo neon do motor
    const nucleoMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.25, 12), matNeon);
    nucleoMotor.rotation.x = Math.PI / 2;
    nucleoMotor.position.set(0, ALT_HOVER, -COMP / 2 - 0.48);
    hover.add(nucleoMotor);

    // Motores secundários laterais (dual exhaust)
    [-1, 1].forEach(lado => {
        const turbina = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.45, 16), matMetal);
        turbina.rotation.x = Math.PI / 2;
        turbina.position.set(lado * 0.5, ALT_HOVER, -COMP / 2 - 0.05);
        hover.add(turbina);
        const turbinaAnel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 16), matNeonFraco);
        turbinaAnel.rotation.x = Math.PI / 2;
        turbinaAnel.position.set(lado * 0.5, ALT_HOVER, -COMP / 2 - 0.28);
        hover.add(turbinaAnel);
        const turbinaFogo = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.08, 12), matNeon);
        turbinaFogo.rotation.x = Math.PI / 2;
        turbinaFogo.position.set(lado * 0.5, ALT_HOVER, -COMP / 2 - 0.32);
        hover.add(turbinaFogo);
    });

    // Suportes laterais do motor com frisos
    [-1, 1].forEach(lado => {
        const suporte = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.45), matMetal);
        suporte.position.set(lado * 0.55, ALT_HOVER, -COMP / 2 - 0.05);
        hover.add(suporte);
        const frisoSup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), matNeonFraco);
        frisoSup.position.set(lado * 0.62, ALT_HOVER, -COMP / 2 - 0.05);
        hover.add(frisoSup);
    });

    // Aletas traseiras em V (mais detalhadas)
    [-1, 1].forEach(lado => {
        const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.0), matMetal);
        aleta.position.set(lado * 0.55, ALT_HOVER + 0.22, -COMP / 2 + 0.3);
        aleta.rotation.z = lado * 0.45;
        aleta.rotation.y = lado * -0.2;
        hover.add(aleta);
        // Nervura de reforço na aleta
        const nervAleta = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.06), matMetalEscuro);
        nervAleta.position.set(lado * 0.55, ALT_HOVER + 0.22, -COMP / 2 + 0.1);
        nervAleta.rotation.z = lado * 0.45;
        hover.add(nervAleta);
        // Friso neon duplo
        const aletaNeon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.02), matNeon);
        aletaNeon.position.set(lado * (0.55 + 0.04), ALT_HOVER + 0.22, -COMP / 2 + 0.3);
        aletaNeon.rotation.z = lado * 0.45;
        aletaNeon.rotation.y = lado * -0.2;
        hover.add(aletaNeon);
        const aletaNeon2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1.02), matNeonFraco);
        aletaNeon2.position.set(lado * (0.55 - 0.04), ALT_HOVER + 0.22, -COMP / 2 + 0.3);
        aletaNeon2.rotation.z = lado * 0.45;
        aletaNeon2.rotation.y = lado * -0.2;
        hover.add(aletaNeon2);
        // Base de ligação reforçada
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.35), matMetalEscuro);
        base.position.set(lado * 0.35, ALT_HOVER + 0.05, -COMP / 2 + 0.3);
        hover.add(base);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. SUPERFÍCIE SUPERIOR — GRIP E PAINÉIS DECORATIVOS
    // ═══════════════════════════════════════════════════════════════════════════
    // Painéis de grip antiderrapante
    for (let z = -1.8; z <= 1.8; z += 0.5) {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.72, 0.03, 0.08), matMetalEscuro);
        grip.position.set(0, ALT_HOVER + ESPESSURA / 2 + 0.01, z);
        hover.add(grip);
    }
    // Marcas de posição dos pés (foot pads — sem neon)
    [-0.6, 0.6].forEach(z => {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.5, 0.02, 0.45), matMetalEscuro);
        pad.position.set(0, ALT_HOVER + ESPESSURA / 2 + 0.01, z);
        hover.add(pad);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. PAINÉIS DE ESCUDO DE ENERGIA (laterais translúcidos)
    // ═══════════════════════════════════════════════════════════════════════════
    [-1, 1].forEach(lado => {
        const escudo = new THREE.Mesh(new THREE.BoxGeometry(0.03, ESPESSURA * 2.5, COMP * 0.5), matEnergia);
        escudo.position.set(lado * (LARG / 2 + 0.08), ALT_HOVER, 0);
        hover.add(escudo);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. ILUMINAÇÃO AVANÇADA — multi-point underglow
    // ═══════════════════════════════════════════════════════════════════════════
    // Luz principal underglow
    const luzHover = new THREE.PointLight(corNeon, 3.5, 8.0, 2);
    luzHover.position.set(0, 0.1, 0);
    hover.add(luzHover);
    // Luzes dos propulsores (4 pontos)
    [[-POS_X, POS_Z], [POS_X, POS_Z], [-POS_X, -POS_Z], [POS_X, -POS_Z]].forEach(([x, z]) => {
        const lp = new THREE.PointLight(corNeon, 1.0, 3.0, 2);
        lp.position.set(x, 0.05, z);
        hover.add(lp);
    });
    // Farol direcional frontal
    const luzFrente = new THREE.PointLight(corNeon, 2.0, 6.0, 2);
    luzFrente.position.set(0, ALT_HOVER + 0.2, COMP / 2 + 0.5);
    hover.add(luzFrente);
    // Luz traseira (exaustão)
    const luzTras = new THREE.PointLight(corNeon, 1.5, 4.0, 2);
    luzTras.position.set(0, ALT_HOVER, -COMP / 2 - 0.5);
    hover.add(luzTras);

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. SOMBRAS
    // ═══════════════════════════════════════════════════════════════════════════
    hover.traverse(child => {
        if (child.isMesh) {
            child.castShadow    = true;
            child.receiveShadow = true;
        }
    });

    hover.position.y = 0;
    return raiz;
}
