import * as THREE from 'three';

var _desertoState = null;

export function adicionarObjetosDeserto(grupo, ARENA, loader, mapa) {
    _desertoState = null;
    
    // --- Paredes de Falesia ---
    construirFalesiaDeserto(grupo, ARENA);

    // --- Dunas ---
    construirDunas(grupo, ARENA, loader, mapa);

    // --- Monolitos ---
    construirMonolitos(grupo, ARENA);

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