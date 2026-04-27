import * as THREE from 'three';

var _neveState = null;
var blocosGeloOrbitais = [];

export function adicionarObjetosGelo(grupo, ARENA, loader) {
    _neveState = null;
    blocosGeloOrbitais = [];
    
    // --- Paredes de Gelo ---
    construirPilaresGelo(grupo, ARENA, loader);

    // --- Cristais Low-Poly (Cyber-Glacial) ---
    construirCristaisGelo(grupo, ARENA, loader);

    // --- Pilares de Contenção Matrix removidos conforme pedido ---

    // --- Céu ---
    construirCeuGelo(grupo);

    // --- Partículas (Neve com BoxGeometry) ---
    construirParticulasNeve(grupo, ARENA);

    // --- Iluminação Extra Otimizada ---
    // HemisphereLight para garantir visibilidade geral sem peso de sombras
    var aurora = new THREE.HemisphereLight(0x4477aa, 0x011133, 1.2);
    grupo.add(aurora);

    // Apenas 1 ponto de luz de acento Vermelho (em vez de 2)
    var rimCarmesim = new THREE.PointLight(0xff0033, 5.0, 100);
    rimCarmesim.position.set(0, 10, -ARENA/2);
    grupo.add(rimCarmesim);

    // Removidas as luzes de chão individuais para performance

    // --- Glaciares Hexagonais (Obstáculos) ---
    grupo.add(criarGlaciarHexagonal(new THREE.Vector3(20, 0, 20), 0x00ffff, loader));
    grupo.add(criarGlaciarHexagonal(new THREE.Vector3(-20, 0, -20), 0xff0000, loader));
}

export function atualizarGelo(delta) {
    // Atualiza a neve (InstancedMesh)
    if (_neveState) {
        var dummy = new THREE.Object3D();
        var count = _neveState.count;
        var pos = _neveState.positions;
        var vel = _neveState.velocities;
        var lim = _neveState.limite;
        
        for (var i = 0; i < count; i++) {
            var idx = i * 3;
            // Queda errática
            pos[idx + 1] -= vel[i] * delta; // y
            pos[idx] += Math.sin(_neveState.tempo * 2 + i) * 0.5 * delta; // x
            pos[idx + 2] += Math.cos(_neveState.tempo * 1.5 + i) * 0.5 * delta; // z

            if (pos[idx + 1] < -1) {
                pos[idx]     = (Math.random() - 0.5) * 2 * lim;
                pos[idx + 1] = 12 + Math.random() * 8;  
                pos[idx + 2] = (Math.random() - 0.5) * 2 * lim;
            }

            dummy.position.set(pos[idx], pos[idx+1], pos[idx+2]);
            // Rotação errática
            dummy.rotation.x += delta * 0.5;
            dummy.rotation.y += delta * 0.8;
            dummy.updateMatrix();
            _neveState.mesh.setMatrixAt(i, dummy.matrix);
        }
        _neveState.tempo += delta;
        _neveState.mesh.instanceMatrix.needsUpdate = true;
    }
}

function construirPilaresGelo(grupo, ARENA, loader) {
    var metade = ARENA / 2;

    const texBase = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_basecolor.png');
    const texNormal = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_normal.png');
    const texRough = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_roughness.png');
    const texAO = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_ambientOcclusion.png');

    [texBase, texNormal, texRough, texAO].forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 1);
    });

    var matGeloEscuro = new THREE.MeshStandardMaterial({
        map: texBase,
        normalMap: texNormal,
        roughnessMap: texRough,
        aoMap: texAO,
        color: 0x224488, // Azul mais visível para mostrar a textura
        emissive: 0x051020, // Leve brilho interno para não ficar totalmente preto
        emissiveIntensity: 0.5,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.95
    });

    var matContornoBrilhante = new THREE.LineBasicMaterial({ color: 0x00ffff });

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
            var largura   = 1.5 + Math.random() * 3.0;
            var altura    = 8 + Math.random() * 12; // Paredes altas e irregulares
            var espessura = 1.0 + Math.random() * 2.0;
            var offPerp   = (Math.random() - 0.5) * 1.5;

            var geo = new THREE.BoxGeometry(
                lado.axis === 'x' ? largura   : espessura,
                altura,
                lado.axis === 'x' ? espessura : largura
            );
            var bloco = new THREE.Mesh(geo, matGeloEscuro);

            var centro = cursor + largura / 2;
            if (lado.axis === 'x') {
                bloco.position.set(centro, altura / 2, lado.sign * metade + offPerp);
            } else {
                bloco.position.set(lado.sign * metade + offPerp, altura / 2, centro);
            }
            
            bloco.rotation.y = (Math.random() - 0.5) * 0.15;
            bloco.rotation.z = (Math.random() - 0.5) * 0.05; // Leve inclinação nas paredes
            bloco.castShadow  = true;
            bloco.receiveShadow = true;
            grupo.add(bloco);

            // Contornos Cyber (em TODOS os pilares)
            var edges   = new THREE.EdgesGeometry(geo);
            var outline = new THREE.LineSegments(edges, matContornoBrilhante);
            outline.position.copy(bloco.position);
            outline.rotation.copy(bloco.rotation);
            grupo.add(outline);

            // Luz Neon em apenas alguns pilares (apenas 4 focos no total para a arena inteira)
            if (Math.random() < 0.1) { 
                var luzNeon = new THREE.PointLight(0x00ffff, 6.0, 25);
                luzNeon.position.copy(bloco.position);
                luzNeon.position.y = 2;
                grupo.add(luzNeon);
            }

            cursor += largura * 0.85;
        }
    }
}

function construirCristaisGelo(grupo, ARENA, loader) {
    var metade = ARENA / 2;
    var numClusters = 25;
    var raioSeguro = 22; // Aumentado para afastar do centro e aproximar das paredes
    var zonaBorda = metade - 2.0;

    const texBase = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_basecolor.png');
    const texNormal = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_normal.png');
    const texRough = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_roughness.png');

    var matGeloPuro = new THREE.MeshStandardMaterial({
        map: texBase,
        normalMap: texNormal,
        roughnessMap: texRough,
        color: 0xccffff,
        emissive: 0x001133,
        emissiveIntensity: 0.2,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
    });

    var matNeonVermelho = new THREE.MeshStandardMaterial({
        color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 2.0, toneMapped: false
    });

    var matNeonCiano = new THREE.MeshStandardMaterial({
        color: 0x00cfff, emissive: 0x00cfff, emissiveIntensity: 2.0, toneMapped: false
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
        var numPontas = 2 + Math.floor(Math.random() * 3);

        for (var p = 0; p < numPontas; p++) {
            var raio = 0.3 + Math.random() * 0.6;
            var alturaC = 1.5 + Math.random() * 4.5;
            var segmentos = 4 + Math.floor(Math.random() * 2); // 4 ou 5 segmentos
            
            // Cilindro com raio topo = 0 vira uma pirâmide poligonal
            var geo = new THREE.CylinderGeometry(0, raio, alturaC, segmentos);
            var espinho = new THREE.Mesh(geo, matGeloPuro);

            espinho.position.set(
                (Math.random() - 0.5) * 1.5,
                alturaC / 2,
                (Math.random() - 0.5) * 1.5
            );
            espinho.rotation.x = (Math.random() - 0.5) * 0.6;
            espinho.rotation.z = (Math.random() - 0.5) * 0.6;
            espinho.rotation.y = Math.random() * Math.PI * 2;
            espinho.castShadow = true;
            espinho.receiveShadow = true;
            cluster.add(espinho);

            // Núcleo Neon
            if (Math.random() > 0.6) {
                var matCore = Math.random() > 0.5 ? matNeonVermelho : matNeonCiano;
                var geoCore = new THREE.CylinderGeometry(0, raio * 0.4, alturaC * 0.8, segmentos);
                var core = new THREE.Mesh(geoCore, matCore);
                core.position.copy(espinho.position);
                core.position.y -= 0.2; // Afundado um pouco
                core.rotation.copy(espinho.rotation);
                cluster.add(core);
                
                // Adicionar luz pontual fraca no núcleo
                var luzCore = new THREE.PointLight(matCore.color, 0.5, 4);
                luzCore.position.copy(core.position);
                luzCore.position.y += alturaC * 0.2;
                cluster.add(luzCore);
            }
        }

        cluster.position.set(x, 0, z);
        grupo.add(cluster);
    }
}

function construirCeuGelo(grupo) {
    var geo = new THREE.SphereGeometry(200, 32, 24);
    var corTopo = new THREE.Color(0x000205); // Preto profundo
    var corBase = new THREE.Color(0x0a1a3a); // Azul ártico no horizonte

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
        var t = Math.pow(Math.max(0, (yv - minY) / (maxY - minY)), 0.7); // Curva mais suave
        var cor = new THREE.Color().lerpColors(corBase, corTopo, t);
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

    // Adicionar "Estrelas Digitais" (pontos de dados congelados no vácuo)
    var numEstrelas = 500;
    var geoEstrelas = new THREE.BufferGeometry();
    var posEstrelas = new Float32Array(numEstrelas * 3);
    for (var k = 0; k < numEstrelas; k++) {
        var r = 180;
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos((Math.random() * 2) - 1);
        
        posEstrelas[k * 3]     = r * Math.sin(phi) * Math.cos(theta);
        posEstrelas[k * 3 + 1] = Math.abs(r * Math.sin(phi) * Math.sin(theta)); // Apenas céu (y > 0)
        posEstrelas[k * 3 + 2] = r * Math.cos(phi);
    }
    geoEstrelas.setAttribute('position', new THREE.BufferAttribute(posEstrelas, 3));
    var matEstrelas = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.5,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: false
    });
    grupo.add(new THREE.Points(geoEstrelas, matEstrelas));
}

function construirParticulasNeve(grupo, ARENA) {
    var num = 800;
    var lim = ARENA / 2;

    var geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    // Material Standard para reagir a luz (cristais minúsculos de gelo)
    var mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x112233, // Leve brilho
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.8
    });

    var instancedMesh = new THREE.InstancedMesh(geo, mat, num);
    var dummy = new THREE.Object3D();
    
    var positions = new Float32Array(num * 3);
    var velocities = new Float32Array(num);

    for (var i = 0; i < num; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * 2 * lim;
        positions[i * 3 + 1] = Math.random() * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * lim;
        
        velocities[i] = 1.0 + Math.random() * 2.5;

        dummy.position.set(positions[i*3], positions[i*3+1], positions[i*3+2]);
        dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.castShadow = false; // Desativado para evitar sombras estranhas no chão
    instancedMesh.receiveShadow = false;
    grupo.add(instancedMesh);

    _neveState = {
        mesh: instancedMesh,
        positions: positions,
        velocities: velocities,
        count: num,
        limite: lim,
        tempo: 0
    };
}

/**
 * Constrói um cluster de pilares de gelo hexagonais.
 * Excelente obstáculo com faces planas para a mota contornar.
 * Cumpre a regra de usar apenas CylinderGeometry.
 */
function criarGlaciarHexagonal(posicao, corNeon, loader) {
    const grupoGlaciar = new THREE.Group();

    const texBase = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_basecolor.png');
    const texNormal = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_normal.png');
    const texRough = loader.load('./textures/gelo/gelopartido/Stylized_Ice_001_roughness.png');

    // 1. Material de Gelo Cibernético (Refletor mas não 100% transparente)
    const matGelo = new THREE.MeshStandardMaterial({
        map: texBase,
        normalMap: texNormal,
        roughnessMap: texRough,
        color: 0x88ccff,
        emissive: 0x001133,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
    });

    // 2. Material do "Núcleo de Dados" no topo (Brilhante)
    const matTopo = new THREE.MeshStandardMaterial({
        color: corNeon, 
        emissive: corNeon,
        emissiveIntensity: 4,
        toneMapped: false
    });

    // Vamos criar 3 pilares juntos com alturas diferentes
    const pilares = [
        { raio: 3,   altura: 12, x: 0,    z: 0 },
        { raio: 2.5, altura: 8,  x: 4.5,  z: 2 },
        { raio: 2,   altura: 6,  x: -2.5, z: 4 }
    ];

    pilares.forEach(dados => {
        // O número '6' cria o hexágono!
        const geoHex = new THREE.CylinderGeometry(dados.raio, dados.raio, dados.altura, 6);
        const pilar = new THREE.Mesh(geoHex, matGelo);
        pilar.position.set(dados.x, dados.altura / 2, dados.z);
        pilar.castShadow = true;
        pilar.receiveShadow = true;

        // Adicionar uma "tampa" de energia brilhante no topo de cada pilar
        const geoTampa = new THREE.CylinderGeometry(dados.raio - 0.2, dados.raio - 0.2, 0.4, 6);
        const tampa = new THREE.Mesh(geoTampa, matTopo);
        tampa.position.y = (dados.altura / 2) + 0.1; // Fica mesmo no topo
        pilar.add(tampa);

        grupoGlaciar.add(pilar);
    });

    // 3. Luz interna do glaciar para iluminar a arena ao redor
    const luz = new THREE.PointLight(corNeon, 30, 20, 2);
    luz.position.set(0, 4, 2);
    grupoGlaciar.add(luz);

    // Identificador para o sistema de colisões (no futuro)
    grupoGlaciar.userData.isObstacle = true;
    grupoGlaciar.position.copy(posicao);

    // Rotação aleatória para que cada glaciar pareça único na arena
    grupoGlaciar.rotation.y = Math.random() * Math.PI;

    return grupoGlaciar;
}
