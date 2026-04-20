import * as THREE from 'three';

// ---------------------------------------------------------------
// Construção de uma light bike a partir de primitivas Three.js.
// O modelo é totalmente paramétrico: a cor neon e a intensidade
// emissiva são adaptadas ao tema do mapa selecionado.
// ---------------------------------------------------------------

export function criarMota(tema, corNeon) {
    var grupo = new THREE.Group();
    grupo.userData.tipo = 'mota';

    // --- Sub-grupos organizados por função ---
    var grupoCorpo  = new THREE.Group();   // chassi + cockpit + carenagens (com arestas neon)
    var grupoRodas  = new THREE.Group();   // roda frontal + roda traseira
    var grupoFrente = new THREE.Group();   // guiador + faróis
    grupo.add(grupoCorpo);
    grupo.add(grupoRodas);
    grupo.add(grupoFrente);

    // --- Cor base normalizada ---
    var corBase = (corNeon instanceof THREE.Color) ? corNeon.clone() : new THREE.Color(corNeon);

    // --- Cor mais clara para os aros laterais (mistura com branco) ---
    var corClara = corBase.clone().lerp(new THREE.Color(0xffffff), 0.35);

    // --- Perfil emissivo dependente do tema ---
    var perfil = perfilDoTema(tema);

    // --- Materiais partilhados pelas várias peças ---
    var matCorpo = new THREE.MeshStandardMaterial({
        color: corBase,
        emissive: corBase,
        emissiveIntensity: perfil.emissivCorpo,
        roughness: 0.2,
        metalness: 0.8
    });

    var matCockpit = new THREE.MeshStandardMaterial({
        color: corBase,
        emissive: corBase,
        emissiveIntensity: perfil.emissivCorpo * 0.7,
        roughness: 0.2,
        metalness: 0.8
    });

    var matRoda = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.1,
        metalness: 0.9
    });

    var matAroRoda = new THREE.MeshStandardMaterial({
        color: corBase,
        emissive: corBase,
        emissiveIntensity: perfil.emissivAros,
        roughness: 0.3,
        metalness: 0.7
    });

    var matCarenagem = new THREE.MeshStandardMaterial({
        color: corClara,
        emissive: corClara,
        emissiveIntensity: perfil.emissivAros,
        roughness: 0.25,
        metalness: 0.7
    });

    var matGuiador = new THREE.MeshStandardMaterial({
        color: corBase,
        emissive: corBase,
        emissiveIntensity: perfil.emissivCorpo,
        roughness: 0.3,
        metalness: 0.6
    });

    var matFarol = new THREE.MeshStandardMaterial({
        color: corBase,
        emissive: corBase,
        emissiveIntensity: 2.0,
        roughness: 0.1,
        metalness: 0.4
    });

    // Material partilhado pelas linhas neon das peças do corpo.
    // linewidth >1 só funciona em WebGL2; mantemos 1 para compatibilidade.
    var matNeon = new THREE.LineBasicMaterial({
        color: corBase,
        linewidth: 1
    });

    // --- 1. Corpo principal (chassi alongado em Z) ---
    var geoCorpo = new THREE.BoxGeometry(0.35, 0.5, 2.2);
    var corpo = new THREE.Mesh(geoCorpo, matCorpo);
    corpo.position.set(0, 0.55, 0);
    aplicarSombras(corpo);
    grupoCorpo.add(corpo);
    adicionarArestas(corpo, geoCorpo, matNeon);

    // --- 2. Cockpit / cabine (ligeiramente inclinada para a frente) ---
    var geoCockpit = new THREE.BoxGeometry(0.25, 0.45, 0.9);
    var cockpit = new THREE.Mesh(geoCockpit, matCockpit);
    // Metade traseira do corpo: Z positivo (a roda traseira está em +Z)
    cockpit.position.set(0, 0.9, 0.4);
    cockpit.rotation.x = -0.15;
    aplicarSombras(cockpit);
    grupoCorpo.add(cockpit);
    adicionarArestas(cockpit, geoCockpit, matNeon);

    // --- 3. Rodas (frontal em -Z, traseira em +Z) ---
    var geoRoda = new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16);
    var geoAro  = new THREE.TorusGeometry(0.27, 0.03, 8, 24);

    var rodaFrente = criarRoda(geoRoda, geoAro, matRoda, matAroRoda);
    rodaFrente.position.set(0, 0.28, -0.9);
    grupoRodas.add(rodaFrente);

    var rodaTras = criarRoda(geoRoda, geoAro, matRoda, matAroRoda);
    rodaTras.position.set(0, 0.28, 0.9);
    grupoRodas.add(rodaTras);

    // --- 4. Carenagens laterais (detalhes finos em cada lado) ---
    var geoCarenagem = new THREE.BoxGeometry(0.04, 0.3, 1.8);
    var carenagemEsq = new THREE.Mesh(geoCarenagem, matCarenagem);
    carenagemEsq.position.set(-0.19, 0.55, 0);
    aplicarSombras(carenagemEsq);
    grupoCorpo.add(carenagemEsq);
    adicionarArestas(carenagemEsq, geoCarenagem, matNeon);

    var carenagemDir = new THREE.Mesh(geoCarenagem, matCarenagem);
    carenagemDir.position.set(0.19, 0.55, 0);
    aplicarSombras(carenagemDir);
    grupoCorpo.add(carenagemDir);
    adicionarArestas(carenagemDir, geoCarenagem, matNeon);

    // --- 5. Guiador (à frente da mota) ---
    var geoGuiador = new THREE.BoxGeometry(0.6, 0.08, 0.04);
    var guiador = new THREE.Mesh(geoGuiador, matGuiador);
    guiador.position.set(0, 0.85, -0.7);
    aplicarSombras(guiador);
    grupoFrente.add(guiador);

    // --- 6. Faróis (esferas brilhantes nas extremidades do guiador) ---
    var geoFarol = new THREE.SphereGeometry(0.06, 8, 8);

    var farolEsq = new THREE.Mesh(geoFarol, matFarol);
    farolEsq.position.set(-0.28, 0.85, -0.7);
    aplicarSombras(farolEsq);
    grupoFrente.add(farolEsq);

    var farolDir = new THREE.Mesh(geoFarol, matFarol);
    farolDir.position.set(0.28, 0.85, -0.7);
    aplicarSombras(farolDir);
    grupoFrente.add(farolDir);

    // --- Luz pontual filha (apenas em temas em que o perfil define) ---
    if (perfil.luz) {
        var luz = new THREE.PointLight(corBase, perfil.luz.intensidade, perfil.luz.distancia, perfil.luz.decay);
        luz.position.set(0, 0.8, 0);
        grupo.add(luz);
    }

    return grupo;
}

// ---------------------------------------------------------------
// Roda completa: cilindro escuro + torus emissivo no mesmo plano.
// O sub-grupo é rodado 90° em X para o cilindro ficar vertical.
// ---------------------------------------------------------------
function criarRoda(geoRoda, geoAro, matRoda, matAro) {
    var roda = new THREE.Group();

    var cilindro = new THREE.Mesh(geoRoda, matRoda);
    aplicarSombras(cilindro);
    roda.add(cilindro);

    var aro = new THREE.Mesh(geoAro, matAro);
    // O torus é criado no plano XY; ao rodar a roda em X (Math.PI/2),
    // o torus passa a estar no plano XZ, alinhado com o disco da roda.
    aro.rotation.x = Math.PI / 2;
    aplicarSombras(aro);
    roda.add(aro);

    roda.rotation.x = Math.PI / 2;
    return roda;
}

// ---------------------------------------------------------------
// Adiciona linhas neon (EdgesGeometry) sobre uma mesh, copiando
// posição e rotação para que os contornos acompanhem a peça.
// ---------------------------------------------------------------
function adicionarArestas(meshPai, geo, matNeon) {
    var arestas = new THREE.EdgesGeometry(geo);
    var linhas = new THREE.LineSegments(arestas, matNeon);
    linhas.position.copy(meshPai.position);
    linhas.rotation.copy(meshPai.rotation);
    meshPai.parent.add(linhas);
}

// ---------------------------------------------------------------
// Configuração de emissividade e luz extra por tema.
// ---------------------------------------------------------------
function perfilDoTema(tema) {
    if (tema === 'space') {
        return {
            emissivCorpo: 0.9,
            emissivAros:  1.2,
            luz: { intensidade: 0.6, distancia: 4, decay: 2 }
        };
    }
    if (tema === 'deserto') {
        return {
            emissivCorpo: 0.5,
            emissivAros:  0.7,
            luz: null
        };
    }
    if (tema === 'jungle') {
        return {
            emissivCorpo: 0.7,
            emissivAros:  1.0,
            luz: { intensidade: 0.4, distancia: 3, decay: 2 }
        };
    }

    // Fallback — perfil neutro caso o tema não seja reconhecido.
    return {
        emissivCorpo: 0.7,
        emissivAros:  0.9,
        luz: null
    };
}

// ---------------------------------------------------------------
// Helper para ativar projeção e receção de sombras numa mesh.
// ---------------------------------------------------------------
function aplicarSombras(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
}

// Uso: import { criarMota } from './mota.js';
//      var mota = criarMota('space', 0x00ffff);
//      cena.add(mota);
