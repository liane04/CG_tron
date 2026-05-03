import * as THREE from 'three';

var _desertoState = null;
var torresComMatrix = [];
var gruposEspiral = []; // Novo para as espirais de luz

export function adicionarObjetosDeserto(grupo, ARENA, loader, mapa, loaderGLTF) {
    _desertoState = null;
    torresComMatrix = [];
    gruposEspiral = [];
    
    // --- Paredes de Falesia ---
    construirFalesiaDeserto(grupo, ARENA);

    // --- Árvores do Deserto (Modelos 3D) ---
    construirArvoresDeserto(grupo, ARENA, loaderGLTF);

    // --- Formações Rochosas ---
    const numRochedos = 7;
    for(let i = 0; i < numRochedos; i++) {
        let x, z;
        const raioSeguro = 10;
        const zonaBorda = (ARENA / 2) - 8;
        
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
        } while (Math.sqrt(x * x + z * z) < raioSeguro);

        grupo.add(criarFormacaoRochenta(new THREE.Vector3(x, 0, z), loader));
    }

    // --- Torres de Glifos ---
    let t1 = criarTorreGlifos(new THREE.Vector3(25, 0, -25), loader);
    let t2 = criarTorreGlifos(new THREE.Vector3(-25, 0, 25), loader);
    grupo.add(t1);
    grupo.add(t2);
    torresComMatrix.push(t1, t2);

    // --- Torres de Cristal (Octaedros Empilhados) ---
    grupo.add(criarTorreCristal(new THREE.Vector3(30, 0, 0), 3, 0xffff00, loader));
    grupo.add(criarTorreCristal(new THREE.Vector3(-30, 0, 0), 3, 0xffff00, loader));

    // --- Pirâmide Voxel (Fundo/Horizonte) ---
    // Aumentamos os níveis para 25 e diminuímos o tamanho do cubo para detalhe voxel fino
    const piramide = criarPiramideVoxel(new THREE.Vector3(0, -5, -130), 25, 0xffff00, loader);
    piramide.scale.set(3, 3, 3);
    grupo.add(piramide);

    // --- Ceu ---
    construirCeuDeserto(grupo);

    // --- Particulas ---
    construirParticulasAreia(grupo, ARENA);

    // --- Iluminação Extra ---
    grupo.add(new THREE.HemisphereLight(0x87CEEB, 0x8B5E3C, 0.3));
}

export function atualizarDeserto(delta) {
    if (!_desertoState) return;
    var pos  = _desertoState.positions;
    var velX = _desertoState.velX;
    var velZ = _desertoState.velZ;
    var lim  = _desertoState.limite;
    var count = _desertoState.count;
    for (var i = 0; i < count; i++) {
        var idx = i * 3;
        pos[idx]     += 0.5 * delta * velX[i];
        pos[idx + 2] += 0.2 * delta * velZ[i];
        if (pos[idx]     >  lim) pos[idx]     = -lim;
        if (pos[idx]     < -lim) pos[idx]     =  lim;
        if (pos[idx + 2] >  lim) pos[idx + 2] = -lim;
        if (pos[idx + 2] < -lim) pos[idx + 2] =  lim;
    }
    _desertoState.geometry.attributes.position.needsUpdate = true;

    // Atualizar pixels da matrix nas torres
    torresComMatrix.forEach(torre => {
        const pixels = torre.userData.pixels;
        if (pixels) {
            pixels.children.forEach(p => {
                p.position.y -= p.userData.velocidade * delta;
                if (p.position.y < 0) p.position.y = 12;
            });
        }
    });

    // Animar espirais de luz (rodar o grupo e flutuar cada pilar)
    var tempo = Date.now() * 0.002;
    gruposEspiral.forEach(espiral => {
        espiral.rotation.y += 0.01; // Velocidade de rotação da espiral
        espiral.children.forEach((pilar, i) => {
            pilar.position.y += Math.sin(tempo + i) * 0.005;
        });
    });
}

function construirFalesiaDeserto(grupo, ARENA) {
    var metade = ARENA / 2;
    var altura = 9;
    var layers = 4;
    var layerAltura = altura / layers;
    var espessuraBase = 1.2;

    var matA = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.95, metalness: 0.0 });
    var matB = new THREE.MeshStandardMaterial({ color: 0xA0714A, roughness: 0.95, metalness: 0.0 });

    var lados = [
        { axis: 'x', sign:  1 },
        { axis: 'x', sign: -1 },
        { axis: 'z', sign:  1 },
        { axis: 'z', sign: -1 }
    ];

    for (var L = 0; L < lados.length; L++) {
        var lado = lados[L];
        for (var n = 0; n < layers; n++) {
            var offParal = (Math.random() - 0.5) * 0.6;
            var offPerp  = (Math.random() - 0.5) * 0.6;
            var comprimento = ARENA + 1.0 + Math.random() * 0.8;
            var espessura   = espessuraBase + Math.random() * 0.4;
            var alturaCamada = layerAltura + (Math.random() - 0.5) * 0.15;

            var mat = (n % 2 === 0) ? matA : matB;
            var geo = new THREE.BoxGeometry(
                lado.axis === 'x' ? comprimento : espessura,
                alturaCamada,
                lado.axis === 'x' ? espessura   : comprimento
            );
            var bloco = new THREE.Mesh(geo, mat);
            var y = n * layerAltura + alturaCamada / 2;

            if (lado.axis === 'x') {
                bloco.position.set(offParal, y, lado.sign * metade + offPerp);
            } else {
                bloco.position.set(lado.sign * metade + offPerp, y, offParal);
            }
            bloco.castShadow = true;
            bloco.receiveShadow = true;
            grupo.add(bloco);
        }
    }
}

function construirDunas(grupo, ARENA, loader, mapa) {
    var metade = ARENA / 2;
    var numDunas = 10;
    var matDuna;

    if (mapa.texturas) {
        var tex = loader.load(mapa.texturas.diffuse);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        matDuna = new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0 });
    } else {
        matDuna = new THREE.MeshStandardMaterial({ color: 0xC2956C, roughness: 1.0 });
    }

    var raioSeguro = 12;
    var zonaBorda  = metade - 2;

    for (var i = 0; i < numDunas; i++) {
        var tentativa = 0;
        var x, z;
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
            tentativa++;
        } while (Math.sqrt(x * x + z * z) < raioSeguro && tentativa < 20);

        var escalaXZ = 2.0 + Math.random() * 2.0;
        var altar   = 0.4 + Math.random() * 0.8;
        var geo  = new THREE.SphereGeometry(1, 20, 12);
        var duna = new THREE.Mesh(geo, matDuna);
        duna.scale.set(escalaXZ, altar, escalaXZ);
        duna.position.set(x, 0, z);
        duna.rotation.y = Math.random() * Math.PI;
        duna.castShadow = true;
        duna.receiveShadow = true;
        grupo.add(duna);
    }
}

function construirMonolitos(grupo, ARENA) {
    var metade = ARENA / 2;
    var numMono = 5;
    var raioMin = 12;
    var raioMax = metade - 3;

    var matMono = new THREE.MeshStandardMaterial({ color: 0x7A5230, roughness: 0.9, metalness: 0.0 });

    for (var i = 0; i < numMono; i++) {
        var theta = Math.random() * Math.PI * 2;
        var raio  = raioMin + Math.random() * (raioMax - raioMin);
        var cx = Math.cos(theta) * raio;
        var cz = Math.sin(theta) * raio;

        var segmentos = 2 + Math.floor(Math.random() * 2);
        var yAtual = 0;
        var grupoMono = new THREE.Group();
        var alturaAlvo = 3 + Math.random() * 4;
        var hSeg = alturaAlvo / segmentos;

        for (var s = 0; s < segmentos; s++) {
            var hEste = hSeg * (0.85 + Math.random() * 0.3);
            var wSeg  = 0.8 + Math.random() * 0.7;
            var dSeg  = 0.8 + Math.random() * 0.7;
            var geo;
            if (Math.random() < 0.5) {
                geo = new THREE.BoxGeometry(wSeg, hEste, dSeg);
            } else {
                geo = new THREE.CylinderGeometry(wSeg * 0.5, wSeg * 0.6, hEste, 6);
            }
            var seg = new THREE.Mesh(geo, matMono);
            seg.position.y = yAtual + hEste / 2;
            seg.rotation.y = (Math.random() - 0.5) * 0.35;
            seg.rotation.x = (Math.random() - 0.5) * 0.15;
            seg.rotation.z = (Math.random() - 0.5) * 0.15;
            seg.castShadow = true;
            seg.receiveShadow = true;
            grupoMono.add(seg);
            yAtual += hEste * 0.9;
        }

        grupoMono.position.set(cx, 0, cz);
        grupo.add(grupoMono);
    }
}

function construirCeuDeserto(grupo) {
    var geo = new THREE.SphereGeometry(150, 32, 24);
    var corTopo = new THREE.Color(0xFF7043);
    var corBase = new THREE.Color(0xD2956C);

    var posAttr = geo.attributes.position;
    var cores = new Float32Array(posAttr.count * 3);
    var minY =  Infinity, maxY = -Infinity;
    for (var i = 0; i < posAttr.count; i++) {
        var y = posAttr.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    for (var j = 0; j < posAttr.count; j++) {
        var yv = posAttr.getY(j);
        var t = (yv - minY) / (maxY - minY);
        cores[j * 3]     = corBase.r + (corTopo.r - corBase.r) * t;
        cores[j * 3 + 1] = corBase.g + (corTopo.g - corBase.g) * t;
        cores[j * 3 + 2] = corBase.b + (corTopo.b - corBase.b) * t;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));

    var mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false
    });
    var ceu = new THREE.Mesh(geo, mat);
    grupo.add(ceu);
}

function construirParticulasAreia(grupo, ARENA) {
    var num = 400;
    var lim = ARENA / 2 - 1;

    var positions = new Float32Array(num * 3);
    var velX      = new Float32Array(num);
    var velZ      = new Float32Array(num);
    for (var i = 0; i < num; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 2 * lim;
        positions[i * 3 + 1] = 0.1 + Math.random() * 2.9;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * lim;
        velX[i] = 0.7 + Math.random() * 0.6;
        velZ[i] = 0.7 + Math.random() * 0.6;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
        color: 0xC2956C,
        size: 0.08,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        sizeAttenuation: true
    });
    var pontos = new THREE.Points(geo, mat);
    grupo.add(pontos);

    _desertoState = {
        positions: positions,
        velX: velX,
        velZ: velZ,
        count: num,
        geometry: geo,
        limite: lim
    };
}

/**
 * Cria uma formação rochosa complexa usando primitivas básicas.
 * Usa as texturas de estalactites/cliff rock.
 */
function criarFormacaoRochenta(posicao, loader) {
    const grupo = new THREE.Group();
    
    // Caminho das texturas
    const path = './textures/areia/estalacritesPedra/Stylized_Cliff_Rock_002_';
    const texDiff = loader.load(path + 'basecolor.jpg');
    const texNormal = loader.load(path + 'normal.jpg');
    const texRough = loader.load(path + 'roughness.jpg');
    const texAO = loader.load(path + 'ambientOcclusion.jpg');

    [texDiff, texNormal, texRough, texAO].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 1.5);
    });

    const matPedra = new THREE.MeshStandardMaterial({
        map: texDiff,
        normalMap: texNormal,
        roughnessMap: texRough,
        aoMap: texAO,
        color: 0xA0714A, // Cor mais clara para condizer com as falesias/paredes
        roughness: 1.0,
        metalness: 0.0
    });

    // Criar uma formação irregular de 5 a 7 elementos
    const numElementos = 5 + Math.floor(Math.random() * 3);
    
    for(let i = 0; i < numElementos; i++) {
        const h = 4 + Math.random() * 10;
        const w = 1.2 + Math.random() * 1.5;
        const d = 1.2 + Math.random() * 1.5;
        
        let geo;
        // Alternar entre cubos e cilindros hexagonais para maior realismo "low poly"
        if (Math.random() < 0.6) {
            geo = new THREE.BoxGeometry(w, h, d);
        } else {
            geo = new THREE.CylinderGeometry(w * 0.5, w * 0.8, h, 6);
        }
        
        const pedra = new THREE.Mesh(geo, matPedra);
        
        // Posicionar agrupado mas com variação
        pedra.position.set(
            (Math.random() - 0.5) * 2.5,
            h / 2 - 0.1, // Ligeiramente abaixo do chão para evitar gaps
            (Math.random() - 0.5) * 2.5
        );
        
        // Inclinação aleatória para parecer erosão natural
        pedra.rotation.set(
            (Math.random() - 0.5) * 0.2,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.2
        );
        
        pedra.castShadow = true;
        pedra.receiveShadow = true;
        grupo.add(pedra);
    }

    grupo.position.copy(posicao);
    grupo.userData.isObstacle = true; // Marcar como obstáculo
    return grupo;
}

/**
 * Cria uma torre de pedra com hieróglifos e contornos neon.
 */
function criarTorreGlifos(posicao, loader) {
    const grupo = new THREE.Group();

    // Caminho das texturas de glifos
    const path = './textures/areia/hieloglifos/Wall_Stone_Hieroglyphs_001_';
    const texDiff = loader.load(path + 'basecolor.jpg');
    const texNormal = loader.load(path + 'normal.jpg');
    const texRough = loader.load(path + 'roughness.jpg');
    const texAO = loader.load(path + 'ambientOcclusion.jpg');

    [texDiff, texNormal, texRough, texAO].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 2); // Repetir na vertical
    });

    // 1. Material da Pedra
    const matPedra = new THREE.MeshStandardMaterial({
        map: texDiff,
        normalMap: texNormal,
        roughnessMap: texRough,
        aoMap: texAO,
        color: 0x443322,      // Pedra escura para destacar os glifos
        roughness: 0.8
    });

    // 2. O Bloco Principal (Corpo da Torre)
    const geoCorpo = new THREE.BoxGeometry(6, 12, 6);
    const corpo = new THREE.Mesh(geoCorpo, matPedra);
    corpo.position.y = 6;
    corpo.castShadow = true;
    corpo.receiveShadow = true;
    grupo.add(corpo);

    // 3. CONTORNOS NEON AMARELO
    const edges = new THREE.EdgesGeometry(geoCorpo);
    const matNeon = new THREE.LineBasicMaterial({ 
        color: 0xffff00, 
        transparent: true,
        opacity: 0.8
    });
    const contorno = new THREE.LineSegments(edges, matNeon);
    contorno.position.y = 6;
    grupo.add(contorno);

    // 4. Luzes que emanam dos Glifos (Múltiplos PointLights para brilho extra)
    const luzBase = new THREE.PointLight(0xffff00, 20, 15);
    luzBase.position.y = 2;
    grupo.add(luzBase);

    const luzTopo = new THREE.PointLight(0xffff00, 20, 15);
    luzTopo.position.y = 10;
    grupo.add(luzTopo);

    // 5. Núcleo Matrix (Dados do Deserto)
    const grupoPixels = new THREE.Group();
    const matAmarelo = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 2 });
    const matBranco = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
    
    for (let i = 0; i < 40; i++) {
        const mat = Math.random() > 0.5 ? matAmarelo : matBranco;
        const pixel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), mat);
        
        const face = Math.floor(Math.random() * 4);
        const dist = 3.05; // Ligeiramente fora das faces do cubo (6/2)
        
        if (face === 0) pixel.position.set((Math.random()-0.5)*5.8, Math.random()*12, dist);
        if (face === 1) pixel.position.set((Math.random()-0.5)*5.8, Math.random()*12, -dist);
        if (face === 2) pixel.position.set(dist, Math.random()*12, (Math.random()-0.5)*5.8);
        if (face === 3) pixel.position.set(-dist, Math.random()*12, (Math.random()-0.5)*5.8);
        
        pixel.userData.velocidade = 1.0 + Math.random() * 5.0;
        grupoPixels.add(pixel);
    }
    grupo.add(grupoPixels);
    grupo.userData.pixels = grupoPixels;

    grupo.position.copy(posicao);
    grupo.userData.isObstacle = true;
    return grupo;
}

/**
 * Cria uma escadaria em espiral de luz à volta da torre.
 */
function adicionarEspiralLuz(torre, numDegraus, corNeon, alturaTotal = 18) {
    const grupoEspiral = new THREE.Group();
    const raioEspiral = 4.5; 
    
    for (let i = 0; i < numDegraus; i++) {
        const angulo = (i / numDegraus) * Math.PI * 2; 
        // Agora o y espalha-se exatamente pela altura total da torre, do fundo ao topo
        const y = (i / (numDegraus - 1)) * alturaTotal;      
        
        const x = Math.cos(angulo) * raioEspiral;
        const z = Math.sin(angulo) * raioEspiral;
        
        const pilar = criarFragmentoLuz(new THREE.Vector3(x, y, z), corNeon);
        
        pilar.rotation.y = angulo;
        pilar.rotation.z = 0.2; 
        
        grupoEspiral.add(pilar);
    }
    
    torre.add(grupoEspiral);
    gruposEspiral.push(grupoEspiral);
}

/**
 * Cria um fragmento de luz flutuante (núcleo brilhante em cápsula de vidro).
 */
function criarFragmentoLuz(posicao, corNeon) {
    const grupo = new THREE.Group();

    // 1. Material de Vidro (Transparente e Refletor)
    const matVidro = new THREE.MeshStandardMaterial({
        color: corNeon,
        transparent: true,
        opacity: 0.3,       // Vidro muito leve
        metalness: 1.0,     // Para brilhar com a luz direcional
        roughness: 0.0,     // Superfície perfeitamente lisa
    });

    // 2. O Núcleo de Luz (O "filamento" interno)
    const matNucleo = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 10, // Muito brilhante
    });

    // Construção: Uma caixa de vidro com uma caixa fina brilhante lá dentro
    const vidro = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.4), matVidro);
    const nucleo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.8, 0.05), matNucleo);
    
    vidro.add(nucleo);
    grupo.add(vidro);

    // 3. Brilho Ambiente (PointLight pequena)
    const luz = new THREE.PointLight(corNeon, 5, 4);
    grupo.add(luz);

    grupo.position.copy(posicao);
    return grupo;
}

/**
 * Cria uma torre de "pirâmides duplas" (octaedros) empilhadas.
 */
function criarTorreCristal(posicao, numModulos, corNeon, loader) {
    const grupoTotal = new THREE.Group();
    const alturaModulo = 6; // Altura total de cada pirâmide dupla
    const raioModulo = 3;   // Largura da base central

    // Caminho da textura de glifos
    const path = './textures/areia/hieloglifos/Wall_Stone_Hieroglyphs_001_';
    const texGlifos = loader.load(path + 'basecolor.jpg');
    texGlifos.wrapS = texGlifos.wrapT = THREE.RepeatWrapping;

    const matPedra = new THREE.MeshStandardMaterial({
        map: texGlifos,
        normalMap: loader.load(path + 'normal.jpg'),
        color: 0x1a0d00, // Pedra escura para o neon brilhar
        roughness: 0.8,
        metalness: 0.2
    });

    const matNeon = new THREE.LineBasicMaterial({ color: corNeon });

    // 2. Loop de Empilhamento
    for (let i = 0; i < numModulos; i++) {
        const moduloGrupo = new THREE.Group();

        // Parte de Cima da Pirâmide (Cilindro de 4 lados com topo 0)
        const geoTopo = new THREE.CylinderGeometry(0, raioModulo, alturaModulo / 2, 4);
        const topo = new THREE.Mesh(geoTopo, matPedra);
        topo.position.y = alturaModulo / 4;
        moduloGrupo.add(topo);

        // Parte de Baixo da Pirâmide (Cilindro de 4 lados com base 0)
        const geoBase = new THREE.CylinderGeometry(raioModulo, 0, alturaModulo / 2, 4);
        const base = new THREE.Mesh(geoBase, matPedra);
        base.position.y = -alturaModulo / 4;
        moduloGrupo.add(base);

        // Adicionar Contornos Neon Amarelos
        [topo, base].forEach(parte => {
            const edges = new THREE.EdgesGeometry(parte.geometry);
            const contorno = new THREE.LineSegments(edges, matNeon);
            parte.add(contorno);
            parte.castShadow = true;
            parte.receiveShadow = true;
        });

        // Posicionar cada módulo em cima do anterior
        moduloGrupo.position.y = i * alturaModulo + (alturaModulo/2);
        grupoTotal.add(moduloGrupo);

        // Adicionar uma luz em cada módulo para brilho constante ao longo da torre
        const luzModulo = new THREE.PointLight(corNeon, 15, 12);
        luzModulo.position.y = moduloGrupo.position.y;
        grupoTotal.add(luzModulo);
    }

    // Luz de topo extra forte
    const luzTopo = new THREE.PointLight(corNeon, 40, 25);
    luzTopo.position.y = numModulos * alturaModulo;
    grupoTotal.add(luzTopo);

    // 6. Adicionar a Espiral de Luz aqui (ao redor das pirâmides empilhadas)
    adicionarEspiralLuz(grupoTotal, 10, corNeon, numModulos * alturaModulo);

    // Ajustar posição para flutuar no ar e escala global
    grupoTotal.position.copy(posicao);
    grupoTotal.position.y += 3; // Baixado de 8 para 3
    grupoTotal.scale.set(0.75, 0.75, 0.75); // Ligeiramente mais pequeno
    
    grupoTotal.userData.isObstacle = true;
    return grupoTotal;
}

/**
 * Constrói uma pirâmide estilo Voxel (cubos empilhados).
 * Usada como elemento de fundo massivo.
 */
function criarPiramideVoxel(posicao, niveis, corNeon, loader) {
    const grupo = new THREE.Group();
    const tamanhoCubo = 0.6; // Blocos mais pequenos para maior detalhe

    // 1. Carregar texturas de glifos com alta visibilidade
    const path = './textures/areia/hieloglifos/Wall_Stone_Hieroglyphs_001_';
    const texDiff = loader.load(path + 'basecolor.jpg');
    const texNormal = loader.load(path + 'normal.jpg');
    const texAO = loader.load(path + 'ambientOcclusion.jpg');
    const texRough = loader.load(path + 'roughness.jpg');

    [texDiff, texNormal, texAO, texRough].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 1);
    });

    // Material castanho clarinho com glifos bem visíveis
    const matCubo = new THREE.MeshStandardMaterial({
        map: texDiff,
        normalMap: texNormal,
        aoMap: texAO,
        roughnessMap: texRough,
        color: 0xD2B48C, // Castanho clarinho (Tan)
        metalness: 0.1,
        roughness: 0.8
    });

    // 2. Calcular número total de instâncias para InstancedMesh (oco, sem o topo)
    let totalInstancias = 0;
    for (let y = 0; y < niveis - 2; y++) {
        let L = niveis - 1 - y; // -1 para terminar em L=0 no topo
        totalInstancias += (y === 0) ? Math.pow(2 * L + 1, 2) : 8 * L;
    }

    const geo = new THREE.BoxGeometry(tamanhoCubo * 0.98, tamanhoCubo * 0.98, tamanhoCubo * 0.98);
    const geoEdges = new THREE.EdgesGeometry(geo);
    const meshInstanciada = new THREE.InstancedMesh(geo, matCubo, totalInstancias);
    meshInstanciada.castShadow = true;
    meshInstanciada.receiveShadow = true;

    const matTopNeon = new THREE.MeshStandardMaterial({
        color: corNeon,
        emissive: corNeon,
        emissiveIntensity: 2
    });
    const matContorno = new THREE.LineBasicMaterial({ color: corNeon, transparent: true, opacity: 0.8 });

    // 3. Posicionar as instâncias (apenas no contorno)
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let y = 0; y < niveis; y++) {
        let L = niveis - 1 - y;
        const isTop = (y >= niveis - 2); // Os últimos 2 níveis formam o "topo"

        for (let x = -L; x <= L; x++) {
            for (let z = -L; z <= L; z++) {
                // Se for o nível 0 (chão) ou se estiver na borda do quadrado
                const naBorda = Math.abs(x) === L || Math.abs(z) === L;
                const noChao = (y === 0);
                const isEdge = Math.abs(x) === L && Math.abs(z) === L; // Aresta diagonal da pirâmide

                if (naBorda || noChao) {
                    const posX = x * tamanhoCubo;
                    const posY = y * tamanhoCubo;
                    const posZ = z * tamanhoCubo;

                    if (isTop) {
                        // Cubos do topo com material neon
                        const topCube = new THREE.Mesh(geo, matTopNeon);
                        topCube.position.set(posX, posY, posZ);
                        topCube.castShadow = true;
                        topCube.receiveShadow = true;
                        grupo.add(topCube);

                        // Contorno neon em todos os blocos do topo para realce
                        const contorno = new THREE.LineSegments(geoEdges, matContorno);
                        topCube.add(contorno);
                    } else {
                        // Cubos normais do corpo da pirâmide
                        matrix.setPosition(posX, posY, posZ);
                        meshInstanciada.setMatrixAt(index++, matrix);

                        // Contorno neon nas arestas da pirâmide
                        if (isEdge) {
                            const contorno = new THREE.LineSegments(geoEdges, matContorno);
                            contorno.position.set(posX, posY, posZ);
                            grupo.add(contorno);
                        }
                    }
                }
            }
        }
    }
    
    grupo.add(meshInstanciada);

    grupo.position.copy(posicao);
    return grupo;
}

function construirArvoresDeserto(grupo, ARENA, loaderGLTF) {
    if (!loaderGLTF) return;

    const numArvores = 6;
    const raioSeguro = 10;
    const zonaBorda = (ARENA / 2) - 5;

    for (let i = 0; i < numArvores; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
        } while (Math.sqrt(x * x + z * z) < raioSeguro);

        loaderGLTF.load('./models/arvoreDeserto/quiver_tree_01_4k.gltf', function (gltf) {
            const arvore = gltf.scene;
            
            // Ajustar escala se necessário (modelos externos podem vir gigantes ou minúsculos)
            // Vou assumir uma escala base, mas se ficar estranho ajusto depois
            arvore.scale.set(3, 3, 3); 
            
            arvore.position.set(x, 0, z);
            arvore.rotation.y = Math.random() * Math.PI * 2;

            arvore.traverse(function (node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            grupo.add(arvore);
        });
    }
}