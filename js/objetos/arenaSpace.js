import * as THREE from 'three';

// Guardamos as referências dos grupos que precisam de rodar para o loop de animação
export var blocosOrbitais = [];

/**
 * Adiciona todos os elementos decorativos da arena Space.
 */
export function adicionarObjetosSpace(grupo, ARENA) {
    blocosOrbitais = []; 

    // 1. Torres ADN (Pilares nos cantos centrais)
    const posicoesADN = [
        new THREE.Vector3(18, 0, 18),
        new THREE.Vector3(-18, 0, 18),
        new THREE.Vector3(18, 0, -18),
        new THREE.Vector3(-18, 0, -18)
    ];

    posicoesADN.forEach(pos => {
        const torreADN = criarNucleoADN(pos);
        grupo.add(torreADN);

        // Adicionar Anéis flutuando acima de cada torre ADN (altura torre=14 + offset=3)
        const posTopo = pos.clone().add(new THREE.Vector3(0, 17, 0));
        grupo.add(criarAneisSaturno(posTopo));
    });

    // 2. Monólitos Matrix (Posicionados FORA da arena para efeito de fundo)
    const configMonolitos = [
        { pos: new THREE.Vector3(50, 0, 10), rot: 0.5, scale: 2.5 },
        { pos: new THREE.Vector3(-55, -5, -20), rot: -0.3, scale: 3.0 },
        { pos: new THREE.Vector3(20, 10, 60), rot: 1.2, scale: 2.0 },
        { pos: new THREE.Vector3(-40, -10, -50), rot: -0.8, scale: 4.0 }
    ];

    configMonolitos.forEach(cfg => {
        const monolito = criarMonolitoMatrix(cfg.pos);
        monolito.rotation.y = cfg.rot;
        monolito.scale.set(cfg.scale, cfg.scale, cfg.scale);
        grupo.add(monolito);
    });

    // 3. HUDs como Obstáculos (Mini-Paredes de Vidro)
    // Apenas 2 objetos na arena, conforme solicitado
    const numObstaculos = 2;
    for (let i = 0; i < numObstaculos; i++) {
        let x, z;
        const raioSeguro = 15;
        do {
            x = (Math.random() - 0.5) * 60;
            z = (Math.random() - 0.5) * 60;
        } while (Math.sqrt(x * x + z * z) < raioSeguro);

        const posHUD = new THREE.Vector3(x, 2.5, z);
        const hudObstaculo = criarHUDHolografico(posHUD, 0x00ffff);
        hudObstaculo.rotation.y = Math.random() * Math.PI * 2;
        hudObstaculo.userData.baseY = 2.5;
        hudObstaculo.userData.isObstacle = true; 
        grupo.add(hudObstaculo);
    }
}


/**
 * Anima os blocos orbitais dos pilares.
 */
export function atualizarSpace(delta) {
    blocosOrbitais.forEach(grupoAnimacao => {
        
        // Se for o ADN, apenas roda (como fizemos antes)
        if (!grupoAnimacao.userData.tipo) {
            grupoAnimacao.rotation.y += 1.2 * delta; 
        } 
        // Se for o Monólito, faz os pixels deslizarem
        else if (grupoAnimacao.userData.tipo === 'monolito') {
            const pixels = grupoAnimacao.userData.pixels;
            pixels.children.forEach(pixel => {
                // Move o pixel
                pixel.position.y += pixel.userData.velocidade * pixel.userData.direcao * delta;
                
                // Se sair dos limites da altura (16), volta para o outro lado
                if (pixel.position.y > 16) pixel.position.y = 0;
                if (pixel.position.y < 0) pixel.position.y = 16;
            });
        }
        // Se for Saturno, anima a rotação de cada anel individualmente
        else if (grupoAnimacao.userData.tipo === 'saturno') {
            grupoAnimacao.children.forEach(anel => {
                if (anel.name === 'anelAnimado') {
                    anel.rotation.x += anel.userData.velocidadeX * delta * 60;
                    anel.rotation.y += anel.userData.velocidadeY * delta * 60;
                }
            });
        }
        // Se for o HUD, faz uma flutuação suave
        else if (grupoAnimacao.userData.tipo === 'hud') {
            const tempo = Date.now() * 0.002;
            grupoAnimacao.position.y = grupoAnimacao.userData.baseY + Math.sin(tempo) * 0.5;
        }
        
    });
}

/**
 * Constrói um pilar com rachaduras neon e blocos flutuantes orbitais.
 * Usa apenas BoxGeometry e CylinderGeometry.
 */
function construirPilarTecnologico(posicao) {
    const pilarGrupo = new THREE.Group();
    pilarGrupo.position.copy(posicao);

    // 1. Corpo Principal do Pilar (Cilindro)
    const geoCorpo = new THREE.CylinderGeometry(1.2, 1.5, 12, 8);
    const matCorpo = new THREE.MeshStandardMaterial({ 
        color: 0x050505, 
        roughness: 0.1, 
        metalness: 0.8 
    });
    const corpo = new THREE.Mesh(geoCorpo, matCorpo);
    corpo.position.y = 6; // Metade da altura para assentar no chão
    corpo.castShadow = true;
    corpo.receiveShadow = true;
    pilarGrupo.add(corpo);

    // 2. Materiais Neon
    const matNeon = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 3,
        toneMapped: false
    });

    // 3. Rachaduras/Linhas de Energia (BoxGeometry muito finas)
    for (let i = 0; i < 6; i++) {
        const altura = 1 + Math.random() * 4;
        const geoLinha = new THREE.BoxGeometry(0.1, altura, 1.3); // O 1.3 faz "sair" um pouco do cilindro
        const linha = new THREE.Mesh(geoLinha, matNeon);
        
        linha.position.y = 2 + Math.random() * 8;
        linha.rotation.y = (i / 6) * Math.PI * 2;
        pilarGrupo.add(linha);
    }

    // 4. Anéis de Energia (Feitos com cilindros ocos ou caixas em círculo)
    // Como Ring/Torus são proibidos, usamos 4 Boxes pequenas para simular um anel quadrado
    const anelGrupo = new THREE.Group();
    anelGrupo.position.y = 10;
    
    for (let j = 0; j < 4; j++) {
        const segmento = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), matNeon);
        segmento.rotation.y = (j * Math.PI) / 2;
        segmento.position.set(
            Math.cos(j * Math.PI / 2) * 1.5,
            0,
            Math.sin(j * Math.PI / 2) * 1.5
        );
        anelGrupo.add(segmento);
    }
    pilarGrupo.add(anelGrupo);

    // 5. Partículas Orbitais (Pequenos cubos que vão rodar)
    const orbitaGrupo = new THREE.Group();
    orbitaGrupo.position.y = 6;
    
    for (let k = 0; k < 12; k++) {
        const cubo = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), matNeon);
        const raio = 2.5 + Math.random() * 1.5;
        const angulo = Math.random() * Math.PI * 2;
        
        cubo.position.set(
            Math.cos(angulo) * raio,
            (Math.random() - 0.5) * 10,
            Math.sin(angulo) * raio
        );
        orbitaGrupo.add(cubo);
    }
    pilarGrupo.add(orbitaGrupo);
    
    // Adicionar à lista global para o loop animar
    blocosOrbitais.push(orbitaGrupo);

    return pilarGrupo;
}

/**
 * Constrói uma torre de ADN nuclear contida num tubo de vidro com iluminação dinâmica.
 * Cumpre a regra de usar apenas BoxGeometry e CylinderGeometry.
 */
function criarNucleoADN(posicao) {
    const grupoTorre = new THREE.Group();     // Grupo principal (estático no chão)
    const grupoParticulas = new THREE.Group(); // Subgrupo que irá rodar (animação)
    
    const alturaTotal = 14;
    const raioHelice = 1.2;
    const raioTubo = 1.8;

    // --- Materiais Space ---
    const matPilar = new THREE.MeshStandardMaterial({ 
        color: 0x050505, 
        metalness: 0.9, 
        roughness: 0.1 
    });
    
    const matVidro = new THREE.MeshStandardMaterial({
        color: 0x00cfff, 
        transparent: true, 
        opacity: 0.15, 
        metalness: 0.5, 
        depthWrite: false, 
        side: THREE.DoubleSide
    });

    const matCiano = new THREE.MeshStandardMaterial({
        color: 0x00cfff, 
        emissive: 0x00cfff, 
        emissiveIntensity: 5, 
        toneMapped: false
    });

    const matMagenta = new THREE.MeshStandardMaterial({
        color: 0xff0000, 
        emissive: 0xff0000, 
        emissiveIntensity: 4, 
        toneMapped: false
    });

    // 1. Pilar Central (Cylinder - Estático)
    const geoPilar = new THREE.CylinderGeometry(0.3, 0.3, alturaTotal, 12);
    const pilar = new THREE.Mesh(geoPilar, matPilar);
    pilar.position.y = alturaTotal / 2;
    grupoTorre.add(pilar);

    // 2. Tubo de Vidro (Cylinder - Estático / Futura Hitbox)
    const geoVidro = new THREE.CylinderGeometry(raioTubo, raioTubo, alturaTotal, 16);
    const vidro = new THREE.Mesh(geoVidro, matVidro);
    vidro.position.y = alturaTotal / 2;
    grupoTorre.add(vidro);

    // 3. Gerar Partículas em Dupla Hélice (Box - Animadas)
    const geoParticula = new THREE.BoxGeometry(0.12, 0.12, 0.12); 
    const totalParticulas = 4 * 60; // 4 voltas completas

    for (let i = 0; i <= totalParticulas; i++) {
        const t = i / totalParticulas; 
        const angulo = (i / 60) * Math.PI * 2;
        const y = t * alturaTotal;

        // Fita Ciano
        const p1 = new THREE.Mesh(geoParticula, matCiano);
        p1.position.set(Math.cos(angulo) * raioHelice, y, Math.sin(angulo) * raioHelice);
        grupoParticulas.add(p1);

        // Fita Magenta
        const p2 = new THREE.Mesh(geoParticula, matMagenta);
        p2.position.set(Math.cos(angulo + Math.PI) * raioHelice, y, Math.sin(angulo + Math.PI) * raioHelice);
        grupoParticulas.add(p2);
    }
    grupoTorre.add(grupoParticulas);

    // 4. Bases e Topo (Cylinder - Estático)
    const geoTampa = new THREE.CylinderGeometry(raioTubo + 0.3, raioTubo + 0.3, 0.5, 16);
    const base = new THREE.Mesh(geoTampa, matPilar);
    const topo = new THREE.Mesh(geoTampa, matPilar);
    topo.position.y = alturaTotal;
    grupoTorre.add(base);
    grupoTorre.add(topo);

    // 5. Anéis Neon Físicos (Para o efeito visual de emissão)
    const geoAnel = new THREE.CylinderGeometry(raioTubo + 0.31, raioTubo + 0.31, 0.15, 16);
    const anelBase = new THREE.Mesh(geoAnel, matCiano);
    anelBase.position.y = 0.1;
    grupoTorre.add(anelBase);

    const anelTopo = new THREE.Mesh(geoAnel, matMagenta);
    anelTopo.position.y = alturaTotal - 0.1;
    grupoTorre.add(anelTopo);

    // 6. Luzes Pontuais (PointLight - Para iluminar a arena e a mota) 
    const luzBase = new THREE.PointLight(0x00cfff, 40, 12, 2);
    luzBase.position.set(0, 1, 0);
    grupoTorre.add(luzBase);

    const luzTopo = new THREE.PointLight(0xff00ff, 30, 10, 2);
    luzTopo.position.set(0, alturaTotal - 1, 0);
    grupoTorre.add(luzTopo);

    // Configuração Final
    grupoTorre.position.copy(posicao);
    
    // Adicionamos apenas o subgrupo de partículas à lista de rotação [cite: 21]
    blocosOrbitais.push(grupoParticulas);

    return grupoTorre;
}

/**
 * Constrói um Monólito de Dados "Matrix".
 * Usa apenas BoxGeometry para cumprir os requisitos do projeto.
 */
function criarMonolitoMatrix(posicao) {
    const grupoMonolito = new THREE.Group();
    const grupoPixels = new THREE.Group(); // Subgrupo para os pixels móveis
    
    const largura = 3;
    const alturaTotal = 16;
    const profundidade = 3;

    // --- Materiais ---
    const matCore = new THREE.MeshStandardMaterial({ 
        color: 0x000511, // Azul quase preto
        metalness: 0.8, 
        roughness: 0.2 
    });
    
    const matPixelCiano = new THREE.MeshStandardMaterial({
        color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 4, toneMapped: false
    });
    
    const matPixelVermelho = new THREE.MeshStandardMaterial({
        color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4, toneMapped: false
    });

    const matPixelEscuro = new THREE.MeshStandardMaterial({
        color: 0x222222, metalness: 1.0, roughness: 0.0
    });

    // 1. Núcleo Central (BoxGeometry estática)
    const geoCore = new THREE.BoxGeometry(largura, alturaTotal, profundidade);
    const core = new THREE.Mesh(geoCore, matCore);
    core.position.y = alturaTotal / 2;
    // Opcional: Para colisões no futuro
    core.userData.isObstacle = true;
    grupoMonolito.add(core);

    // 2. Pixels de Dados (BoxGeometry animadas)
    const numPixels = 800;
    const geoPixel = new THREE.BoxGeometry(0.07, 0.07, 0.07);

    for (let i = 0; i < numPixels; i++) {
        // Escolher material aleatório (maioria escuros, alguns neon)
        const rand = Math.random();
        let mat = matPixelEscuro;
        if (rand > 0.85) mat = matPixelCiano;
        else if (rand > 0.70) mat = matPixelVermelho;

        const pixel = new THREE.Mesh(geoPixel, mat);

        // Posicionar na superfície do núcleo central
        const face = Math.floor(Math.random() * 4); // 0, 1, 2 ou 3 (as 4 faces laterais)
        const offset = (Math.random() - 0.5) * largura;
        const distFace = largura / 2 + 0.1; // +0.1 para ficar ligeiramente fora da parede

        if (face === 0) pixel.position.set(offset, 0, distFace);      // Frente
        if (face === 1) pixel.position.set(offset, 0, -distFace);     // Trás
        if (face === 2) pixel.position.set(distFace, 0, offset);      // Direita
        if (face === 3) pixel.position.set(-distFace, 0, offset);     // Esquerda

        // Atribuir uma altura inicial aleatória
        pixel.position.y = Math.random() * alturaTotal;
        
        // Guardar dados de animação dentro do próprio pixel (velocidade e direção)
        pixel.userData.velocidade = 2 + Math.random() * 15;
        pixel.userData.direcao = Math.random() > 0.5 ? 1 : -1;

        grupoPixels.add(pixel);
    }

    grupoMonolito.add(grupoPixels);
    
    // 3. Luz Pontual para iluminar a arena ao redor do monólito
    const luz = new THREE.PointLight(0x00cfff, 30, 15, 2);
    luz.position.set(0, alturaTotal / 2, 0);
    grupoMonolito.add(luz);

    // Configuração Final
    grupoMonolito.position.copy(posicao);
    
    // Adicionamos um identificador para sabermos como o animar no loop
    grupoMonolito.userData.tipo = 'monolito';
    grupoMonolito.userData.pixels = grupoPixels;
    
    blocosOrbitais.push(grupoMonolito);

    return grupoMonolito;
}

/**
 * Cria um objeto de Anéis de Saturno (Giroscópio) com animação retro.
 */
function criarAneisSaturno(posicao) {
    const grupo = new THREE.Group();
    
    // Materiais em modo "Arame" (Wireframe) para o look retro
    const matCiano = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const matVermelho = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });

    // Raios ajustados: o maior tem o raio do cilindro (1.8), combinando os diâmetros
    const raios = [1.0, 1.4, 1.8];
    const materiais = [matCiano, matVermelho, matCiano];

    raios.forEach((raio, index) => {
        // TorusGeometry(raio, espessura_do_tubo, segmentos_radiais, segmentos_tubulares)
        const anel = new THREE.Mesh(new THREE.TorusGeometry(raio, 0.2, 8, 24), materiais[index]);
        
        // Inclinar cada anel de forma diferente para não ficarem colados
        anel.rotation.x = Math.random() * Math.PI;
        anel.rotation.y = Math.random() * Math.PI;
        
        // Etiqueta crucial para os podermos animar mais tarde
        anel.name = 'anelAnimado'; 
        // Velocidades de rotação únicas guardadas no próprio objeto
        anel.userData = {
            velocidadeX: (Math.random() - 0.5) * 0.05,
            velocidadeY: (Math.random() - 0.5) * 0.05
        };
        
        grupo.add(anel);
    });

    // Luz a emanar do centro do giroscópio
    const luz = new THREE.PointLight(0x00ffff, 10, 20);
    grupo.add(luz);

    grupo.position.copy(posicao);
    
    // Identificador para animação
    grupo.userData.tipo = 'saturno';
    blocosOrbitais.push(grupo);

    return grupo;
}

/**
 * Cria um cluster de ecrãs holográficos fragmentados (HUD).
 */
function criarHUDHolografico(posicao, corNeon) {
    const grupoHUD = new THREE.Group();

    // 1. Material de Vidro Holográfico (Mais opaco e brilhante para ser um obstáculo visível)
    const matVidro = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 4, // Muito mais brilhante
        transparent: true,
        opacity: 0.8, // Mais opaco
        metalness: 0.9,
        roughness: 0.05,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });

    const matContorno = new THREE.LineBasicMaterial({ 
        color: corNeon, 
        transparent: true, 
        opacity: 0.8 
    });

    // 2. Função auxiliar para criar uma placa individual
    function criarPlaca(raio, lados, x, y, z, rotacaoZ) {
        // Cilindro com altura mínima vira um ecrã plano
        const geo = new THREE.CylinderGeometry(raio, raio, 0.05, lados);
        const placa = new THREE.Mesh(geo, matVidro);
        
        placa.rotation.x = Math.PI / 2;
        placa.rotation.z = rotacaoZ; 
        placa.position.set(x, y, z);

        const moldura = new THREE.LineSegments(new THREE.EdgesGeometry(geo), matContorno);
        placa.add(moldura);

        return placa;
    }

    // 3. Montagem do Cluster (Tamanhos reduzidos para mini-paredes)
    // Ecrã Central
    grupoHUD.add(criarPlaca(1.5, 6, 0, 0, 0, Math.PI / 6));

    // Ecrãs Laterais Curvados
    const ecraEsq = criarPlaca(1.0, 6, -2.2, 0, 0.6, Math.PI / 6);
    ecraEsq.rotation.y = Math.PI / 8; 
    grupoHUD.add(ecraEsq);

    const ecraDir = criarPlaca(1.0, 6, 2.2, 0, 0.6, Math.PI / 6);
    ecraDir.rotation.y = -Math.PI / 8;
    grupoHUD.add(ecraDir);

    // 4. Luz de Emissão (Reduzida para não ofuscar)
    const luzEcra = new THREE.PointLight(corNeon, 3, 8);
    luzEcra.position.z = 1; 
    grupoHUD.add(luzEcra);

    grupoHUD.position.copy(posicao);
    
    // Identificador para animação
    grupoHUD.userData.tipo = 'hud';
    blocosOrbitais.push(grupoHUD);
    
    return grupoHUD;
}