import * as THREE from 'three';

// Estado interno das partículas de areia do deserto (atualizado no loop).
var _desertoState = null;

// Chamado todos os frames pelo main.js. Quando o mapa não é deserto, _desertoState é null e a função sai cedo.
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
}

export function criarArena(cena, ARENA, mapa) {
    var grupo = new THREE.Group();
    var loader = new THREE.TextureLoader();
    var ehDeserto = (mapa.id === 'deserto');

    _desertoState = null;

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
    chao.receiveShadow = true;
    grupo.add(chao);

    // --- Grid neon (apenas em mapas que o pedem) ---
    if (mapa.mostrarGrid) {
        var grid = new THREE.GridHelper(ARENA, ARENA / 2, mapa.corGrid1, mapa.corGrid2);
        grid.position.y = 0.02;
        grupo.add(grid);
    }

    // --- Paredes ---
    if (ehDeserto) {
        construirFalesiaDeserto(grupo, ARENA);
    } else {
        construirParedesPadrao(grupo, ARENA, mapa);
    }

    // --- Estrelas (mapas espaciais) ---
    if (mapa.mostrarStars) {
        construirEstrelas(grupo);
    }

    // --- Ambiente exclusivo do deserto ---
    if (ehDeserto) {
        construirDunas(grupo, ARENA, loader, mapa);
        construirMonolitos(grupo, ARENA);
        construirCeuDeserto(grupo);
        construirParticulasAreia(grupo, ARENA);
        grupo.add(new THREE.HemisphereLight(0x87CEEB, 0x8B5E3C, 0.3));
    }

    cena.add(grupo);
    return grupo;
}

// ---------------------------------------------------------------
// Paredes padrão (mapas que não são deserto)
// ---------------------------------------------------------------
function construirParedesPadrao(grupo, ARENA, mapa) {
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
}

// ---------------------------------------------------------------
// Falésias de arenito (paredes do deserto)
// ---------------------------------------------------------------
function construirFalesiaDeserto(grupo, ARENA) {
    var metade = ARENA / 2;
    var altura = 9;
    var layers = 4;
    var layerAltura = altura / layers;
    var espessuraBase = 1.2;

    var matA = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.95, metalness: 0.0 });
    var matB = new THREE.MeshStandardMaterial({ color: 0xA0714A, roughness: 0.95, metalness: 0.0 });

    // 4 lados: cada um sabe o seu eixo principal ('x' = paralelo a X; 'z' = paralelo a Z) e o sinal do deslocamento.
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

// ---------------------------------------------------------------
// Dunas de areia (dentro da arena, evitando zona central de jogo)
// ---------------------------------------------------------------
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

        var escalaXZ = 2.0 + Math.random() * 2.0;         // raio horizontal 2..4
        var altura   = 0.4 + Math.random() * 0.8;         // altura 0.4..1.2

        var geo  = new THREE.SphereGeometry(1, 20, 12);
        var duna = new THREE.Mesh(geo, matDuna);
        duna.scale.set(escalaXZ, altura, escalaXZ);
        duna.position.set(x, 0, z);
        duna.rotation.y = Math.random() * Math.PI;
        duna.castShadow = true;
        duna.receiveShadow = true;
        grupo.add(duna);
    }
}

// ---------------------------------------------------------------
// Monólitos de pedra (bordas da arena)
// ---------------------------------------------------------------
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

        var segmentos = 2 + Math.floor(Math.random() * 2);  // 2 ou 3
        var yAtual = 0;
        var grupoMono = new THREE.Group();

        var alturaAlvo = 3 + Math.random() * 4;            // 3..7 totais
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
            seg.rotation.y = (Math.random() - 0.5) * 0.35;  // ±10°
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

// ---------------------------------------------------------------
// Céu do deserto: skydome com gradiente vertex-color
// ---------------------------------------------------------------
function construirCeuDeserto(grupo) {
    var geo = new THREE.SphereGeometry(150, 32, 24);
    var corTopo = new THREE.Color(0xFF7043);
    var corBase = new THREE.Color(0xD2956C);   // combina com o fog para horizonte coerente

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

// ---------------------------------------------------------------
// Partículas de areia (vento)
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Estrelas (mapas espaciais)
// ---------------------------------------------------------------
function construirEstrelas(grupo) {
    var numStars = 1500;
    var posStars = new Float32Array(numStars * 3);
    for (var s = 0; s < numStars; s++) {
        var theta = Math.random() * 2 * Math.PI;
        var phi = Math.acos(2 * Math.random() - 1);
        var r = 80 + Math.random() * 120;
        posStars[s * 3]     = r * Math.sin(phi) * Math.cos(theta);
        posStars[s * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        posStars[s * 3 + 2] = r * Math.cos(phi);
    }
    var geoStars = new THREE.BufferGeometry();
    geoStars.setAttribute('position', new THREE.BufferAttribute(posStars, 3));
    var matStars = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    var stars = new THREE.Points(geoStars, matStars);
    grupo.add(stars);
}
