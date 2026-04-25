import * as THREE from 'three';

/**
 * Cria um hoverboard futurista estilo Back to the Future 2 com estética neon Tron.
 * Sem rodas — flutua sobre o chão com propulsores de energia nos cantos.
 * Apenas BoxGeometry e CylinderGeometry — sem modelos externos.
 *
 * @param {number} corNeon  Cor hex do neon (ex: 0x00ffff)
 * @returns {THREE.Group}   Grupo pronto a adicionar à cena
 */
export function criarSkate(corNeon = 0x00ffff) {

    const ESCALA = 0.38;

    const raiz = new THREE.Group();
    const hover = new THREE.Group();
    raiz.add(hover);
    raiz.scale.setScalar(ESCALA);

    // ─── Materiais ──────────────────────────────────────────────────────────────
    const matPrancha = new THREE.MeshStandardMaterial({
        color:     0x080810,
        metalness: 0.7,
        roughness: 0.3,
    });

    const matMetal = new THREE.MeshStandardMaterial({
        color:     0x111122,
        metalness: 0.95,
        roughness: 0.1,
    });

    const matMetalEscuro = new THREE.MeshStandardMaterial({
        color:     0x050508,
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
    const COMP      = 6.5;   // comprimento
    const LARG      = 2.0;   // largura
    const ESPESSURA = 0.2;   // espessura da prancha
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

    // Travessas transversais no topo
    [-1.5, 0, 1.5].forEach(z => {
        const travessa = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.65, 0.04, 0.05), matNeonFraco);
        travessa.position.set(0, ALT_HOVER + ESPESSURA / 2 + 0.02, z);
        hover.add(travessa);
    });

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

        // Carcaça exterior do propulsor
        const carcaca = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.22, 16), matMetalEscuro);
        g.add(carcaca);

        // Anel neon exterior
        const anel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), matNeon);
        anel.position.y = -0.08;
        g.add(anel);

        // Câmara interna de energia
        const camara = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 12), matMetal);
        g.add(camara);

        // Núcleo de energia (emissivo intenso)
        const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), matNeon);
        g.add(nucleo);


        hover.add(g);
    }

    criarPropulsor(-POS_X,  POS_Z);
    criarPropulsor( POS_X,  POS_Z);
    criarPropulsor(-POS_X, -POS_Z);
    criarPropulsor( POS_X, -POS_Z);


    // ═══════════════════════════════════════════════════════════════════════════
    // 5. DETALHES TECNOLÓGICOS
    // ═══════════════════════════════════════════════════════════════════════════
    // Sensor / câmara no nose
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), matNeon);
    sensor.position.set(0, ALT_HOVER + 0.12, COMP / 2 - 0.1);
    hover.add(sensor);

    // Estabilizadores laterais (pequenas aletas nas laterais)
    [-1, 1].forEach(lado => {
        const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.5), matMetal);
        aleta.position.set(lado * (LARG / 2 + 0.15), ALT_HOVER, -COMP / 2 + 0.8);
        aleta.rotation.z = lado * 0.25;
        hover.add(aleta);

        const aletaNeon = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.03), matNeon);
        aletaNeon.position.set(lado * (LARG / 2 + 0.15), ALT_HOVER + 0.06, -COMP / 2 + 0.8);
        hover.add(aletaNeon);
    });

    // Propulsor traseiro principal (motor de jet)
    const propBase = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.55, 0.55, 0.5), matMetalEscuro);
    propBase.position.set(0, ALT_HOVER, -COMP / 2 + 0.2);
    hover.add(propBase);

    // Carcaça cilíndrica do motor
    const motorExt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.55, 16), matMetal);
    motorExt.rotation.x = Math.PI / 2;
    motorExt.position.set(0, ALT_HOVER, -COMP / 2 - 0.1);
    hover.add(motorExt);

    // Anel neon exterior do motor
    const motorAnel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.08, 16), matNeon);
    motorAnel.rotation.x = Math.PI / 2;
    motorAnel.position.set(0, ALT_HOVER, -COMP / 2 - 0.32);
    hover.add(motorAnel);

    // Câmara interna (bocal de saída)
    const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.3, 16), matMetalEscuro);
    bocal.rotation.x = Math.PI / 2;
    bocal.position.set(0, ALT_HOVER, -COMP / 2 - 0.38);
    hover.add(bocal);

    // Núcleo de energia neon (interior do motor)
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12), matNeon);
    nucleo.rotation.x = Math.PI / 2;
    nucleo.position.set(0, ALT_HOVER, -COMP / 2 - 0.45);
    hover.add(nucleo);

    // Suportes laterais do motor
    [-1, 1].forEach(lado => {
        const suporte = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.4), matMetal);
        suporte.position.set(lado * 0.5, ALT_HOVER, -COMP / 2 - 0.05);
        hover.add(suporte);

        const frisoSup = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), matNeonFraco);
        frisoSup.position.set(lado * 0.56, ALT_HOVER, -COMP / 2 - 0.05);
        hover.add(frisoSup);
    });

    // Aletas traseiras em V
    [-1, 1].forEach(lado => {
        // Aleta principal (inclinada para fora e para cima)
        const aleta = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.9), matMetal);
        aleta.position.set(lado * 0.55, ALT_HOVER + 0.2, -COMP / 2 + 0.3);
        aleta.rotation.z = lado * 0.45;
        aleta.rotation.y = lado * -0.2;
        hover.add(aleta);

        // Friso neon na aresta da aleta
        const aletaNeon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.92), matNeon);
        aletaNeon.position.set(lado * (0.55 + 0.04), ALT_HOVER + 0.2, -COMP / 2 + 0.3);
        aletaNeon.rotation.z = lado * 0.45;
        aletaNeon.rotation.y = lado * -0.2;
        hover.add(aletaNeon);

        // Base de ligação à prancha
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.3), matMetalEscuro);
        base.position.set(lado * 0.35, ALT_HOVER + 0.05, -COMP / 2 + 0.3);
        hover.add(base);
    });

    // Painéis de grip no topo (superfície antiderrapante futurista)
    for (let z = -1.8; z <= 1.8; z += 0.7) {
        const grip = new THREE.Mesh(new THREE.BoxGeometry(LARG * 0.72, 0.03, 0.08), matMetalEscuro);
        grip.position.set(0, ALT_HOVER + ESPESSURA / 2 + 0.01, z);
        hover.add(grip);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. ILUMINAÇÃO — underglow que ilumina o chão
    // ═══════════════════════════════════════════════════════════════════════════
    // Luz principal de hover (ilumina o chão abaixo)
    const luzHover = new THREE.PointLight(corNeon, 3.0, 8.0, 2);
    luzHover.position.set(0, 0.1, 0);
    hover.add(luzHover);

    // Luz direcional frontal (farol)
    const luzFrente = new THREE.PointLight(corNeon, 1.5, 5.0, 2);
    luzFrente.position.set(0, ALT_HOVER + 0.2, COMP / 2 + 0.5);
    hover.add(luzFrente);

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. SOMBRAS
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
