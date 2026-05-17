import * as THREE from 'three';
import {
    pausarJogador, pausarTodos, reposicionarJogador,
    definirCallbackColisao, obterLimiteArena
} from './input.js';
import { adicionarPonto, obterSegmentos, resetarTrail } from './trail.js';
import { blocosOrbitais } from './objetos/arenaSpace.js';

// Estado interno da ronda corrente
const estado = {
    cena: null,
    arena: 70,
    motaRef: null,
    skateRef: null,
    trailMota: null,
    trailSkate: null,
    activos: { 1: false, 2: false }, // se cada jogador está vivo (move-se / deixa trail)
    explosoes: [],                   // efeitos de explosão activos
    rondaTerminada: false,
    timerResultado: 0,               // tempo até abrir o ecrã de resultado após morte
    timerNovaRonda: 0,               // tempo até iniciar nova ronda
    venceuId: 0,                     // 1 = mota (IA), 2 = skate (humano)
    aguardarEnter: false,
    distSegurancaSelf: 15,           // segmentos finais do próprio trail ignorados
    distColisaoTrail: 0.5,
    raioBuscaTrail: 10,              // culling: ignora segmentos a mais de N unidades
    overlay: null,                   // div HTML do ecrã de resultado
    listenerEnter: null,
    cores: { 1: 0xff2bd6, 2: 0x00eaff },
    gameMode: 'ai',                    // 'ai' | 'local1v1' — usado para o texto de vitória
    timerCountdown: 0,               // tempo de contagem inicial (3, 2, 1...)
    overlayCountdown: null,          // div HTML para a contagem
    corCountdown: '#ffffff'          // Cor da contagem (baseada no mapa)
};

// Pool de explosões pré-alocadas para evitar recompilação de shaders e stresse no GC
const poolExplosoes = [];

// ---------------------------------------------------------------
// Inicialização do controlador de jogo
// ---------------------------------------------------------------
export function configurarGameLogic(opts) {
    estado.cena      = opts.cena;
    estado.arena     = opts.arena || obterLimiteArena() * 2;
    estado.motaRef   = opts.motaRef;
    estado.skateRef  = opts.skateRef;
    estado.trailMota  = opts.trailMota;
    estado.trailSkate = opts.trailSkate;
    if (opts.cores) Object.assign(estado.cores, opts.cores);
    if (opts.gameMode) estado.gameMode = opts.gameMode;
    if (opts.corCountdown) {
        estado.corCountdown = (typeof opts.corCountdown === 'number')
            ? '#' + opts.corCountdown.toString(16).padStart(6, '0')
            : opts.corCountdown;
    }

    // Wall hits = morte. 2.º slot (cbTrail) é reservado: a colisão com trails
    // é detectada aqui (verificarColisaoTrails), não em input.js.
    definirCallbackColisao(1, function () { accionarMorte(1); }, null);
    definirCallbackColisao(2, function () { accionarMorte(2); }, null);

    if (!estado.listenerEnter) {
        estado.listenerEnter = function (e) {
            if (e.code === 'Enter' && estado.aguardarEnter) {
                iniciarRonda();
            }
        };
        window.addEventListener('keydown', estado.listenerEnter);
    }

    inicializarPoolExplosoes(opts.cena);
}

// ---------------------------------------------------------------
// Ronda
// ---------------------------------------------------------------
export function iniciarRonda() {
    if (!estado.cena) return;

    esconderResultado();
    estado.aguardarEnter = false;
    estado.rondaTerminada = false;
    estado.timerResultado = 0;
    estado.timerNovaRonda = 0;
    estado.venceuId = 0;

    // Limpar trails
    resetarTrail(estado.trailMota);
    resetarTrail(estado.trailSkate);

    // Repor visibilidade dos veículos (caso tenham explodido na ronda anterior)
    if (estado.motaRef)  estado.motaRef.visible = true;
    if (estado.skateRef) estado.skateRef.visible = true;

    // Limpar explosões pendentes
    for (var i = 0; i < estado.explosoes.length; i++) destruirExplosao(estado.explosoes[i]);
    estado.explosoes.length = 0;

    // Posições iniciais opostas
    var meio = estado.arena * 0.35;
    // Mota (IA) começa em -Z, virada para +Z (rotY = PI)
    reposicionarJogador(1, 0, -meio, Math.PI);
    // Skate (humano) começa em +Z, virado para -Z (rotY = 0)
    reposicionarJogador(2, 0,  meio, 0);

    estado.activos[1] = true;
    estado.activos[2] = true;
    
    // Iniciar contagem decrescente (3 segundos + margem para "GO!")
    estado.timerCountdown = 3.5;
    pausarTodos(true);
}

export function accionarMorte(jogadorId) {
    if (estado.rondaTerminada) return;
    if (!estado.activos[jogadorId]) return;

    estado.activos[jogadorId] = false;
    pausarJogador(jogadorId, true);

    var alvo = jogadorId === 1 ? estado.motaRef : estado.skateRef;
    var trailMorto = jogadorId === 1 ? estado.trailMota : estado.trailSkate;
    if (alvo) {
        var pos = new THREE.Vector3();
        alvo.getWorldPosition(pos);
        criarExplosao(pos, estado.cores[jogadorId] || 0xffffff, trailMorto);
        alvo.visible = false;
    }

    // O outro jogador venceu
    estado.rondaTerminada = true;
    estado.venceuId = jogadorId === 1 ? 2 : 1;
    estado.timerResultado = 2.0; // tempo até mostrar overlay
    estado.timerNovaRonda  = 5.0; // 2s morte + 3s leitura
}

// ---------------------------------------------------------------
// Update por frame
// ---------------------------------------------------------------
export function atualizarGameLogic(delta) {
    if (!estado.cena) return;

    // Adicionar pontos de trail enquanto vivos
    if (estado.activos[1] && estado.motaRef) {
        // Se for o trail clássico (ribbon), sai do centro (Z=0). Caso contrário, sai da traseira.
        const offZ = (estado.trailMota && estado.trailMota.id === 'ribbon') ? 0 : 1.8;
        const offset = new THREE.Vector3(0, 0, offZ).applyQuaternion(estado.motaRef.quaternion);
        const posTrail = estado.motaRef.position.clone().add(offset);
        adicionarPonto(estado.trailMota, posTrail);
    }
    if (estado.activos[2] && estado.skateRef) {
        const offZ = (estado.trailSkate && estado.trailSkate.id === 'ribbon') ? 0 : 1.2;
        const offset = new THREE.Vector3(0, 0, offZ).applyQuaternion(estado.skateRef.quaternion);
        const posTrail = estado.skateRef.position.clone().add(offset);
        adicionarPonto(estado.trailSkate, posTrail);
    }

    // Detectar colisões trail
    if (estado.activos[1] && verificarColisaoTrails(estado.motaRef.position, 1)) {
        accionarMorte(1);
    }
    if (estado.activos[2] && verificarColisaoTrails(estado.skateRef.position, 2)) {
        accionarMorte(2);
    }

    // Detectar colisão dinâmica com o Laser do Drone (Arena Space)
    if (estado.activos[1] && verificarColisaoDrone(estado.motaRef.position)) {
        accionarMorte(1);
    }
    if (estado.activos[2] && verificarColisaoDrone(estado.skateRef.position)) {
        accionarMorte(2);
    }

    // Gerir Contagem Decrescente
    if (estado.timerCountdown > 0) {
        estado.timerCountdown -= delta;
        atualizarOverlayCountdown();
        if (estado.timerCountdown <= 0) {
            pausarTodos(false);
        }
        // Enquanto há contagem, não processamos colisões de trail nem explosões
        // mas deixamos os drones/animações correrem para estabilizar o lag
        return; 
    }

    // Actualizar explosões
    for (var i = estado.explosoes.length - 1; i >= 0; i--) {
        var exp = estado.explosoes[i];
        if (!atualizarExplosao(exp, delta)) {
            destruirExplosao(exp);
            estado.explosoes.splice(i, 1);
        }
    }

    // Sequência de fim de ronda
    if (estado.rondaTerminada && !estado.aguardarEnter) {
        estado.timerResultado -= delta;
        estado.timerNovaRonda  -= delta;
        if (estado.timerResultado <= 0 && estado.venceuId !== 0) {
            mostrarResultado(estado.venceuId);
            estado.venceuId = 0; // só mostra uma vez
            estado.aguardarEnter = true;
        }
    }
    if (estado.aguardarEnter) {
        estado.timerNovaRonda -= delta;
        if (estado.timerNovaRonda <= 0) iniciarRonda();
    }
}

// ---------------------------------------------------------------
// Detecção de colisão veículo x trails
// ---------------------------------------------------------------
function verificarColisaoTrails(posVeiculo, jogadorId) {
    var thr = estado.distColisaoTrail;
    var thr2 = thr * thr;
    var raio = estado.raioBuscaTrail;
    var raio2 = raio * raio;

    var trails = [
        { trail: estado.trailMota,  self: jogadorId === 1 },
        { trail: estado.trailSkate, self: jogadorId === 2 }
    ];

    for (var t = 0; t < trails.length; t++) {
        var info = trails[t];
        if (!info.trail) continue;
        var segs = obterSegmentos(info.trail);
        var n = segs.length;
        var limite = info.self ? Math.max(0, n - estado.distSegurancaSelf) : n;
        for (var i = 0; i < limite; i++) {
            var s = segs[i];
            var dx = s.x - posVeiculo.x;
            var dz = s.z - posVeiculo.z;
            var d2 = dx * dx + dz * dz;
            if (d2 > raio2) continue;
            if (d2 < thr2) return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------
// Detecção de colisão dinâmica com o Drone
// ---------------------------------------------------------------
function verificarColisaoDrone(posVeiculo) {
    if (!blocosOrbitais || blocosOrbitais.length === 0) return false;

    for (let i = 0; i < blocosOrbitais.length; i++) {
        const obj = blocosOrbitais[i];
        if (obj.userData && obj.userData.tipo === 'drone') {
            // Check de distância 2D (o laser é um cilindro vertical)
            const dx = posVeiculo.x - obj.position.x;
            const dz = posVeiculo.z - obj.position.z;
            const distSq = dx * dx + dz * dz;

            // O laser tem espessuraAura = 0.55. Usamos ~0.7 de raio para a hitbox ser justa.
            // 0.7 * 0.7 = 0.49
            if (distSq < 0.49) {
                // Só colide se o jogador não estiver a saltar muito alto 
                // (opcional, mas o laser vem de cima, logo deveria atingir sempre)
                return true;
            }
        }
    }
    return false;
}

// ---------------------------------------------------------------
// Explosão
// ---------------------------------------------------------------
function alocarObjetoExplosao(cena) {
    var grupo = new THREE.Group();

    // 1. Núcleo de Plasma (3 Camadas Concêntricas - Menor e menos transparente)
    // Camada 1: Núcleo denso interno
    var coreGeo1 = new THREE.IcosahedronGeometry(0.7, 2);
    var coreMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: false, wireframe: false
    });
    var core1 = new THREE.Mesh(coreGeo1, coreMat1);
    grupo.add(core1);

    // Camada 2: Grelha de energia intermédia
    var coreGeo2 = new THREE.OctahedronGeometry(1.0, 2);
    var coreMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85, wireframe: true
    });
    var core2 = new THREE.Mesh(coreGeo2, coreMat2);
    grupo.add(core2);

    // Camada 3: Aura de plasma externa
    var coreGeo3 = new THREE.DodecahedronGeometry(1.3, 1);
    var coreMat3 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.7
    });
    var core3 = new THREE.Mesh(coreGeo3, coreMat3);
    grupo.add(core3);

    // 2. Ondas de Choque Duplas (Dois anéis de choque com orientações diferentes)
    var ringGeo1 = new THREE.RingGeometry(0.1, 0.8, 64);
    var ringMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 1.0,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.2;
    grupo.add(ring1);

    var ringGeo2 = new THREE.RingGeometry(0.2, 0.9, 64);
    var ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3; // Inclinado para dar volume 3D
    ring2.rotation.y = Math.PI / 4;
    ring2.position.y = 0.5;
    grupo.add(ring2);

    // 3. Flash e Fogo (Luzes)
    var flash = new THREE.PointLight(0xffffff, 0, 80, 2);
    flash.position.y = 2.0;
    grupo.add(flash);

    var fogo = new THREE.PointLight(0xffffff, 0, 35, 2);
    fogo.position.y = 1.5;
    grupo.add(fogo);

    // 4. Partículas A: Destroços Pesados da Armadura (30 Dodecaedros Sólidos)
    var geoA = new THREE.DodecahedronGeometry(0.35, 0);
    var particulasA = [];
    for (var i = 0; i < 30; i++) {
        var matA = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.2, metalness: 0.8, transparent: false
        });
        var mA = new THREE.Mesh(geoA, matA);
        mA.userData.gravidade = 15.0; // Gravidade forte para caírem rápido no chão
        mA.userData.rotSpeed = new THREE.Vector3();
        mA.userData.vel = new THREE.Vector3();
        mA.userData.aterrou = false;
        mA.position.y = 1.0;
        grupo.add(mA);
        particulasA.push(mA);
    }

    // 5. Partículas B: Bolas Espelidas (40 Esferas Sólidas que ficam na arena)
    var geoB = new THREE.SphereGeometry(0.2, 8, 8);
    var particulasB = [];
    for (var j = 0; j < 40; j++) {
        var matB = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.3, metalness: 0.5, transparent: false
        });
        var mB = new THREE.Mesh(geoB, matB);
        mB.userData.gravidade = 12.0;
        mB.userData.rotSpeed = new THREE.Vector3();
        mB.userData.vel = new THREE.Vector3();
        mB.userData.aterrou = false;
        mB.position.y = 1.0;
        grupo.add(mB);
        particulasB.push(mB);
    }

    // 6. Partículas C: Fumo / Brasas de Energia Flutuantes (25 Octaedros)
    var geoC = new THREE.OctahedronGeometry(0.25, 0);
    var particulasC = [];
    for (var k = 0; k < 25; k++) {
        var matC = new THREE.MeshBasicMaterial({
            color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9
        });
        var mC = new THREE.Mesh(geoC, matC);
        mC.userData.gravidade = -1.5; // Gravidade negativa faz flutuar para cima
        mC.userData.rotSpeed = new THREE.Vector3();
        mC.userData.vel = new THREE.Vector3();
        mC.userData.freq = 2 + Math.random() * 3;
        mC.userData.amp = 1 + Math.random() * 2;
        mC.position.y = 1.0;
        grupo.add(mC);
        particulasC.push(mC);
    }

    grupo.visible = false;
    cena.add(grupo);

    return {
        grupo: grupo,
        core1: core1, coreGeo1: coreGeo1, coreMat1: coreMat1,
        core2: core2, coreGeo2: coreGeo2, coreMat2: coreMat2,
        core3: core3, coreGeo3: coreGeo3, coreMat3: coreMat3,
        ring1: ring1, ringGeo1: ringGeo1, ringMat1: ringMat1,
        ring2: ring2, ringGeo2: ringGeo2, ringMat2: ringMat2,
        flash: flash,
        fogo: fogo,
        particulasA: particulasA,
        particulasB: particulasB,
        particulasC: particulasC,
        geoA: geoA, geoB: geoB, geoC: geoC,
        idade: 0,
        duracao: 2.5,
        trail: null,
        trailDuracao: 1.5,
        trailOpacOrig: 0,
        trailDone: false,
        emUso: false
    };
}

function inicializarPoolExplosoes(cena) {
    if (poolExplosoes.length > 0 && poolExplosoes[0].grupo.parent === cena) {
        for (var p = 0; p < poolExplosoes.length; p++) {
            var exp = poolExplosoes[p];
            exp.emUso = false;
            exp.grupo.visible = false; // Ao iniciar um mapa novo do zero, limpa a arena completamente
            exp.flash.intensity = 0;
            exp.fogo.intensity = 0;
        }
        return;
    }

    for (var p = 0; p < poolExplosoes.length; p++) {
        var oldExp = poolExplosoes[p];
        if (oldExp.grupo.parent) oldExp.grupo.parent.remove(oldExp.grupo);
        if (oldExp.coreMat1) oldExp.coreMat1.dispose();
        if (oldExp.coreGeo1) oldExp.coreGeo1.dispose();
        if (oldExp.coreMat2) oldExp.coreMat2.dispose();
        if (oldExp.coreGeo2) oldExp.coreGeo2.dispose();
        if (oldExp.coreMat3) oldExp.coreMat3.dispose();
        if (oldExp.coreGeo3) oldExp.coreGeo3.dispose();
        if (oldExp.ringMat1) oldExp.ringMat1.dispose();
        if (oldExp.ringGeo1) oldExp.ringGeo1.dispose();
        if (oldExp.ringMat2) oldExp.ringMat2.dispose();
        if (oldExp.ringGeo2) oldExp.ringGeo2.dispose();

        for (var i = 0; i < oldExp.particulasA.length; i++) {
            if (oldExp.particulasA[i].material) oldExp.particulasA[i].material.dispose();
        }
        for (var j = 0; j < oldExp.particulasB.length; j++) {
            if (oldExp.particulasB[j].material) oldExp.particulasB[j].material.dispose();
        }
        for (var k = 0; k < oldExp.particulasC.length; k++) {
            if (oldExp.particulasC[k].material) oldExp.particulasC[k].material.dispose();
        }
        if (oldExp.geoA) oldExp.geoA.dispose();
        if (oldExp.geoB) oldExp.geoB.dispose();
        if (oldExp.geoC) oldExp.geoC.dispose();
    }
    poolExplosoes.length = 0;

    for (var i = 0; i < 4; i++) {
        poolExplosoes.push(alocarObjetoExplosao(cena));
    }
}

function criarExplosao(posicao, cor, trail) {
    var exp = null;
    for (var p = 0; p < poolExplosoes.length; p++) {
        if (!poolExplosoes[p].emUso) {
            exp = poolExplosoes[p];
            break;
        }
    }
    if (!exp) {
        exp = alocarObjetoExplosao(estado.cena);
        poolExplosoes.push(exp);
    }

    exp.emUso = true;
    exp.idade = 0;
    exp.trail = trail || null;
    exp.trailOpacOrig = trail && trail.material ? trail.material.opacity : 0;
    exp.trailDone = false;

    exp.grupo.position.copy(posicao);
    exp.grupo.visible = true;

    // Ativa e configura as 3 camadas do núcleo
    exp.core1.visible = true; exp.core1.scale.setScalar(0.1); exp.coreMat1.color.set(cor);
    exp.core2.visible = true; exp.core2.scale.setScalar(0.1); exp.coreMat2.color.set(cor);
    exp.core3.visible = true; exp.core3.scale.setScalar(0.1); exp.coreMat3.color.set(cor);

    exp.ring1.visible = true; exp.ring1.scale.setScalar(1.0); exp.ringMat1.color.set(cor); exp.ringMat1.opacity = 1.0;
    exp.ring2.visible = true; exp.ring2.scale.setScalar(1.0); exp.ringMat2.color.set(cor); exp.ringMat2.opacity = 0.8;

    exp.flash.color.set(cor); exp.flash.intensity = 150;
    exp.fogo.color.set(cor); exp.fogo.intensity = 25;

    // Destroços Pesados (A)
    for (var i = 0; i < exp.particulasA.length; i++) {
        var mA = exp.particulasA[i];
        mA.visible = true;
        mA.position.set(0, 1.0, 0);
        mA.material.color.set(cor);
        mA.userData.aterrou = false;

        var angA = Math.random() * Math.PI * 2;
        var velHA = 8 + Math.random() * 12;   // 8–20
        var velVA = 5 + Math.random() * 10;   // 5–15
        mA.userData.vel.set(Math.cos(angA) * velHA, velVA, Math.sin(angA) * velHA);
        mA.userData.rotSpeed.set((Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15);
    }

    // Bolas Sólidas (B)
    for (var j = 0; j < exp.particulasB.length; j++) {
        var mB = exp.particulasB[j];
        mB.visible = true;
        mB.position.set(0, 1.0, 0);
        mB.material.color.set(cor);
        mB.userData.aterrou = false;

        var angB = Math.random() * Math.PI * 2;
        var velHB = 12 + Math.random() * 18;  // 12–30
        var velVB = 6 + Math.random() * 12;   // 6–18
        mB.userData.vel.set(Math.cos(angB) * velHB, velVB, Math.sin(angB) * velHB);
        mB.userData.rotSpeed.set((Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 25);
    }

    // Fumo / Brasas Flutuantes (C)
    for (var k = 0; k < exp.particulasC.length; k++) {
        var mC = exp.particulasC[k];
        mC.visible = true;
        mC.position.set((Math.random() - 0.5) * 2, 1.0 + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
        mC.material.color.set(cor);
        mC.material.opacity = 0.9;

        var angC = Math.random() * Math.PI * 2;
        var velHC = 2 + Math.random() * 4;
        var velVC = 3 + Math.random() * 6; // Sobem
        mC.userData.vel.set(Math.cos(angC) * velHC, velVC, Math.sin(angC) * velHC);
        mC.userData.rotSpeed.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    }

    estado.explosoes.push(exp);
    return exp;
}

function atualizarExplosao(exp, delta) {
    exp.idade += delta;
    var t = exp.idade / exp.duracao;
    if (t >= 1) return false;

    // 1. Núcleo de Plasma (3 Camadas) — expansão sequencial e rotação diferencial
    if (exp.idade < 0.25) {
        var ct = exp.idade / 0.25;
        exp.core1.scale.setScalar(0.1 + ct * 1.2); // Núcleo denso menor
        exp.core2.scale.setScalar(0.1 + ct * 1.5); // Grelha média
        exp.core3.scale.setScalar(0.1 + ct * 1.8); // Aura externa
    } else if (exp.idade < 0.4) {
        var fadeCore = 1 - (exp.idade - 0.25) / 0.15;
        exp.core1.scale.setScalar(1.3 * fadeCore);
        exp.core2.scale.setScalar(1.6 * fadeCore); exp.coreMat2.opacity = 0.85 * fadeCore;
        exp.core3.scale.setScalar(1.9 * fadeCore); exp.coreMat3.opacity = 0.7 * fadeCore;
    } else if (exp.core1.visible) {
        exp.core1.visible = false; exp.core2.visible = false; exp.core3.visible = false;
    }
    exp.core1.rotation.y += delta * 8.0; exp.core1.rotation.x += delta * 4.0;
    exp.core2.rotation.y -= delta * 6.0; exp.core2.rotation.z += delta * 5.0;
    exp.core3.rotation.x -= delta * 5.0; exp.core3.rotation.z -= delta * 3.0;

    // 2. Luzes — Flash inicial decai de 150 a 0
    if (exp.idade < 0.2) {
        exp.flash.intensity = 150 * (1 - exp.idade / 0.2);
    } else if (exp.flash.intensity !== 0) {
        exp.flash.intensity = 0;
    }

    var fadeFogo = 1 - t;
    var pulso = 0.7 + 0.3 * Math.sin(exp.idade * 35) * Math.cos(exp.idade * 18);
    exp.fogo.intensity = 25 * fadeFogo * pulso;

    // 3. Ondas de Choque Duplas
    if (exp.idade < 0.5) {
        var rt1 = exp.idade / 0.5;
        var raio1 = 0.8 + (16.0 - 0.8) * Math.pow(rt1, 0.7);
        var s1 = raio1 / 0.8;
        exp.ring1.scale.set(s1, s1, 1);
        exp.ringMat1.opacity = 1 - rt1;
    } else if (exp.ringMat1.opacity !== 0) {
        exp.ringMat1.opacity = 0; exp.ring1.visible = false;
    }

    if (exp.idade < 0.6) {
        var rt2 = exp.idade / 0.6;
        var raio2 = 0.9 + (14.0 - 0.9) * Math.pow(rt2, 0.8);
        var s2 = raio2 / 0.9;
        exp.ring2.scale.set(s2, s2, 1);
        exp.ringMat2.opacity = 0.8 * (1 - rt2);
    } else if (exp.ringMat2.opacity !== 0) {
        exp.ringMat2.opacity = 0; exp.ring2.visible = false;
    }

    // 4. Partículas A e B (Destroços Sólidos que ficam na arena)
    for (var i = 0; i < exp.particulasA.length; i++) {
        var pA = exp.particulasA[i];
        if (!pA.userData.aterrou) {
            pA.position.addScaledVector(pA.userData.vel, delta);
            pA.userData.vel.y -= pA.userData.gravidade * delta;
            pA.rotation.x += pA.userData.rotSpeed.x * delta;
            pA.rotation.y += pA.userData.rotSpeed.y * delta;
            pA.rotation.z += pA.userData.rotSpeed.z * delta;

            // Se atingir o chão (y=0.2), aterra e fica lá!
            if (pA.position.y <= 0.2) {
                pA.position.y = 0.2;
                pA.userData.vel.set(0, 0, 0);
                pA.userData.rotSpeed.set(0, 0, 0);
                pA.userData.aterrou = true;
            }
        }
    }

    for (var j = 0; j < exp.particulasB.length; j++) {
        var pB = exp.particulasB[j];
        if (!pB.userData.aterrou) {
            pB.position.addScaledVector(pB.userData.vel, delta);
            pB.userData.vel.y -= pB.userData.gravidade * delta;
            pB.rotation.x += pB.userData.rotSpeed.x * delta;
            pB.rotation.y += pB.userData.rotSpeed.y * delta;
            pB.rotation.z += pB.userData.rotSpeed.z * delta;

            // Se atingir o chão (y=0.2), aterra e fica lá!
            if (pB.position.y <= 0.2) {
                pB.position.y = 0.2;
                pB.userData.vel.set(0, 0, 0);
                pB.userData.rotSpeed.set(0, 0, 0);
                pB.userData.aterrou = true;
            }
        }
    }

    // 5. Partículas C (Brasas Flutuantes que desaparecem)
    var fadeC = 1.0;
    if (t > 0.4) fadeC = 1 - (t - 0.4) / 0.6;
    if (fadeC < 0) fadeC = 0;

    for (var k = 0; k < exp.particulasC.length; k++) {
        var pC = exp.particulasC[k];
        if (pC.visible) {
            pC.position.addScaledVector(pC.userData.vel, delta);
            pC.position.x += Math.sin(exp.idade * pC.userData.freq) * pC.userData.amp * delta;
            pC.position.z += Math.cos(exp.idade * pC.userData.freq) * pC.userData.amp * delta;
            pC.userData.vel.y -= pC.userData.gravidade * delta;
            pC.rotation.x += pC.userData.rotSpeed.x * delta;
            pC.rotation.y += pC.userData.rotSpeed.y * delta;
            pC.rotation.z += pC.userData.rotSpeed.z * delta;
            if (pC.material) pC.material.opacity = fadeC * 0.9;
        }
    }

    // Trail piscar a 8Hz durante 1.5s, depois desaparece completamente
    if (exp.trail && exp.trail.material && !exp.trailDone) {
        if (exp.idade < exp.trailDuracao) {
            var blink = (Math.floor(exp.idade * 16) % 2 === 0) ? 1.0 : 0.0;
            exp.trail.material.opacity = blink;
        } else {
            exp.trail.material.opacity = exp.trailOpacOrig;
            resetarTrail(exp.trail);
            exp.trailDone = true;
        }
    }

    return true;
}

function destruirExplosao(exp) {
    exp.emUso = false;
    // Oculta luzes, anéis, núcleo e brasas flutuantes
    exp.flash.intensity = 0;
    exp.fogo.intensity = 0;
    exp.core1.visible = false;
    exp.core2.visible = false;
    exp.core3.visible = false;
    exp.ring1.visible = false;
    exp.ring2.visible = false;

    for (var k = 0; k < exp.particulasC.length; k++) {
        exp.particulasC[k].visible = false;
    }

    // IMPORTANTE: NÃO ocultamos exp.grupo.visible nem particulasA/B!
    // Garantimos que todos os destroços que ainda não tinham aterrado caem instantaneamente no chão
    for (var i = 0; i < exp.particulasA.length; i++) {
        var pA = exp.particulasA[i];
        if (!pA.userData.aterrou) {
            pA.position.y = 0.2;
            pA.userData.vel.set(0, 0, 0);
            pA.userData.rotSpeed.set(0, 0, 0);
            pA.userData.aterrou = true;
        }
    }
    for (var j = 0; j < exp.particulasB.length; j++) {
        var pB = exp.particulasB[j];
        if (!pB.userData.aterrou) {
            pB.position.y = 0.2;
            pB.userData.vel.set(0, 0, 0);
            pB.userData.rotSpeed.set(0, 0, 0);
            pB.userData.aterrou = true;
        }
    }

    if (exp.trail && exp.trail.material && !exp.trailDone) {
        exp.trail.material.opacity = exp.trailOpacOrig;
    }
}

// ---------------------------------------------------------------
// Ecrã de resultado (overlay HTML)
// ---------------------------------------------------------------
function obterOverlay() {
    if (estado.overlay) return estado.overlay;
    var div = document.createElement('div');
    div.id = 'resultado-ronda';
    div.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%',
        'transform:translate(-50%,-50%)',
        'font-family:Orbitron, "Courier New", monospace',
        'font-weight:900', 'font-size:72px', 'letter-spacing:10px',
        'text-align:center', 'pointer-events:none',
        'z-index:1500', 'display:none'
    ].join(';');
    var sub = document.createElement('div');
    sub.style.cssText = [
        'font-family:"Share Tech Mono", monospace',
        'font-weight:400', 'font-size:18px', 'letter-spacing:4px',
        'margin-top:18px', 'opacity:0.85'
    ].join(';');
    sub.textContent = 'NEW ROUND IN 3s   [ENTER]';
    div.appendChild(document.createElement('span'));
    div.appendChild(sub);
    document.body.appendChild(div);
    estado.overlay = div;
    return div;
}

function mostrarResultado(venceuId) {
    var ov = obterOverlay();
    // No modo single-player o J1 é o humano e o J2 é a IA; no 1v1 ambos são
    // humanos e mostramos "PLAYER 1/2 WINS" para o vencedor identificar-se.
    var texto;
    if (estado.gameMode === 'local1v1') {
        texto = venceuId === 1 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS';
    } else {
        texto = venceuId === 1 ? 'PLAYER WINS' : 'AI WINS';
    }
    // Usa a cor real do vencedor (definida em main.js via cores: { 1, 2 }).
    // Cai para os tons clássicos cyan/magenta se por algum motivo não houver.
    var corNum = estado.cores[venceuId];
    var corHex = (corNum !== undefined)
        ? '#' + corNum.toString(16).padStart(6, '0')
        : (venceuId === 1 ? '#00eaff' : '#ff2bd6');
    var titulo = ov.firstChild;
    titulo.textContent = texto;
    titulo.style.color = corHex;
    titulo.style.textShadow =
        '0 0 12px ' + corHex + ',' +
        '0 0 24px ' + corHex + ',' +
        '0 0 48px ' + corHex;
    ov.style.color = corHex;
    ov.style.display = 'block';
}

function esconderResultado() {
    if (estado.overlay) estado.overlay.style.display = 'none';
}

// ---------------------------------------------------------------
// Limpeza (chamado ao voltar para o menu)
// ---------------------------------------------------------------
export function limparGameLogic() {
    pausarTodos(true);
    estado.activos[1] = false;
    estado.activos[2] = false;
    estado.rondaTerminada = false;
    estado.aguardarEnter = false;
    esconderResultado();
    for (var i = 0; i < estado.explosoes.length; i++) destruirExplosao(estado.explosoes[i]);
    estado.explosoes.length = 0;
    if (estado.trailMota)  resetarTrail(estado.trailMota);
    if (estado.trailSkate) resetarTrail(estado.trailSkate);
    if (estado.overlayCountdown) estado.overlayCountdown.style.display = 'none';
}

// ---------------------------------------------------------------
// Overlay de Contagem
// ---------------------------------------------------------------
function obterOverlayCountdown() {
    if (estado.overlayCountdown) return estado.overlayCountdown;
    var div = document.createElement('div');
    div.id = 'countdown-ronda';
    div.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%',
        'transform:translate(-50%,-50%)',
        'font-family:Orbitron, "Courier New", monospace',
        'font-weight:900', 'font-size:120px',
        'text-align:center', 'pointer-events:none',
        'z-index:2000', 'display:none',
        'color: #ffffff',
        'text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff'
    ].join(';');
    document.body.appendChild(div);
    estado.overlayCountdown = div;
    return div;
}

function atualizarOverlayCountdown() {
    var ov = obterOverlayCountdown();
    var t = estado.timerCountdown;

    if (t <= 0) {
        ov.style.display = 'none';
        return;
    }

    ov.style.display = 'block';
    
    if (t > 0.5) {
        ov.textContent = Math.ceil(t - 0.5).toString();
        ov.style.color = estado.corCountdown;
        ov.style.textShadow = '0 0 20px ' + estado.corCountdown + ', 0 0 40px ' + estado.corCountdown;
    } else {
        ov.textContent = 'GO!';
        ov.style.color = '#00ff00';
        ov.style.textShadow = '0 0 20px #00ff00, 0 0 40px #00ff00';
    }
    
    // Efeito de pulso simples na escala
    var scale = 1.0 + (t % 1.0) * 0.2;
    ov.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
}
