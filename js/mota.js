import * as THREE from 'three';

/**
 * Cria uma light cycle estilo Tron Legacy em escala adequada para a arena.
 * Comprimento total ~3.0 unidades, altura ~0.9 unidades.
 *
 * @param {number} corNeon   Cor hex do neon (ex: 0x00ffff para ciano)
 * @returns {THREE.Group}    Grupo pronto a adicionar à cena
 */
export function criarMota(corNeon = 0x00ffff) {

    // ─── Escala global ─────────────────────────────────────────────────────────
    // ESCALA: tamanho geral da mota na arena.
    // LARGURA_MULT: factor extra só no eixo X — torna toda a mota mais larga.
    const ESCALA       = 0.38;
    const LARGURA_MULT = 1.7;  // 1.0 = original, valores > 1 alargam no eixo X

    const raiz = new THREE.Group();
    const moto = new THREE.Group();
    raiz.add(moto);
    raiz.scale.set(ESCALA * LARGURA_MULT, ESCALA, ESCALA);

    // ─── Carregador de texturas ─────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();

    // Texturas do pneu (concreto) — diffuse + normal + roughness
    const texPneuDiff  = loader.load('./textures/mota/concrete_tile_facade_diff_2k.jpg');
    const texPneuNor   = loader.load('./textures/mota/concrete_tile_facade_nor_gl_2k.jpg');
    const texPneuRough = loader.load('./textures/mota/concrete_tile_facade_rough_2k.jpg');
    // Tiling reduzido para não parecer mosaico numa geometria tóroide
    [texPneuDiff, texPneuNor, texPneuRough].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(3, 1);
    });

    // Textura de metal (para partes do chassis)
    const texMetal = loader.load('./textures/mota/metal_texture.png');
    texMetal.wrapS = texMetal.wrapT = THREE.RepeatWrapping;
    texMetal.repeat.set(2, 2);

    // ─── Materiais ──────────────────────────────────────────────────────────────

    // Pneu: concreto industrial texturizado
    const matPneuTex = new THREE.MeshStandardMaterial({
        map:          texPneuDiff,
        normalMap:    texPneuNor,
        roughnessMap: texPneuRough,
        roughness:    1.0,
        metalness:    0.05,
        color:        0x222222,  // ligeiramente escurecido
    });

    // Chassis metálico texturizado (partes principais do corpo)
    const matMetalTex = new THREE.MeshStandardMaterial({
        map:       texMetal,
        roughness: 0.25,
        metalness: 0.90,
        color:     0x111111,  // cobre a cor base — textura dá o detalhe
    });

    // Chassis polido liso (peças pequenas onde a textura ficaria exagerada)
    const matCasco = new THREE.MeshStandardMaterial({
        color: 0x080808,
        metalness: 0.95,
        roughness: 0.12,
    });
    const matCascoEscuro = new THREE.MeshStandardMaterial({
        color: 0x020202,
        metalness: 0.8,
        roughness: 0.3,
    });
    const matNeon = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 4.0,
        roughness: 0.0,
        metalness: 0.0,
        toneMapped: false,
    });
    const matNeonFraco = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        toneMapped: false,
    });
    const matVidro = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 0.4,
        roughness: 0.05,
        metalness: 0.0,
        transparent: true,
        opacity: 0.35,
    });
    // Material DoubleSide para geometrias planas (RingGeometry)
    const matDiscoRoda = new THREE.MeshStandardMaterial({
        map:       texMetal,
        metalness: 0.90,
        roughness: 0.20,
        side: THREE.DoubleSide,
    });


    // ─── Dimensões base ─────────────────────────────────────────────────────────
    const RR = 1.15;          // raio roda
    const LR = 0.40;          // largura roda (tubo do torus) — mais larga/chunky
    const ENTRE_EIXOS = 4.6;  // distância entre os dois eixos das rodas
    const ZT = -ENTRE_EIXOS / 2; // Z traseiro
    const ZF =  ENTRE_EIXOS / 2; // Z dianteiro
    const ALTURA_EIXO = RR;   // altura do eixo ao nível do chão (y)

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. RODAS – HUBLESS (vazio central + aros neon em profundidade)
    // ═══════════════════════════════════════════════════════════════════════════
    function criarRoda(posZ) {
        const g = new THREE.Group();
        g.position.set(0, ALTURA_EIXO, posZ);
        g.rotation.y = Math.PI / 2; // orientar para frente

        // Banda de rolamento principal — textura de concreto industrial
        const gPneu = new THREE.TorusGeometry(RR, LR / 2, 32, 96);
        g.add(new THREE.Mesh(gPneu, matPneuTex));

        // Aro exterior (rim externo brilhante)
        const gAroExt = new THREE.TorusGeometry(RR * 0.93, 0.07, 16, 96);
        g.add(new THREE.Mesh(gAroExt, matNeon));

        // Aro intermédio
        const gAroMed = new THREE.TorusGeometry(RR * 0.78, 0.045, 16, 96);
        g.add(new THREE.Mesh(gAroMed, matNeonFraco));

        // Aro interior (mais fino, define o furo central)
        const gAroInt = new THREE.TorusGeometry(RR * 0.60, 0.035, 16, 96);
        g.add(new THREE.Mesh(gAroInt, matNeon));

        // Disco único centrado na roda, DoubleSide → visível dos dois lados.
        const gDisco = new THREE.RingGeometry(RR * 0.59, RR * 0.94, 64);
        const disco = new THREE.Mesh(gDisco, matDiscoRoda);
        disco.position.z = 0; // centrado entre as duas faces do pneu
        g.add(disco);

        // Nervuras radiais (6 raios sólidos a ligar o aro interior ao exterior)
        for (let i = 0; i < 6; i++) {
            const ang = (i / 6) * Math.PI * 2;
            const gRaio = new THREE.BoxGeometry(0.06, RR * 0.34, LR * 0.4);
            const raio = new THREE.Mesh(gRaio, matCasco);
            raio.rotation.z = ang;
            raio.position.set(
                Math.sin(ang) * RR * 0.77,
                Math.cos(ang) * RR * 0.77,
                0
            );
            g.add(raio);
        }

        moto.add(g);
        return g;
    }

    criarRoda(ZT);
    criarRoda(ZF);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. CHASSIS AERODINÂMICO – CORPO PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════════

    // --- Ventre baixo (keel) — textura de metal
    const gKeel = new THREE.CapsuleGeometry(0.28, ENTRE_EIXOS * 0.62, 16, 64);
    const keel = new THREE.Mesh(gKeel, matMetalTex);
    keel.rotation.x = Math.PI / 2;
    keel.scale.x = 0.55; // mais estreito lateralmente
    keel.position.set(0, ALTURA_EIXO + 0.18, 0);
    moto.add(keel);

    // --- Corpo superior (tanque + carenagem central) — textura de metal
    const gCorpoSup = new THREE.CapsuleGeometry(0.42, ENTRE_EIXOS * 0.46, 16, 64);
    const corpoSup = new THREE.Mesh(gCorpoSup, matMetalTex);
    corpoSup.rotation.x = Math.PI / 2;
    corpoSup.scale.x = 0.75;   // achatado para ser mais largo que alto
    corpoSup.scale.y = 0.7;
    corpoSup.position.set(0, ALTURA_EIXO + 0.6, 0.3);
    moto.add(corpoSup);

    // Linha neon superior (spine) — percorre todo o comprimento
    const gSpine = new THREE.CapsuleGeometry(0.04, ENTRE_EIXOS + 0.4, 8, 32);
    const spine = new THREE.Mesh(gSpine, matNeon);
    spine.rotation.x = Math.PI / 2;
    spine.position.set(0, ALTURA_EIXO + 0.98, 0);
    moto.add(spine);

    // Linhas neon laterais (bordas do chassis)
    [-0.42, 0.42].forEach(xOff => {
        const gLinha = new THREE.CapsuleGeometry(0.03, ENTRE_EIXOS + 0.6, 8, 32);
        const linha = new THREE.Mesh(gLinha, matNeon);
        linha.rotation.x = Math.PI / 2;
        linha.position.set(xOff, ALTURA_EIXO + 0.5, 0);
        moto.add(linha);
    });

    // ─── Painéis laterais (fairings) — dois de cada lado, com ângulo ───────────
    [-1, 1].forEach(lado => {
        // Painel traseiro
        const gPanelT = new THREE.BoxGeometry(0.08, 0.65, ENTRE_EIXOS * 0.42);
        const panelT = new THREE.Mesh(gPanelT, matMetalTex);
        panelT.position.set(lado * 0.48, ALTURA_EIXO + 0.45, ZT + 1.2);
        panelT.rotation.z = lado * -0.18; // ligeiramente inclinado para fora
        moto.add(panelT);
        // Borda neon do painel traseiro
        const gBordaT = new THREE.BoxGeometry(0.03, 0.65, ENTRE_EIXOS * 0.42);
        const bordaT = new THREE.Mesh(gBordaT, matNeonFraco);
        bordaT.position.set(lado * 0.52, ALTURA_EIXO + 0.45, ZT + 1.2);
        bordaT.rotation.z = lado * -0.18;
        moto.add(bordaT);

        // Painel dianteiro
        const gPanelF = new THREE.BoxGeometry(0.08, 0.5, ENTRE_EIXOS * 0.32);
        const panelF = new THREE.Mesh(gPanelF, matMetalTex);
        panelF.position.set(lado * 0.38, ALTURA_EIXO + 0.52, ZF - 0.85);
        panelF.rotation.z = lado * -0.12;
        moto.add(panelF);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. GUARDA-LAMAS (carenagens envolventes das rodas)
    // ═══════════════════════════════════════════════════════════════════════════
    function criarGuardaLama(posZ, sentido) {
        const g = new THREE.Group();
        g.position.set(0, ALTURA_EIXO, posZ);
        // Rodar o grupo para o mesmo plano das rodas (eixo Y), igual a criarRoda()
        g.rotation.y = Math.PI / 2;

        // Semi-arco que cobre a roda por cima
        // Usamos um tubo toroidal mas cortado apenas na metade superior
        const gArco = new THREE.TorusGeometry(RR + 0.18, 0.14, 16, 80, Math.PI);
        const arco = new THREE.Mesh(gArco, matMetalTex);
        arco.rotation.z = -Math.PI / 2; // começar do lado direito e ir para cima
        arco.scale.z = 0.55;            // comprimir para ser mais fino lateralmente
        g.add(arco);

        // Borda neon no arco
        const gArcoBorda = new THREE.TorusGeometry(RR + 0.26, 0.03, 8, 80, Math.PI);
        const arcoBorda = new THREE.Mesh(gArcoBorda, matNeon);
        arcoBorda.rotation.z = -Math.PI / 2;
        arcoBorda.scale.z = 0.55;
        g.add(arcoBorda);

        moto.add(g);
    }
    criarGuardaLama(ZT, -1);
    criarGuardaLama(ZF, 1);

    // Braço de suporte do guarda-lama traseiro ao chassis (swingarm)
    const gSwing = new THREE.CapsuleGeometry(0.07, ENTRE_EIXOS * 0.42, 8, 16);
    const swing = new THREE.Mesh(gSwing, matCasco);
    swing.rotation.x = Math.PI / 2;
    swing.rotation.z = 0.08;
    swing.position.set(0, ALTURA_EIXO + 0.1, ZT + ENTRE_EIXOS * 0.21);
    moto.add(swing);

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. PROA / NARIZ DIANTEIRO (cone aerodinâmico)
    // ═══════════════════════════════════════════════════════════════════════════
    const gNariz = new THREE.ConeGeometry(0.32, 1.6, 32);
    const nariz = new THREE.Mesh(gNariz, matMetalTex);
    nariz.rotation.x = Math.PI / 2;
    nariz.scale.x = 0.7;
    nariz.scale.y = 0.55;
    nariz.position.set(0, ALTURA_EIXO + 0.62, ZF + 0.9);
    moto.add(nariz);

    // Fenda neon no nariz
    const gFendaNariz = new THREE.BoxGeometry(0.9, 0.05, 0.25);
    const fendaNariz = new THREE.Mesh(gFendaNariz, matNeon);
    fendaNariz.position.set(0, ALTURA_EIXO + 0.58, ZF + 0.42);
    moto.add(fendaNariz);

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. CAUDA / TRASEIRA (bico pontiagudo com aletas)
    // ═══════════════════════════════════════════════════════════════════════════
    const gCauda = new THREE.ConeGeometry(0.28, 1.2, 32);
    const cauda = new THREE.Mesh(gCauda, matMetalTex);
    cauda.rotation.x = -Math.PI / 2;
    cauda.scale.x = 0.65;
    cauda.scale.y = 0.5;
    cauda.position.set(0, ALTURA_EIXO + 0.74, ZT - 0.65);
    moto.add(cauda);

    // Bico neon traseiro (onde nasce o rasto de luz)
    const gBicoNeon = new THREE.ConeGeometry(0.08, 0.3, 16);
    const bicoNeon = new THREE.Mesh(gBicoNeon, matNeon);
    bicoNeon.rotation.x = -Math.PI / 2;
    bicoNeon.position.set(0, ALTURA_EIXO + 0.74, ZT - 1.25);
    moto.add(bicoNeon);

    // Aletas laterais traseiras
    [-1, 1].forEach(lado => {
        const gAleta = new THREE.BoxGeometry(0.5, 0.5, 0.08);
        const aleta = new THREE.Mesh(gAleta, matMetalTex);
        aleta.rotation.z = lado * 0.3;
        aleta.position.set(lado * 0.38, ALTURA_EIXO + 0.85, ZT - 0.4);
        moto.add(aleta);
        // Linha neon na borda da aleta
        const gLinhaAleta = new THREE.BoxGeometry(0.5, 0.04, 0.06);
        const linhaAleta = new THREE.Mesh(gLinhaAleta, matNeon);
        linhaAleta.rotation.z = lado * 0.3;
        linhaAleta.position.set(lado * 0.38, ALTURA_EIXO + 1.09, ZT - 0.4);
        moto.add(linhaAleta);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. COCKPIT — BANCO + CABEÇA DO PILOTO (estilizado)
    // ═══════════════════════════════════════════════════════════════════════════

    // Banco comprido e achatado
    const gBanco = new THREE.BoxGeometry(0.52, 0.12, 1.15);
    const banco = new THREE.Mesh(gBanco, matCascoEscuro);
    banco.position.set(0, ALTURA_EIXO + 1.02, -0.2);
    moto.add(banco);

    // Corcunda / hump aerodinámica atrás do banco
    const gHump = new THREE.CapsuleGeometry(0.2, 0.55, 8, 16);
    const hump = new THREE.Mesh(gHump, matCasco);
    hump.rotation.x = Math.PI / 2;
    hump.scale.y = 0.55;
    hump.position.set(0, ALTURA_EIXO + 1.08, -0.65);
    moto.add(hump);

    // Piloto estilizado: torso + capacete
    const gTorso = new THREE.CapsuleGeometry(0.18, 0.55, 8, 16);
    const torso = new THREE.Mesh(gTorso, matCasco);
    torso.rotation.x = Math.PI * 0.1; // ligeiramente inclinado para a frente
    torso.position.set(0, ALTURA_EIXO + 1.45, 0.1);
    moto.add(torso);

    // Linhas neon no fato do piloto
    const gFaixaPiloto = new THREE.BoxGeometry(0.37, 0.04, 0.04);
    [-0.1, 0.15, 0.4].forEach(yOff => {
        const fp = new THREE.Mesh(gFaixaPiloto, matNeonFraco);
        fp.position.set(0, ALTURA_EIXO + 1.28 + yOff, 0.12);
        moto.add(fp);
    });

    const gCapacete = new THREE.SphereGeometry(0.22, 24, 24);
    const capacete = new THREE.Mesh(gCapacete, matCasco);
    capacete.scale.y = 1.1;
    capacete.scale.z = 1.2;
    capacete.position.set(0, ALTURA_EIXO + 1.98, 0.18);
    moto.add(capacete);

    // Viseira neon
    const gViseira = new THREE.BoxGeometry(0.28, 0.09, 0.22);
    const viseira = new THREE.Mesh(gViseira, matNeon);
    viseira.position.set(0, ALTURA_EIXO + 1.975, 0.31);
    moto.add(viseira);

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. GUIDÕES (handlebars)
    // ═══════════════════════════════════════════════════════════════════════════
    const gBarraH = new THREE.CapsuleGeometry(0.035, 0.9, 8, 16); // barra horizontal
    barraH = new THREE.Mesh(gBarraH, matCasco);
    barraH.rotation.z = Math.PI / 2;
    barraH.position.set(0, ALTURA_EIXO + 1.28, 0.65);
    moto.add(barraH);

    // Hastes dos guidões (descem para os apoios)
    [-0.46, 0.46].forEach(xOff => {
        const gHaste = new THREE.CapsuleGeometry(0.03, 0.35, 8, 8);
        const haste = new THREE.Mesh(gHaste, matCascoEscuro);
        haste.rotation.x = Math.PI / 2;
        haste.position.set(xOff, ALTURA_EIXO + 1.3, 0.44);
        moto.add(haste);
    });

    // Neon nos punhos
    [-0.43, 0.43].forEach(xOff => {
        const gPunho = new THREE.CapsuleGeometry(0.045, 0.2, 8, 8);
        const punho = new THREE.Mesh(gPunho, matNeon);
        punho.rotation.z = Math.PI / 2;
        punho.position.set(xOff, ALTURA_EIXO + 1.28, 0.65);
        moto.add(punho);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. MOTOR EXPOSTO / DETALHES MECÂNICOS
    // ═══════════════════════════════════════════════════════════════════════════

    // Caixa do motor (bloco central entre os apoios)
    const gBloco = new THREE.BoxGeometry(0.55, 0.5, 0.85);
    const bloco = new THREE.Mesh(gBloco, matCascoEscuro);
    bloco.position.set(0, ALTURA_EIXO - 0.02, 0.15);
    moto.add(bloco);

    // Grade de arrefecimento (linhas em relevo)
    for (let i = -2; i <= 2; i++) {
        const gGrade = new THREE.BoxGeometry(0.57, 0.04, 0.04);
        const grade = new THREE.Mesh(gGrade, matNeonFraco);
        grade.position.set(0, ALTURA_EIXO + 0.06 + i * 0.09, -0.1);
        moto.add(grade);
    }

    // Escape (tubo semicircular saindo da traseira)
    const gEscape = new THREE.TorusGeometry(0.22, 0.055, 12, 32, Math.PI * 0.7);
    const escape = new THREE.Mesh(gEscape, matCascoEscuro);
    escape.rotation.x = Math.PI / 2;
    escape.rotation.z = Math.PI;
    escape.position.set(0.28, ALTURA_EIXO + 0.16, ZT + 0.8);
    moto.add(escape);

    // Luz neon no escape
    const gNeonEscape = new THREE.TorusGeometry(0.22, 0.02, 8, 32, Math.PI * 0.7);
    const neonEscape = new THREE.Mesh(gNeonEscape, matNeon);
    neonEscape.rotation.x = Math.PI / 2;
    neonEscape.rotation.z = Math.PI;
    neonEscape.position.set(0.28, ALTURA_EIXO + 0.16, ZT + 0.8);
    moto.add(neonEscape);

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. FEIXE DIANTEIRO (farol neon)
    // ═══════════════════════════════════════════════════════════════════════════
    const gFarol = new THREE.BoxGeometry(0.55, 0.08, 0.06);
    const farol = new THREE.Mesh(gFarol, matNeon);
    farol.position.set(0, ALTURA_EIXO + 0.62, ZF + 0.55);
    moto.add(farol);

    // ═══════════════════════════════════════════════════════════════════════════
    // 10. LUZ PONTUAL NEON (ilumina o chão ao redor da moto)
    // ═══════════════════════════════════════════════════════════════════════════
    const luzNeon = new THREE.PointLight(corNeon, 2.0, 6.0, 2);
    luzNeon.position.set(0, ALTURA_EIXO, 0);
    moto.add(luzNeon);

    // Luz extra no nariz (farol)
    const luzFarol = new THREE.PointLight(corNeon, 1.2, 4.0, 2);
    luzFarol.position.set(0, ALTURA_EIXO + 0.6, ZF + 0.6);
    moto.add(luzFarol);

    // ═══════════════════════════════════════════════════════════════════════════
    // 11. SOMBRAS
    // ═══════════════════════════════════════════════════════════════════════════
    moto.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Centrar a moto no chão (y=0)
    moto.position.y = 0;

    return raiz;
}

// Variável auxiliar (escapa ao lint de var no loop)
var barraH;
