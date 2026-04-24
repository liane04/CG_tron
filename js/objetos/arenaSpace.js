import * as THREE from 'three';

// Guardamos as referências dos grupos que precisam de rodar para o loop de animação
export var blocosOrbitais = [];

/**
 * Adiciona todos os elementos decorativos da arena Space.
 */
export function adicionarObjetosSpace(grupo, ARENA) {
    blocosOrbitais = []; 

    const posicoes = [
        new THREE.Vector3(18, 0, 18),
        new THREE.Vector3(-18, 0, 18),
        new THREE.Vector3(18, 0, -18),
        new THREE.Vector3(-18, 0, -18)
    ];

    posicoes.forEach(pos => {
        const torreADN = criarNucleoADN(pos);
        grupo.add(torreADN);
    });
}


/**
 * Anima os blocos orbitais dos pilares.
 */
export function atualizarSpace(delta) {
    blocosOrbitais.forEach(grupoAnimacao => {
        // Agora apenas o grupo das partículas roda
        grupoAnimacao.rotation.y += 1.2 * delta; 
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