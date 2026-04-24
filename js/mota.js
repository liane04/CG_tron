import * as THREE from 'three';

/**
 * Cria uma light cycle estilo Tron Legacy extremamente detalhada.
 * Cumpre rigorosamente o protocolo: Apenas BoxGeometry e CylinderGeometry.
 *
 * @param {number} corNeon   Cor hex do neon (ex: 0x00ffff para ciano)
 * @returns {THREE.Group}    Grupo pronto a adicionar à cena
 */
export function criarMota(corNeon = 0x00ffff) {

    // ─── Escala global ─────────────────────────────────────────────────────────
    const ESCALA       = 0.38;
    const LARGURA_MULT = 1.7;  

    const raiz = new THREE.Group();
    const moto = new THREE.Group();
    raiz.add(moto);
    raiz.scale.set(ESCALA * LARGURA_MULT, ESCALA, ESCALA);

    // ─── Carregador de texturas ─────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();

    // Texturas do pneu (concreto) — diffuse + normal + rough
    const texPneuDiff  = loader.load('./textures/mota/concrete_tile_facade_diff_2k.jpg');
    const texPneuNor   = loader.load('./textures/mota/concrete_tile_facade_nor_gl_2k.jpg');
    const texPneuRough = loader.load('./textures/mota/concrete_tile_facade_rough_2k.jpg');
    // Textura de metal (para partes do chassis e motor)
    const texMetal     = loader.load('./textures/mota/metal_texture.png');
    
    [texPneuDiff, texPneuNor, texPneuRough, texMetal].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = 16; // Máxima nitidez em ângulos rasos
    });
    
    texPneuDiff.repeat.set(3, 1);
    texPneuNor.repeat.set(3, 1);
    texPneuRough.repeat.set(3, 1);
    texMetal.repeat.set(2, 2);

    // ─── Materiais ──────────────────────────────────────────────────────────────
    const matPneuTex = new THREE.MeshStandardMaterial({
        map:          texPneuDiff,
        normalMap:    texPneuNor,
        roughnessMap: texPneuRough,
        roughness:    1.0,
        metalness:    0.05,
        color:        0x222222,
        side:         THREE.DoubleSide,
    });

    const matMetalTex = new THREE.MeshStandardMaterial({
        map:       texMetal,
        roughness: 0.25,
        metalness: 0.90,
        color:     0x111111,
        side:      THREE.DoubleSide,
    });

    const matCasco = new THREE.MeshStandardMaterial({
        map:       texMetal,
        color:     0x080808,
        metalness: 0.95,
        roughness: 0.12,
        side:      THREE.DoubleSide,
    });
    
    const matCascoEscuro = new THREE.MeshStandardMaterial({
        map:       texMetal,
        color:     0x020202,
        metalness: 0.8,
        roughness: 0.3,
        side:      THREE.DoubleSide,
    });
    
    const matNeon = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 4.0,
        roughness: 0.0,
        metalness: 0.0,
        toneMapped: false,
        side: THREE.DoubleSide,
    });
    
    const matNeonFraco = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        toneMapped: false,
        side: THREE.DoubleSide,
    });

    // ─── Dimensões base ─────────────────────────────────────────────────────────
    const RR = 1.15;          
    const LR = 0.45;          // Ligeiramente mais larga
    const ENTRE_EIXOS = 4.8;  
    const ZT = -ENTRE_EIXOS / 2; 
    const ZF =  ENTRE_EIXOS / 2; 
    const ALTURA_EIXO = RR;   

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. RODAS SÓLIDAS DE ALTA FIDELIDADE
    // ═══════════════════════════════════════════════════════════════════════════
    function criarRodaDetalhada(posZ) {
        const g = new THREE.Group();
        g.position.set(0, ALTURA_EIXO, posZ);
        
        // Pneu maciço principal
        const pneu = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR, LR, 48), matPneuTex);
        pneu.rotation.z = Math.PI / 2;
        g.add(pneu);

        // Detalhamento lateral (ambos os lados)
        [-1, 1].forEach(lado => {
            // Aro Neon embutido
            const aroNeon = new THREE.Mesh(new THREE.CylinderGeometry(RR * 0.88, RR * 0.88, LR + 0.02, 48), matNeon);
            aroNeon.rotation.z = Math.PI / 2;
            g.add(aroNeon);

            // Jante metálica esculpida
            const jante = new THREE.Mesh(new THREE.CylinderGeometry(RR * 0.85, RR * 0.85, LR + 0.04, 32), matMetalTex);
            jante.rotation.z = Math.PI / 2;
            g.add(jante);

            // Disco de travão / acionador mecânico
            const disco = new THREE.Mesh(new THREE.CylinderGeometry(RR * 0.5, RR * 0.5, LR + 0.08, 32), matCascoEscuro);
            disco.rotation.z = Math.PI / 2;
            g.add(disco);

            // Cubo central / Eixo
            const cubo = new THREE.Mesh(new THREE.CylinderGeometry(RR * 0.15, RR * 0.15, LR + 0.18, 16), matMetalTex);
            cubo.rotation.z = Math.PI / 2;
            g.add(cubo);

            // Raios esculpidos na roda (BoxGeometry sobrepostas ao disco maciço)
            for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                const raio = new THREE.Mesh(new THREE.BoxGeometry(0.12, RR * 0.4, 0.06), matCasco);
                raio.position.set(lado * (LR / 2 + 0.03), Math.cos(ang) * RR * 0.65, Math.sin(ang) * RR * 0.65);
                raio.rotation.x = -ang;
                g.add(raio);
            }
        });

        moto.add(g);
    }
    criarRodaDetalhada(ZT);
    criarRodaDetalhada(ZF);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. SISTEMA DE SUSPENSÃO E BRAÇOS DE LIGAÇÃO
    // ═══════════════════════════════════════════════════════════════════════════
    // Garfo dianteiro invertido (Upside-down fork)
    [-1, 1].forEach(lado => {
        const garfo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, RR * 1.8, 16), matMetalTex);
        garfo.position.set(lado * 0.35, ALTURA_EIXO + 0.6, ZF - 0.5);
        garfo.rotation.x = -0.4; // inclinado p/ o chassis
        moto.add(garfo);

        // Bainhas do amortecedor
        const bainha = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 16), matCascoEscuro);
        bainha.position.set(lado * 0.35, ALTURA_EIXO + 0.8, ZF - 0.6);
        bainha.rotation.x = -0.4;
        moto.add(bainha);
    });

    // Braço oscilante traseiro (Swingarm robusto)
    [-1, 1].forEach(lado => {
        const swingarm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 2.0), matMetalTex);
        swingarm.position.set(lado * 0.3, ALTURA_EIXO + 0.2, ZT + 0.9);
        swingarm.rotation.x = -0.15;
        moto.add(swingarm);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. BLOCO DO MOTOR CENTRAL (Super detalhado)
    // ═══════════════════════════════════════════════════════════════════════════
    const gCorpo = new THREE.Group();
    gCorpo.position.set(0, ALTURA_EIXO, 0);

    // Bloco central mecânico
    const motorBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.5), matCascoEscuro);
    motorBase.position.set(0, 0.1, 0.2);
    gCorpo.add(motorBase);

    // Barbatanas de arrefecimento (Cooling fins) em todo o bloco
    for (let i = 0; i < 10; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.04), matMetalTex);
        fin.position.set(0, 0.1, -0.4 + i * 0.15);
        gCorpo.add(fin);
    }

    // Células de energia rotativas ( Glowing power cores )
    [-1, 1].forEach(lado => {
        for (let i = 0; i < 3; i++) {
            // Núcleo brilhante
            const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 16), matNeon);
            cell.rotation.z = Math.PI / 2;
            cell.position.set(lado * 0.2, 0.2, -0.2 + i * 0.3);
            gCorpo.add(cell);
            
            // Invólucro blindado exterior
            const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16), matCasco);
            casing.rotation.z = Math.PI / 2;
            casing.position.set(lado * 0.4, 0.2, -0.2 + i * 0.3);
            gCorpo.add(casing);
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. CARENAGEM AERODINÂMICA E ARMADURA
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Placas laterais primárias
    [-1, 1].forEach(lado => {
        const carenagemLat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 2.5), matMetalTex);
        carenagemLat.position.set(lado * 0.45, 0.5, 0.3);
        carenagemLat.rotation.z = lado * -0.15; // Inclinadas p/ dentro
        gCorpo.add(carenagemLat);

        // Friso Neon angular embutido
        const friso = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.6), matNeon);
        friso.position.set(lado * 0.53, 0.5, 0.3);
        friso.rotation.z = lado * -0.15;
        friso.rotation.x = -0.05;
        gCorpo.add(friso);

        // Entradas de ar agressivas (Intakes)
        const intake = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.4), matCascoEscuro);
        intake.position.set(lado * 0.5, 0.4, 1.2);
        intake.rotation.z = lado * -0.15;
        gCorpo.add(intake);
    });

    // Cobertura Superior (Tanque reforçado)
    const tanque = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.8), matCasco);
    tanque.position.set(0, 0.8, 0.4);
    tanque.rotation.x = 0.05;
    gCorpo.add(tanque);

    // Linha de Neon Central (Spine Dorsal)
    const espinha = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 2.0), matNeon);
    espinha.position.set(0, 1.02, 0.3);
    espinha.rotation.x = 0.05;
    gCorpo.add(espinha);

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. SECÇÃO DIANTEIRA E FARÓIS
    // ═══════════════════════════════════════════════════════════════════════════
    // Nariz principal em cunha
    const bicoFrente = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 1.0), matMetalTex);
    bicoFrente.position.set(0, 0.5, 1.8);
    bicoFrente.rotation.x = 0.2; // Afilado para baixo
    gCorpo.add(bicoFrente);

    // Lâmina / Extensão do bico
    const pontaBico = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.8), matCasco);
    pontaBico.position.set(0, 0.4, 2.4);
    pontaBico.rotation.x = 0.3;
    gCorpo.add(pontaBico);

    // Óticas / Faróis frontais duplos agressivos
    [-1, 1].forEach(lado => {
        const farol = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.1), matNeon);
        farol.position.set(lado * 0.15, 0.45, 2.8);
        gCorpo.add(farol);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 6. CAUDA E EXAUSTORES (THRUSTERS)
    // ═══════════════════════════════════════════════════════════════════════════
    const bicoTras = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.2), matMetalTex);
    bicoTras.position.set(0, 0.7, -1.0);
    bicoTras.rotation.x = -0.15;
    gCorpo.add(bicoTras);

    // Aleta aerodinâmica traseira (Spoiler)
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.4), matCasco);
    spoiler.position.set(0, 0.95, -1.5);
    spoiler.rotation.x = -0.2;
    gCorpo.add(spoiler);
    
    // Friso neon no spoiler
    const spoilerNeon = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.02, 0.05), matNeon);
    spoilerNeon.position.set(0, 0.95, -1.68);
    spoilerNeon.rotation.x = -0.2;
    gCorpo.add(spoilerNeon);

    // Motores de Exaustão Duplos (Turbinas cilíndricas)
    [-1, 1].forEach(lado => {
        const turbina = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.8, 16), matMetalTex);
        turbina.rotation.x = Math.PI / 2;
        turbina.position.set(lado * 0.25, 0.4, -1.4);
        gCorpo.add(turbina);

        const fogoNeon = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16), matNeon);
        fogoNeon.rotation.x = Math.PI / 2;
        fogoNeon.position.set(lado * 0.25, 0.4, -1.8);
        gCorpo.add(fogoNeon);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. GUARDA-LAMAS DE ALTA RESOLUÇÃO (Curva facetada suave com 7 segmentos)
    // ═══════════════════════════════════════════════════════════════════════════
    function criarGuardaLamaFacetado(posZ) {
        const g = new THREE.Group();
        g.position.set(0, ALTURA_EIXO, posZ);

        const raioGuarda = RR + 0.08;
        const numSegmentos = 7;
        const anguloTotal = Math.PI * 0.8; 
        const anguloInicial = -anguloTotal / 2;
        const passo = anguloTotal / (numSegmentos - 1);

        for (let i = 0; i < numSegmentos; i++) {
            const ang = anguloInicial + i * passo;
            
            // Placa protetora
            const segmento = new THREE.Mesh(new THREE.BoxGeometry(LR + 0.2, 0.05, RR * 0.4), matCascoEscuro);
            segmento.position.set(0, Math.cos(ang) * raioGuarda, Math.sin(ang) * raioGuarda);
            segmento.rotation.x = ang;
            g.add(segmento);

            // Grelha / Friso neon interior
            const neonSeg = new THREE.Mesh(new THREE.BoxGeometry(LR + 0.22, 0.06, 0.05), matNeonFraco);
            neonSeg.position.set(0, Math.cos(ang) * raioGuarda, Math.sin(ang) * raioGuarda);
            neonSeg.rotation.x = ang;
            g.add(neonSeg);
        }
        moto.add(g);
    }
    criarGuardaLamaFacetado(ZT);
    criarGuardaLamaFacetado(ZF);

    // ═══════════════════════════════════════════════════════════════════════════
    // 8. COCKPIT CANOPY ESTILO CYBERPUNK (Sem piloto orgânico)
    // ═══════════════════════════════════════════════════════════════════════════
    // Base de montagem do ecrã e assento
    const canopyBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.2), matCascoEscuro);
    canopyBase.position.set(0, 1.0, -0.2);
    canopyBase.rotation.x = 0.1;
    gCorpo.add(canopyBase);

    // Cúpula frontal / Vidro fumado blindado
    const canopyGlass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.9), matCasco);
    canopyGlass.position.set(0, 1.2, 0.0);
    canopyGlass.rotation.x = 0.15;
    gCorpo.add(canopyGlass);

    // HUD Holográfico / Painel de Instrumentos
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), matNeon);
    dash.position.set(0, 1.1, 0.5);
    dash.rotation.x = 0.5;
    gCorpo.add(dash);

    // Guiador / Controlos Integrados (Clip-ons)
    const guiadorBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 16), matMetalTex);
    guiadorBase.rotation.z = Math.PI / 2;
    guiadorBase.position.set(0, 1.1, 0.6);
    gCorpo.add(guiadorBase);

    [-0.4, 0.4].forEach(lado => {
        // Punhos iluminados
        const punho = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16), matNeonFraco);
        punho.rotation.z = Math.PI / 2;
        punho.position.set(lado, 1.1, 0.6);
        gCorpo.add(punho);
        
        // Handguards (Protetores de mão táticos)
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.15), matCascoEscuro);
        guard.position.set(lado, 1.15, 0.65);
        gCorpo.add(guard);
    });

    moto.add(gCorpo);

    // ═══════════════════════════════════════════════════════════════════════════
    // 9. LUZES PONTUAIS E SOMBRAS
    // ═══════════════════════════════════════════════════════════════════════════
    // Iluminação do solo
    const luzNeon = new THREE.PointLight(corNeon, 2.0, 7.0, 2);
    luzNeon.position.set(0, ALTURA_EIXO, 0);
    moto.add(luzNeon);

    // Iluminação do caminho / Farol direcional
    const luzFarol = new THREE.PointLight(corNeon, 1.5, 5.0, 2);
    luzFarol.position.set(0, ALTURA_EIXO + 0.5, ZF + 1.0);
    moto.add(luzFarol);

    // Ativar sombras em TODAS as meshes filhas
    moto.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Pousar a mota no eixo y=0
    moto.position.y = 0;

    return raiz;
}

