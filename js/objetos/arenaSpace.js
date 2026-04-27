import * as THREE from 'three';

// Guardamos as referências dos grupos que precisam de rodar para o loop de animação
export var blocosOrbitais = [];

/**
 * Adiciona todos os elementos decorativos da arena Space.
 */
export function adicionarObjetosSpace(grupo, ARENA, loader) {
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
    });

    // 2. Drone Vigia (Apenas 1 conforme solicitado)
    const posDrone = new THREE.Vector3(30, 35, 30);
    grupo.add(criarDroneVigia(posDrone));

    // 3. Monólitos Matrix (Posicionados FORA da arena para efeito de fundo)
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

        const posHUD = new THREE.Vector3(x, 1.6, z);
        const hudObstaculo = criarHUDHolografico(posHUD, 0x00ffff, loader);
        hudObstaculo.rotation.y = Math.random() * Math.PI * 2;
        hudObstaculo.userData.baseY = 1.6;
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
        // Se for o Drone Vigia
        else if (grupoAnimacao.userData.tipo === 'drone') {
            // Rodar o enxame de mini drones
            const miniDrones = grupoAnimacao.userData.miniDrones;
            if (miniDrones) {
                // Roda a órbita inteira
                miniDrones.rotation.y += 1.5 * delta;
                
                // Roda cada mini-drone individualmente
                miniDrones.children.forEach(mini => {
                    mini.rotation.x += 3.0 * delta;
                    mini.rotation.z += 2.0 * delta;
                });
            }

            // 1. Fazer a Aura "Respirar" (Pulsar)
            const aura = grupoAnimacao.userData.aura;
            if (aura) {
                // ⚙️ PARÂMETROS DE ANIMAÇÃO (ALTERA AQUI)
                const velocidadePulso = 0.005;
                const brilhoMinimo = 0.3;
                const intensidadePulso = 0.5;

                const onda = Math.sin(Date.now() * velocidadePulso); 
                const pulsoPositivo = (onda + 1) / 2; 
                aura.material.opacity = brilhoMinimo + (pulsoPositivo * intensidadePulso);
            }

            // 2. Fazer as Partículas "Choverem" como um feixe contínuo
            const particulas = grupoAnimacao.userData.particulas;
            if (particulas) {
                const pos = particulas.geometry.attributes.position.array;
                const vels = particulas.userData.velocidades;
                const limite = particulas.userData.alturaLimite;

                // ⚙️ PARÂMETROS DE ANIMAÇÃO (ALTERA AQUI)
                const velFluxo = 1.5; 

                for (let i = 0; i < vels.length; i++) {
                    pos[i * 3 + 1] -= vels[i] * velFluxo; 
                    if (pos[i * 3 + 1] < -limite) {
                        pos[i * 3 + 1] = 0; 
                    }
                }
                particulas.geometry.attributes.position.needsUpdate = true;
            }
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
function criarHUDHolografico(posicao, corNeon, loader) {
    const grupoHUD = new THREE.Group();

    // 1. Carregar texturas de vidro
    const path = './textures/neon/vidro/Glass_Window_003_';
    const texBase = loader.load(path + 'basecolor.jpg');
    const texNormal = loader.load(path + 'normal.jpg');
    const texRough = loader.load(path + 'roughness.jpg');
    const texMetal = loader.load(path + 'metallic.jpg');
    const texAlpha = loader.load(path + 'opacity.jpg');
    const texAO = loader.load(path + 'ambientOcclusion.jpg');

    // Configurar repetição para detalhe
    [texBase, texNormal, texRough, texMetal, texAlpha, texAO].forEach(tex => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 1);
    });

    // 2. Material de Vidro Holográfico com Texturas
    const matVidro = new THREE.MeshStandardMaterial({
        map: texBase,
        normalMap: texNormal,
        roughnessMap: texRough,
        metalnessMap: texMetal,
        alphaMap: texAlpha,
        aoMap: texAO,
        color: 0x00ffff, // "Azum" para combinar com o resto
        emissive: 0x00ffff,
        emissiveIntensity: 2, 
        transparent: true,
        opacity: 0.9, 
        metalness: 1.0,
        roughness: 0.1,
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

    // 4. Luz de Emissão
    const luzEcra = new THREE.PointLight(0x00ffff, 50, 15, 2);
    luzEcra.position.set(0, 0, 1.5); 
    grupoHUD.add(luzEcra);

    // Luz adicional para realçar o efeito de vidro azul
    const luzExtra = new THREE.PointLight(0x0088ff, 30, 10, 2);
    luzExtra.position.set(0, 2, -1);
    grupoHUD.add(luzExtra);

    grupoHUD.position.copy(posicao);
    
    // Identificador para animação (desativado conforme pedido)
    grupoHUD.userData.tipo = 'hud';
    
    return grupoHUD;
}

/**
 * Constrói um Drone Vigia com laser intermitente.
 */
function criarDroneVigia(posicao) {
    const drone = new THREE.Group();

    // 1. O Núcleo (Preto com contornos neon subdivididos)
    const matNucleo = new THREE.MeshStandardMaterial({
        color: 0x050505,
        metalness: 0.9,
        roughness: 0.1
    });

    // Criar Geometria de Octaedro Subdividida (Cada face em 3)
    const geoNucleo = new THREE.BufferGeometry();
    const verticesOcta = [
        [1.5, 0, 0], [-1.5, 0, 0], [0, 1.5, 0], [0, -1.5, 0], [0, 0, 1.5], [0, 0, -1.5]
    ];
    const facesOcta = [
        [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
        [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
    ];

    const posicoes = [];
    const centrosFaces = []; // Guardar para os traços neon

    facesOcta.forEach(f => {
        const v1 = verticesOcta[f[0]];
        const v2 = verticesOcta[f[1]];
        const v3 = verticesOcta[f[2]];
        
        // Centro da face
        const cx = (v1[0] + v2[0] + v3[0]) / 3;
        const cy = (v1[1] + v2[1] + v3[1]) / 3;
        const cz = (v1[2] + v2[2] + v3[2]) / 3;
        const centro = [cx, cy, cz];
        centrosFaces.push(centro);

        // 3 Triângulos por face
        posicoes.push(...v1, ...v2, ...centro);
        posicoes.push(...v2, ...v3, ...centro);
        posicoes.push(...v3, ...v1, ...centro);
    });

    geoNucleo.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
    geoNucleo.computeVertexNormals();
    const nucleo = new THREE.Mesh(geoNucleo, matNucleo);
    drone.add(nucleo);

    // 1.1 Contornos Neon Extra Brilhantes
    const matNeonBrilhante = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 15,
        toneMapped: false
    });

    // Função para criar um "traço" neon (cilindro fino)
    function criarTraco(p1, p2) {
        const v1 = new THREE.Vector3(...p1);
        const v2 = new THREE.Vector3(...p2);
        const dist = v1.distanceTo(v2);
        const geoTraco = new THREE.CylinderGeometry(0.02, 0.02, dist, 4);
        const traco = new THREE.Mesh(geoTraco, matNeonBrilhante);
        
        traco.position.copy(v1).lerp(v2, 0.5);
        traco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v2.clone().sub(v1).normalize());
        return traco;
    }

    // Adicionar arestas externas e internas (subdivisão)
    facesOcta.forEach((f, i) => {
        const vIndices = [f[0], f[1], f[2]];
        const centro = centrosFaces[i];
        
        // Arestas externas da face (apenas se ainda não existirem, mas vamos simplificar)
        for (let j = 0; j < 3; j++) {
            const p1 = verticesOcta[vIndices[j]];
            const p2 = verticesOcta[vIndices[(j + 1) % 3]];
            nucleo.add(criarTraco(p1, p2));
            
            // Traço interno (vértice ao centro)
            nucleo.add(criarTraco(p1, centro));
        }
    });

    // 2. Os Mini Drones Orbitais (O Enxame)
    const grupoMiniDrones = new THREE.Group();
    
    const matMiniDrone = new THREE.MeshStandardMaterial({
        color: 0x050505,
        emissive: 0x00ffff,
        emissiveIntensity: 2,
        wireframe: true
    });

    const numMiniDrones = 9;
    const raioOrbita = 3.5;

    for (let i = 0; i < numMiniDrones; i++) {
        const angulo = (i / numMiniDrones) * Math.PI * 2;
        const x = Math.cos(angulo) * raioOrbita;
        const z = Math.sin(angulo) * raioOrbita;

        const miniDrone = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), matMiniDrone);
        miniDrone.position.set(x, 0, z);
        miniDrone.rotation.y = -angulo; 

        grupoMiniDrones.add(miniDrone);
    }

    // Inclinar o grupo inteiro para a órbita não ser "plana"
    grupoMiniDrones.rotation.x = 0.4;
    grupoMiniDrones.rotation.z = 0.2;
    drone.add(grupoMiniDrones);

    // 3. O FEIXE DE LASER ANIMADO (Núcleo + Aura + Partículas)
    const alturaLaser = 70;

    // ⚙️ PARÂMETROS DE ESTILO (ALTERA AQUI)
    const corLaser = 0x00ffff;      // Cor principal do neon
    const espessuraNucleo = 0.05;   // Grossura do centro branco
    const espessuraAura = 0.55;     // Grossura do brilho colorido
    const qtdParticulas = 200;     // Quantidade de faíscas no feixe
    
    // 3.1 NÚCLEO (Core) - Parte central branca ofuscante
    const matNucleoLaser = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const geoNucleoLaser = new THREE.CylinderGeometry(espessuraNucleo, espessuraNucleo, alturaLaser, 8);
    geoNucleoLaser.translate(0, -alturaLaser / 2, 0); 
    const nucleoLaser = new THREE.Mesh(geoNucleoLaser, matNucleoLaser);
    drone.add(nucleoLaser);

    // 3.2 AURA (Glow) - Brilho colorido transparente
    const matAura = new THREE.MeshBasicMaterial({
        color: corLaser,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const geoAura = new THREE.CylinderGeometry(espessuraAura, espessuraAura, alturaLaser, 16);
    geoAura.translate(0, -alturaLaser / 2, 0);
    const aura = new THREE.Mesh(geoAura, matAura);
    drone.add(aura);

    // 3.3 PARTÍCULAS (Fluxo de Energia) - Faíscas a correr pelo laser
    const geoParticulas = new THREE.BufferGeometry();
    const posParticulas = new Float32Array(qtdParticulas * 3);
    const velsParticulas = []; 

    for (let i = 0; i < qtdParticulas; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const raioDist = espessuraAura + (Math.random() * 0.4); 
        
        posParticulas[i * 3] = Math.cos(angulo) * raioDist;
        posParticulas[i * 3 + 1] = -(Math.random() * alturaLaser);
        posParticulas[i * 3 + 2] = Math.sin(angulo) * raioDist;
        velsParticulas.push(0.3 + Math.random() * 0.7); 
    }

    geoParticulas.setAttribute('position', new THREE.BufferAttribute(posParticulas, 3));
    const matParticulas = new THREE.PointsMaterial({
        color: corLaser,
        size: 0.2,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particulas = new THREE.Points(geoParticulas, matParticulas);
    particulas.userData = {
        velocidades: velsParticulas,
        alturaLimite: alturaLaser
    };
    drone.add(particulas);

    // 4. Luz de impacto no chão
    const luzImpacto = new THREE.PointLight(0x00ffff, 50, 15, 2);
    luzImpacto.position.y = -posicao.y + 1; 
    drone.add(luzImpacto);

    drone.position.copy(posicao);

    // Configurar para animação
    drone.userData.tipo = 'drone';
    drone.userData.miniDrones = grupoMiniDrones;
    drone.userData.aura = aura;
    drone.userData.particulas = particulas;
    blocosOrbitais.push(drone);

    return drone;
}