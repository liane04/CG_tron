import * as THREE from 'three';

var _jungleState = null;

export function adicionarObjetosJungle(grupo, ARENA, loaderOBJ, loaderMTL) {
    _jungleState = null;
    
    // --- Paredes de Vegetação ---
    construirParedesJungle(grupo, ARENA);

    // --- Árvores ---
    construirArvoresJungle(grupo, ARENA);

    // --- Rochas ---
    construirRochasJungle(grupo, ARENA);

    // --- Lianas ---
    construirLianasJungle(grupo, ARENA);

    // --- Partículas ---
    construirParticulasJungle(grupo, ARENA);

    // --- Luzes Extra ---
    construirLuzesJungle(grupo);

    // --- Oddish Gigante (Fora da Arena) ---
    adicionarOddishJungle(grupo, ARENA, loaderOBJ, loaderMTL);
}

function adicionarOddishJungle(grupo, ARENA, loaderOBJ, loaderMTL) {
    if (!loaderOBJ || !loaderMTL) return;

    const mtlPath = './models/odish/materials.mtl';
    const objPath = './models/odish/model.obj';

    loaderMTL.load(mtlPath, function (materials) {
        materials.preload();
        loaderOBJ.setMaterials(materials);
        loaderOBJ.load(objPath, function (object) {
            // "mesmo gigante fora da arena"
            object.scale.set(80, 80, 80);
            
            // Aproximar da arena e manter a altura
            object.position.set(0, 50, -(ARENA / 2 + 40));
            
            // Olhar para o centro da arena e depois rodar 180 graus (ou apenas ajustar a rotação)
            object.lookAt(0, 0, 0);
            object.rotation.y += Math.PI; // Rotação de 180 graus na horizontal

            // Luzes para o gigante
            const luzOddish = new THREE.PointLight(0x88ff44, 200, 150);
            luzOddish.position.set(0, 30, 20);
            object.add(luzOddish);

            // Brilho ambiente extra
            const luzTopo = new THREE.PointLight(0x44ff88, 100, 100);
            luzTopo.position.set(0, 60, 0);
            object.add(luzTopo);

            // Ajustar sombras
            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            grupo.add(object);
        });
    });
}

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
