import * as THREE from 'three';

// Estado interno das partículas de areia do deserto (atualizado no loop).
var _desertoState = null;

// Estado interno das folhas/poeira da jungle (atualizado no loop).
var _jungleState = null;

// Estado interno das partículas de neve (atualizado no loop).
var _neveState = null;

// Chamado todos os frames pelo main.js.
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

// Folhas caindo em espiral lenta.
export function atualizarJungle(delta) {
    if (!_jungleState) return;
    _jungleState.tempo += delta;
    var pos = _jungleState.positions;
    var count = _jungleState.count;
    var tempo = _jungleState.tempo;
    var lim = _jungleState.limite;
    for (var i = 0; i < count; i++) {
        var idx = i * 3;
        pos[idx + 1] -= 0.3 * delta;
        pos[idx]     += Math.sin(tempo + i) * 0.1 * delta;
        if (pos[idx + 1] < 0) {
            pos[idx]     = (Math.random() - 0.5) * 2 * lim;
            pos[idx + 1] = 6 + Math.random() * 2;
            pos[idx + 2] = (Math.random() - 0.5) * 2 * lim;
        }
    }
    _jungleState.geometry.attributes.position.needsUpdate = true;
}

// Neve caindo (mapa de gelo).
export function atualizarNeve(delta) {
    if (!_neveState) return;
    var pos = _neveState.positions;
    var count = _neveState.count;
    var lim = _neveState.limite;
    for (var i = 0; i < count; i++) {
        var idx = i * 3;
        pos[idx + 1] -= 2.0 * delta;
        pos[idx]     += Math.sin(_neveState.tempo * 2 + i) * 0.5 * delta;
        if (pos[idx + 1] < 0) {
            pos[idx]     = (Math.random() - 0.5) * 2 * lim;
            pos[idx + 1] = 10 + Math.random() * 5;
            pos[idx + 2] = (Math.random() - 0.5) * 2 * lim;
        }
    }
    _neveState.tempo += delta;
    _neveState.geometry.attributes.position.needsUpdate = true;
}

export function criarArena(cena, ARENA, mapa) {
    var grupo = new THREE.Group();
    var loader = new THREE.TextureLoader();
    var ehDeserto = (mapa.id === 'deserto');
    var ehJungle  = (mapa.id === 'jungle');
    var ehGelo    = (mapa.id === 'gelo');

    _desertoState = null;
    _jungleState = null;
    _neveState = null;

    // --- Chão ---
    var geoChao = ehJungle
        ? new THREE.PlaneGeometry(ARENA, ARENA, 20, 20)
        : new THREE.PlaneGeometry(ARENA, ARENA);
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
            // Chão de gelo: apenas o normal map dá relevo sutil.
            // Sem diffuse (evita o visual cinzento/lamacento). Cor pura polida.
            normalMap: ehGelo ? texNormal : undefined,
            map: ehGelo ? null : texDiff,
            roughnessMap: ehGelo ? null : texRough,
            color: ehGelo ? 0x9bc4d8 : 0xffffff, // azul-acinzentado gelo polido
            roughness: ehGelo ? 0.25 : 1.0,
            metalness: ehGelo ? 0.15 : 0.0,
        });
    } else {
        matChao = new THREE.MeshStandardMaterial({
            color: mapa.corChao,
            roughness: 0.9,
            metalness: 0.2
        });
    }

    // Deformação do chão no jungle.
    if (ehJungle) {
        var posChao = geoChao.attributes.position;
        for (var iv = 0; iv < posChao.count; iv++) {
            var zLocal = posChao.getZ(iv);
            posChao.setZ(iv, zLocal + (Math.random() * 0.3 - 0.15));
        }
        posChao.needsUpdate = true;
        geoChao.computeVertexNormals();
    }

    var chao = new THREE.Mesh(geoChao, matChao);
    chao.rotation.x = -Math.PI / 2;
    chao.receiveShadow = true;
    grupo.add(chao);

    // --- Grid neon ---
    if (mapa.mostrarGrid) {
        var grid = new THREE.GridHelper(ARENA, ARENA / 2, mapa.corGrid1, mapa.corGrid2);
        grid.position.y = 0.02;
        grupo.add(grid);
    }

    // --- Paredes ---
    if (ehDeserto) {
        construirFalesiaDeserto(grupo, ARENA);
    } else if (ehJungle) {
        construirParedesJungle(grupo, ARENA);
    } else if (ehGelo) {
        construirParedesGelo(grupo, ARENA, loader);
    } else {
        construirParedesPadrao(grupo, ARENA, mapa);
    }

    // --- Estrelas ---
    if (mapa.mostrarStars) {
        construirEstrelas(grupo);
    }

    // --- Ambiente deserto ---
    if (ehDeserto) {
        construirDunas(grupo, ARENA, loader, mapa);
        construirMonolitos(grupo, ARENA);
        construirCeuDeserto(grupo);
        construirParticulasAreia(grupo, ARENA);
        grupo.add(new THREE.HemisphereLight(0x87CEEB, 0x8B5E3C, 0.3));
    }

    // --- Ambiente jungle ---
    if (ehJungle) {
        construirArvoresJungle(grupo, ARENA);
        construirRochasJungle(grupo, ARENA);
        construirLianasJungle(grupo, ARENA);
        construirParticulasJungle(grupo, ARENA);
        construirLuzesJungle(grupo);
    }

    // --- Ambiente gelo — ártico noturno glacial ---
    if (ehGelo) {
        construirCristaisGelo(grupo, ARENA);
        construirCeuGelo(grupo);
        construirParticulasNeve(grupo, ARENA);
        // Fill azul frio de baixo — simula reflexo da superfície gelada
        var fillAzul = new THREE.PointLight(0x4499cc, 1.8, 55);
        fillAzul.position.set(15, 2, 15);
        grupo.add(fillAzul);
        // Rim light ciano de trás — recorta os cristais contra o fundo escuro
        var rimCiano = new THREE.PointLight(0x00ccff, 1.2, 45);
        rimCiano.position.set(-10, 6, -15);
        grupo.add(rimCiano);
        // Luz aurora no topo — coloriza levemente a cena
        var aurora = new THREE.HemisphereLight(0x003355, 0x002233, 0.6);
        grupo.add(aurora);
    }

    cena.add(grupo);
    return grupo;
}

// ---------------------------------------------------------------
// Paredes padrão
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
// Dunas de areia
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

// ---------------------------------------------------------------
// Céu do deserto
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Paredes de vegetação densa (jungle)
// ---------------------------------------------------------------
function construirParedesJungle(grupo, ARENA) {
    var metade = ARENA / 2;

    var matEscuro = new THREE.MeshStandardMaterial({ color: 0x0d2206, roughness: 0.95, metalness: 0.0 });
    var matBase   = new THREE.MeshStandardMaterial({ color: 0x1a3d0a, roughness: 0.95, metalness: 0.0 });
    var matMedio  = new THREE.MeshStandardMaterial({ color: 0x2d5a1b, roughness: 0.95, metalness: 0.0 });
    var materiais = [matBase, matBase, matMedio, matEscuro];
    var matNeon   = new THREE.LineBasicMaterial({ color: 0x4a8a2a });

    var lados = [
        { axis: 'x', sign:  1 },
        { axis: 'x', sign: -1 },
        { axis: 'z', sign:  1 },
        { axis: 'z', sign: -1 }
    ];

    for (var L = 0; L < lados.length; L++) {
        var lado = lados[L];
        var cursor = -metade;
        var fim    =  metade;
        while (cursor < fim) {
            var largura = 1.2 + Math.random() * 1.6;
            var altura  = Math.random() < 0.25
                ? 10 + Math.random() * 4
                : 6  + Math.random() * 4;
            var espessura = 0.9 + Math.random() * 0.8;
            var offPerp   = (Math.random() - 0.5);

            var geo = new THREE.BoxGeometry(
                lado.axis === 'x' ? largura   : espessura,
                altura,
                lado.axis === 'x' ? espessura : largura
            );
            var mat = materiais[Math.floor(Math.random() * materiais.length)];
            var bloco = new THREE.Mesh(geo, mat);

            var centroParal = cursor + largura / 2;
            if (lado.axis === 'x') {
                bloco.position.set(centroParal, altura / 2, lado.sign * metade + offPerp);
            } else {
                bloco.position.set(lado.sign * metade + offPerp, altura / 2, centroParal);
            }
            bloco.rotation.y = (Math.random() - 0.5) * 0.15;
            bloco.castShadow = true;
            bloco.receiveShadow = true;
            grupo.add(bloco);

            if (Math.random() < 0.2) {
                var edges = new THREE.EdgesGeometry(geo);
                var outline = new THREE.LineSegments(edges, matNeon);
                outline.position.copy(bloco.position);
                outline.rotation.copy(bloco.rotation);
                grupo.add(outline);
            }

            cursor += largura * 0.75;
        }
    }
}

// ---------------------------------------------------------------
// Árvores estilizadas (jungle)
// ---------------------------------------------------------------
function construirArvoresJungle(grupo, ARENA) {
    var metade = ARENA / 2;
    var num = 12;
    var raioSeguro = 10;
    var zonaBorda  = metade - 1.5;

    var matTronco = new THREE.MeshStandardMaterial({ color: 0x3d2008, roughness: 0.9, metalness: 0.0 });
    var matCopa   = new THREE.MeshStandardMaterial({ color: 0x1a4a0a, roughness: 0.85, metalness: 0.0 });

    for (var i = 0; i < num; i++) {
        var tentativa = 0;
        var x, z;
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
            tentativa++;
        } while (Math.sqrt(x * x + z * z) < raioSeguro && tentativa < 25);

        var alturaTronco = 4 + Math.random() * 3;
        var raioTopo     = 0.3;
        var raioBase     = 0.5;
        var arvore = new THREE.Group();

        var geoT = new THREE.CylinderGeometry(raioTopo, raioBase, alturaTronco, 8);
        var tronco = new THREE.Mesh(geoT, matTronco);
        tronco.position.y = alturaTronco / 2;
        tronco.castShadow = true;
        tronco.receiveShadow = true;
        arvore.add(tronco);

        var numCopas = 2 + Math.floor(Math.random() * 2);
        for (var c = 0; c < numCopas; c++) {
            var raioCopa = 1.5 + Math.random();
            var geoC = new THREE.SphereGeometry(raioCopa, 8, 6);
            var copa = new THREE.Mesh(geoC, matCopa);
            copa.position.set(
                (Math.random() - 0.5) * 0.8,
                alturaTronco + c * 0.9 + (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.8
            );
            copa.scale.y = 0.7;
            copa.castShadow = true;
            arvore.add(copa);
        }

        arvore.position.set(x, 0, z);
        arvore.rotation.y = Math.random() * Math.PI * 2;
        grupo.add(arvore);
    }
}

// ---------------------------------------------------------------
// Rochas musgosas (jungle)
// ---------------------------------------------------------------
function construirRochasJungle(grupo, ARENA) {
    var metade = ARENA / 2;
    var num = 10;
    var raioSeguro = 10;
    var zonaBorda  = metade - 1.2;

    var matRocha = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.95, metalness: 0.0 });

    for (var i = 0; i < num; i++) {
        var tentativa = 0;
        var x, z;
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
            tentativa++;
        } while (Math.sqrt(x * x + z * z) < raioSeguro && tentativa < 25);

        var quantas = 1 + Math.floor(Math.random() * 3);
        for (var r = 0; r < quantas; r++) {
            var raio = 0.4 + Math.random() * 0.8;
            var geo = new THREE.SphereGeometry(raio, 6, 5);
            var rocha = new THREE.Mesh(geo, matRocha);
            rocha.scale.set(
                0.8 + Math.random() * 0.6,
                0.5 + Math.random() * 0.5,
                0.7 + Math.random() * 0.5
            );
            rocha.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            rocha.position.set(
                x + (Math.random() - 0.5) * 1.5,
                raio * 0.4,
                z + (Math.random() - 0.5) * 1.5
            );
            rocha.castShadow = true;
            rocha.receiveShadow = true;
            grupo.add(rocha);
        }
    }
}

// ---------------------------------------------------------------
// Lianas / raízes suspensas (jungle)
// ---------------------------------------------------------------
function construirLianasJungle(grupo, ARENA) {
    var metade = ARENA / 2;
    var num = 22;
    var matVerde    = new THREE.MeshStandardMaterial({ color: 0x0d2a08, roughness: 0.9, metalness: 0.0 });
    var matCastanho = new THREE.MeshStandardMaterial({ color: 0x2d1505, roughness: 0.9, metalness: 0.0 });

    for (var i = 0; i < num; i++) {
        var lado = Math.floor(Math.random() * 4);
        var paral = (Math.random() - 0.5) * (ARENA - 3);
        var altura = 2 + Math.random() * 4;
        var raioTopo = 0.05 + Math.random() * 0.03;
        var raioBase = 0.08 + Math.random() * 0.04;

        var geo = new THREE.CylinderGeometry(raioTopo, raioBase, altura, 5);
        var mat = Math.random() < 0.7 ? matVerde : matCastanho;
        var liana = new THREE.Mesh(geo, mat);

        var topoParede = 8;
        var y = topoParede - altura / 2;

        if (lado === 0)      liana.position.set(paral, y,  metade - 0.3);
        else if (lado === 1) liana.position.set(paral, y, -metade + 0.3);
        else if (lado === 2) liana.position.set( metade - 0.3, y, paral);
        else                 liana.position.set(-metade + 0.3, y, paral);

        liana.rotation.z = (Math.random() - 0.5) * 0.4;
        liana.rotation.x = (Math.random() - 0.5) * 0.2;
        grupo.add(liana);
    }
}

// ---------------------------------------------------------------
// Partículas — folhas / poeira da floresta (jungle)
// ---------------------------------------------------------------
function construirParticulasJungle(grupo, ARENA) {
    var num = 250;
    var lim = ARENA / 2 - 2;

    var positions = new Float32Array(num * 3);
    for (var i = 0; i < num; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 2 * lim;
        positions[i * 3 + 1] = 0.5 + Math.random() * 7.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * lim;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    var mat = new THREE.PointsMaterial({
        color: 0x4a8a2a,
        size: 0.12,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        sizeAttenuation: true
    });
    var pontos = new THREE.Points(geo, mat);
    grupo.add(pontos);

    _jungleState = {
        positions: positions,
        count: num,
        geometry: geo,
        limite: lim,
        tempo: 0
    };
}

// ---------------------------------------------------------------
// Luzes extras da jungle
// ---------------------------------------------------------------
function construirLuzesJungle(grupo) {
    var pontoCentro = new THREE.PointLight(0x33ff66, 0.4, 25, 2);
    pontoCentro.position.set(0, 3, 0);
    grupo.add(pontoCentro);

    var raio = new THREE.SpotLight(0x88ff44, 0.8, 60, 0.3, 0.8, 1);
    raio.position.set(0, 40, 0);
    raio.target.position.set(0, 0, 0);
    grupo.add(raio);
    grupo.add(raio.target);
}

// ---------------------------------------------------------------
// Paredes de gelo — blocos limpos sem textura, estilo ice wall
// ---------------------------------------------------------------
function construirParedesGelo(grupo, ARENA, loader) {
    var altura = 6;
    var esp = 0.7;
    var met = ARENA / 2;

    // Material: gelo prensado limpo — sem textura difusa
    var mat = new THREE.MeshStandardMaterial({
        color: 0xd0eaf8,       // azul gelo muito pálido
        emissive: 0x0a2a44,    // emissive azul noite subtil
        emissiveIntensity: 0.18,
        roughness: 0.35,
        metalness: 0.08
    });

    var paredes = [
        { pos: [0, altura/2,  met],  rot: [0, 0, 0],         tam: [ARENA + esp*2, altura, esp] },
        { pos: [0, altura/2, -met],  rot: [0, 0, 0],         tam: [ARENA + esp*2, altura, esp] },
        { pos: [ met, altura/2, 0],  rot: [0, Math.PI/2, 0], tam: [ARENA + esp*2, altura, esp] },
        { pos: [-met, altura/2, 0],  rot: [0, Math.PI/2, 0], tam: [ARENA + esp*2, altura, esp] }
    ];

    for (var i = 0; i < paredes.length; i++) {
        var s = paredes[i];
        var geo = new THREE.BoxGeometry(s.tam[0], s.tam[1], s.tam[2]);
        var parede = new THREE.Mesh(geo, mat);
        parede.position.set(s.pos[0], s.pos[1], s.pos[2]);
        parede.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
        parede.receiveShadow = true;
        parede.castShadow = true;
        grupo.add(parede);

        // Linha de contorno ciano brilhante no topo da parede
        var tamTopo = [s.tam[0], 0.06, s.tam[2]];
        var geoTopo = new THREE.BoxGeometry(tamTopo[0], tamTopo[1], tamTopo[2]);
        var matTopo = new THREE.MeshStandardMaterial({
            color: 0x66ddff,
            emissive: 0x00aaff,
            emissiveIntensity: 1.2,
            roughness: 0.1
        });
        var topo = new THREE.Mesh(geoTopo, matTopo);
        topo.position.set(s.pos[0], altura + 0.03, s.pos[2]);
        topo.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
        grupo.add(topo);
    }
}

// ---------------------------------------------------------------
// Cristais de gelo — facetados metálicos sem textura, captam luz
// ---------------------------------------------------------------
function construirCristaisGelo(grupo, ARENA) {
    var metade = ARENA / 2;
    var numClusters = 20;
    var raioSeguro = 11;
    var zonaBorda = metade - 1.5;

    // Material espelho de gelo — alta metalness, baixa roughness = reflexões nítidas
    var matCristal = new THREE.MeshStandardMaterial({
        color: 0xbbddff,
        emissive: 0x003366,
        emissiveIntensity: 0.5,
        roughness: 0.05,
        metalness: 0.85
    });
    // Cristais médios — ligeiramente mate para variedade
    var matCristalMedio = new THREE.MeshStandardMaterial({
        color: 0x88ccee,
        emissive: 0x002255,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.6
    });

    for (var i = 0; i < numClusters; i++) {
        var tentativa = 0;
        var x, z;
        do {
            x = (Math.random() - 0.5) * 2 * zonaBorda;
            z = (Math.random() - 0.5) * 2 * zonaBorda;
            tentativa++;
        } while (Math.sqrt(x * x + z * z) < raioSeguro && tentativa < 20);

        var cluster = new THREE.Group();
        var numPontas = 2 + Math.floor(Math.random() * 4); // 2 a 5 por cluster

        for (var p = 0; p < numPontas; p++) {
            var raio = 0.15 + Math.random() * 0.35;
            var alturaC = 0.8 + Math.random() * 3.5;
            var lados = 4 + Math.floor(Math.random() * 3); // 4, 5 ou 6 lados
            var geo = new THREE.ConeGeometry(raio, alturaC, lados);
            var mat = (Math.random() < 0.6) ? matCristal : matCristalMedio;
            var espinho = new THREE.Mesh(geo, mat);

            // Inclinação leve — cristais não são todos verticais
            espinho.position.set(
                (Math.random() - 0.5) * 1.5,
                alturaC / 2,
                (Math.random() - 0.5) * 1.5
            );
            espinho.rotation.x = (Math.random() - 0.5) * 0.5;
            espinho.rotation.z = (Math.random() - 0.5) * 0.5;
            espinho.rotation.y = Math.random() * Math.PI * 2;
            espinho.castShadow = true;
            espinho.receiveShadow = true;
            cluster.add(espinho);
        }

        cluster.position.set(x, 0, z);
        grupo.add(cluster);
    }
}

// ---------------------------------------------------------------
// Céu glacial noturno com aurora borealis subtil
// ---------------------------------------------------------------
function construirCeuGelo(grupo) {
    var geo = new THREE.SphereGeometry(150, 32, 24);

    // Gradiente: azul marinho profundo no topo → teal escuro no horizonte
    var corTopo = new THREE.Color(0x020610); // quase preto com hint de azul
    var corMeio = new THREE.Color(0x041628);
    var corBase = new THREE.Color(0x041628); // coincide com o fog

    var posAttr = geo.attributes.position;
    var cores = new Float32Array(posAttr.count * 3);
    var minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < posAttr.count; i++) {
        var y = posAttr.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    for (var j = 0; j < posAttr.count; j++) {
        var yv = posAttr.getY(j);
        var t = Math.max(0, (yv - minY) / (maxY - minY));
        var cor = new THREE.Color().lerpColors(corBase, corTopo, t);
        // Aurora: faixa teal no meio do céu
        var auroraMask = Math.exp(-Math.pow((t - 0.4) / 0.18, 2));
        cor.r += 0.0  * auroraMask;
        cor.g += 0.04 * auroraMask;
        cor.b += 0.06 * auroraMask;
        cores[j * 3]     = cor.r;
        cores[j * 3 + 1] = cor.g;
        cores[j * 3 + 2] = cor.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));

    var mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false,
        depthWrite: false
    });
    grupo.add(new THREE.Mesh(geo, mat));
}

// ---------------------------------------------------------------
// Neve — 900 pontos minúsculos brancos a cair suavemente
// ---------------------------------------------------------------
function construirParticulasNeve(grupo, ARENA) {
    var num = 1200;
    var lim = ARENA / 2;

    var positions = new Float32Array(num * 3);
    for (var i = 0; i < num; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 2 * lim;
        positions[i * 3 + 1] = Math.random() * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * lim;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    var mat = new THREE.PointsMaterial({
        color: 0xddeeff,
        size: 0.04,           // pequenos pontos — flocos delicados
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        sizeAttenuation: true
    });

    var pontos = new THREE.Points(geo, mat);
    grupo.add(pontos);

    _neveState = {
        positions: positions,
        count: num,
        geometry: geo,
        limite: lim,
        tempo: 0
    };
}
