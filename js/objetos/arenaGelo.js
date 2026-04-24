import * as THREE from 'three';

var _neveState = null;

export function adicionarObjetosGelo(grupo, ARENA) {
    _neveState = null;
    
    // --- Paredes de Gelo ---
    construirPilaresGelo(grupo, ARENA);

    // --- Cristais ---
    construirCristaisGelo(grupo, ARENA);

    // --- Ceu ---
    construirCeuGelo(grupo);

    // --- Particulas (Neve) ---
    construirParticulasNeve(grupo, ARENA);

    // --- Iluminação Extra ---
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

export function atualizarGelo(delta) {
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

function construirPilaresGelo(grupo, ARENA) {
    var metade = ARENA / 2;

    var matGeloClaro = new THREE.MeshStandardMaterial({
        color: 0xddeeff,
        emissive: 0x082233,
        emissiveIntensity: 0.25,
        roughness: 0.15,
        metalness: 0.12
    });
    var matGeloMedio = new THREE.MeshStandardMaterial({
        color: 0x99ccee,
        emissive: 0x041522,
        emissiveIntensity: 0.18,
        roughness: 0.30,
        metalness: 0.08
    });
    var matGeloEscuro = new THREE.MeshStandardMaterial({
        color: 0x5588aa,
        emissive: 0x020d18,
        emissiveIntensity: 0.12,
        roughness: 0.50,
        metalness: 0.05
    });
    var matGeloOpaco = new THREE.MeshStandardMaterial({
        color: 0x2a4a66,
        emissive: 0x010810,
        emissiveIntensity: 0.08,
        roughness: 0.75,
        metalness: 0.02
    });
    var materiais = [matGeloClaro, matGeloClaro, matGeloMedio, matGeloEscuro, matGeloOpaco];
    var matNeonGelo = new THREE.LineBasicMaterial({ color: 0x44ccff });

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
            var largura   = 1.0 + Math.random() * 2.2;
            var altura    = Math.random() < 0.20
                ? 12 + Math.random() * 6
                : 5  + Math.random() * 5;
            var espessura = 1.0 + Math.random() * 1.8;
            var offPerp   = (Math.random() - 0.5) * 1.5;

            var mat = materiais[Math.floor(Math.random() * materiais.length)];
            var geo = new THREE.BoxGeometry(
                lado.axis === 'x' ? largura   : espessura,
                altura,
                lado.axis === 'x' ? espessura : largura
            );
            var bloco = new THREE.Mesh(geo, mat);

            var centro = cursor + largura / 2;
            if (lado.axis === 'x') {
                bloco.position.set(centro, altura / 2, lado.sign * metade + offPerp);
            } else {
                bloco.position.set(lado.sign * metade + offPerp, altura / 2, centro);
            }
            bloco.rotation.y = (Math.random() - 0.5) * 0.12;
            bloco.castShadow  = true;
            bloco.receiveShadow = true;
            grupo.add(bloco);

            if (Math.random() < 0.30) {
                var edges   = new THREE.EdgesGeometry(geo);
                var outline = new THREE.LineSegments(edges, matNeonGelo);
                outline.position.copy(bloco.position);
                outline.rotation.copy(bloco.rotation);
                grupo.add(outline);
            }

            cursor += largura * 0.70;
        }
    }
}

function construirCristaisGelo(grupo, ARENA) {
    var metade = ARENA / 2;
    var numClusters = 20;
    var raioSeguro = 11;
    var zonaBorda = metade - 1.5;

    var matCristal = new THREE.MeshStandardMaterial({
        color: 0xbbddff,
        emissive: 0x003366,
        emissiveIntensity: 0.5,
        roughness: 0.05,
        metalness: 0.85
    });
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
        var numPontas = 2 + Math.floor(Math.random() * 4);

        for (var p = 0; p < numPontas; p++) {
            var raio = 0.15 + Math.random() * 0.35;
            var alturaC = 0.8 + Math.random() * 3.5;
            var lados = 4 + Math.floor(Math.random() * 3);
            var geo = new THREE.ConeGeometry(raio, alturaC, lados);
            var mat = (Math.random() < 0.6) ? matCristal : matCristalMedio;
            var espinho = new THREE.Mesh(geo, mat);

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

function construirCeuGelo(grupo) {
    var geo = new THREE.SphereGeometry(150, 32, 24);
    var corTopo = new THREE.Color(0x020610);
    var corBase = new THREE.Color(0x041628);

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
        var auroraMask = Math.exp(-Math.pow((t - 0.4) / 0.18, 2));
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
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.8,
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
