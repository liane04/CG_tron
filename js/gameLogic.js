import * as THREE from 'three';
import {
    pausarJogador, pausarTodos, reposicionarJogador,
    definirCallbackColisao, obterLimiteArena
} from './input.js';
import { adicionarPonto, obterSegmentos, resetarTrail } from './trail.js';
import { blocosOrbitais } from './objetos/arenaSpace.js';
import { sfxCountdown } from './audioManager.js';
import { definirDificuldadeIA, obterDificuldadeIA } from './ai.js';

// Re-exportado para que o menu de definições possa configurar a IA sem importar ai.js
export { definirDificuldadeIA, obterDificuldadeIA };

// Temporários reutilizados a cada frame em atualizarGameLogic.
// adicionarPonto faz uma cópia interna dos dados, por isso é seguro reaproveitar.
const _tmpOffset = new THREE.Vector3();
const _tmpPosTrail = new THREE.Vector3();

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

    // --- Contagem decrescente 3 → 2 → 1 → GO! ---
    emContagem: false,
    valorContagem: 3,                // 3, 2, 1, 0 (=GO!)
    timerContagem: 0,
    overlayContagem: null,           // div HTML do overlay de countdown

    // --- Sistema de vidas / partida ---
    vidas: { 1: 3, 2: 3 },
    vidasIniciais: 3,
    numRonda: 0,
    tempoRonda: 0,                   // segundos decorridos na ronda actual
    tempoSobrevivencia: { 1: 0, 2: 0 }, // instante de morte por jogador
    recordeSobrevivencia: 0,         // melhor tempo single-player (localStorage)
    partidaTerminada: false,
    vencedorPartida: 0,
    onMatchEnd: null,                // callback ao fim da partida
    hudVidas: null                   // div HTML do HUD de corações
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

    // Vidas / partida — reset a cada novo jogo
    estado.vidasIniciais = (opts.vidasIniciais !== undefined) ? opts.vidasIniciais : 3;
    estado.vidas = { 1: estado.vidasIniciais, 2: estado.vidasIniciais };
    estado.numRonda = 0;
    estado.partidaTerminada = false;
    estado.vencedorPartida = 0;
    estado.onMatchEnd = opts.onMatchEnd || null;

    // Recorde de sobrevivência single-player
    var rec = parseFloat(localStorage.getItem('neonDrive_record'));
    estado.recordeSobrevivencia = isNaN(rec) ? 0 : rec;

    injetarStylesCountdown();
    atualizarHUD();
    mostrarHUD();

    // Wall hits = morte. 2.º slot (cbTrail) é reservado: a colisão com trails
    // é detectada aqui (verificarColisaoTrails), não em input.js.
    definirCallbackColisao(1, function () { accionarMorte(1); }, null);
    definirCallbackColisao(2, function () { accionarMorte(2); }, null);

    if (!estado.listenerEnter) {
        estado.listenerEnter = function (e) {
            if (e.code === 'Enter' && estado.aguardarEnter && !estado.partidaTerminada) {
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
    if (estado.partidaTerminada) return;

    esconderResultado();
    estado.aguardarEnter = false;
    estado.rondaTerminada = false;
    estado.timerResultado = 0;
    estado.timerNovaRonda = 0;
    estado.venceuId = 0;
    estado.tempoRonda = 0;
    estado.tempoSobrevivencia = { 1: 0, 2: 0 };
    estado.numRonda += 1;

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

    atualizarHUD();

    // Iniciar contagem decrescente discreta: 3 → 2 → 1 → GO!
    estado.emContagem = true;
    estado.valorContagem = 3;
    estado.timerContagem = 1.0;
    pausarTodos(true);
    mostrarContagem(3);
}

export function accionarMorte(jogadorId) {
    if (estado.emContagem) return;
    if (estado.rondaTerminada) return;
    if (!estado.activos[jogadorId]) return;

    estado.activos[jogadorId] = false;
    pausarJogador(jogadorId, true);

    // Registar tempo de sobrevivência deste jogador
    estado.tempoSobrevivencia[jogadorId] = estado.tempoRonda;

    // Perder uma vida
    estado.vidas[jogadorId] = Math.max(0, estado.vidas[jogadorId] - 1);
    atualizarHUD(jogadorId);

    var alvo = jogadorId === 1 ? estado.motaRef : estado.skateRef;
    var trailMorto = jogadorId === 1 ? estado.trailMota : estado.trailSkate;
    if (alvo) {
        var pos = new THREE.Vector3();
        alvo.getWorldPosition(pos);
        criarExplosao(pos, estado.cores[jogadorId] || 0xffffff, trailMorto);
        alvo.visible = false;
    }

    // O outro jogador venceu a ronda
    estado.rondaTerminada = true;
    estado.venceuId = jogadorId === 1 ? 2 : 1;

    // Single-player: J1 é o humano; se ele sobreviveu (i.e. morreu o J2 IA), regista recorde
    if (estado.gameMode === 'ai' && estado.venceuId === 1 && estado.tempoRonda > estado.recordeSobrevivencia) {
        estado.recordeSobrevivencia = estado.tempoRonda;
        try { localStorage.setItem('neonDrive_record', String(estado.tempoRonda)); } catch (e) {}
    }

    // Fim de partida?
    if (estado.vidas[jogadorId] <= 0) {
        estado.partidaTerminada = true;
        estado.vencedorPartida = estado.venceuId;
        estado.timerResultado = 2.0;
        estado.timerNovaRonda  = 8.0; // 2s morte + 6s leitura do GAME OVER
    } else {
        estado.timerResultado = 2.0;
        estado.timerNovaRonda  = 5.0; // 2s morte + 3s leitura
    }
}

// ---------------------------------------------------------------
// Update por frame
// ---------------------------------------------------------------
export function atualizarGameLogic(delta) {
    if (!estado.cena) return;

    // Contagem decrescente discreta: 3 → 2 → 1 → GO! → libertar jogadores
    if (estado.emContagem) {
        estado.timerContagem -= delta;
        if (estado.timerContagem <= 0) {
            estado.valorContagem -= 1;
            if (estado.valorContagem < 0) {
                // Já passou o GO! — liberta os jogadores e termina o countdown
                estado.emContagem = false;
                esconderContagem();
                pausarTodos(false);
            } else {
                // 3, 2, 1 ficam 1.0s cada; o GO! fica 0.65s
                estado.timerContagem = estado.valorContagem > 0 ? 1.0 : 0.65;
                mostrarContagem(estado.valorContagem);
            }
        }
        return;
    }

    // Cronómetro da ronda (só conta enquanto a ronda decorre)
    if (!estado.rondaTerminada) {
        estado.tempoRonda += delta;
    }

    // Adicionar pontos de trail enquanto vivos
    if (estado.activos[1] && estado.motaRef) {
        // Se for o trail clássico (ribbon), sai do centro (Z=0). Caso contrário, sai da traseira.
        const offZ = (estado.trailMota && estado.trailMota.id === 'ribbon') ? 0 : 1.8;
        _tmpOffset.set(0, 0, offZ).applyQuaternion(estado.motaRef.quaternion);
        _tmpPosTrail.copy(estado.motaRef.position).add(_tmpOffset);
        adicionarPonto(estado.trailMota, _tmpPosTrail);
    }
    if (estado.activos[2] && estado.skateRef) {
        const offZ = (estado.trailSkate && estado.trailSkate.id === 'ribbon') ? 0 : 1.2;
        _tmpOffset.set(0, 0, offZ).applyQuaternion(estado.skateRef.quaternion);
        _tmpPosTrail.copy(estado.skateRef.position).add(_tmpOffset);
        adicionarPonto(estado.trailSkate, _tmpPosTrail);
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
        if (estado.timerNovaRonda <= 0) {
            if (estado.partidaTerminada) {
                var cb = estado.onMatchEnd;
                limparGameLogic();
                if (cb) cb();
            } else {
                iniciarRonda();
            }
        }
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

    // 1. Núcleo de Plasma (3 Camadas Concêntricas - Facetadas e Digitais)
    var coreGeo1 = new THREE.IcosahedronGeometry(0.7, 1);
    var coreMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: false, wireframe: false
    });
    var core1 = new THREE.Mesh(coreGeo1, coreMat1);
    grupo.add(core1);

    var coreGeo2 = new THREE.OctahedronGeometry(1.0, 1);
    var coreMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85, wireframe: true
    });
    var core2 = new THREE.Mesh(coreGeo2, coreMat2);
    grupo.add(core2);

    var coreGeo3 = new THREE.DodecahedronGeometry(1.3, 0);
    var coreMat3 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.7
    });
    var core3 = new THREE.Mesh(coreGeo3, coreMat3);
    grupo.add(core3);

    // 2. Ondas de Choque Triplas (Três anéis de choque com orientações e rotações diferentes)
    var ringGeo1 = new THREE.RingGeometry(0.1, 0.8, 32);
    var ringMat1 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 1.0,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.2;
    grupo.add(ring1);

    var ringGeo2 = new THREE.RingGeometry(0.2, 0.9, 32);
    var ringMat2 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.8,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    ring2.position.y = 0.5;
    grupo.add(ring2);

    var ringGeo3 = new THREE.RingGeometry(0.1, 0.8, 32);
    var ringMat3 = new THREE.MeshBasicMaterial({
        color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring3 = new THREE.Mesh(ringGeo3, ringMat3);
    ring3.rotation.y = Math.PI / 2;
    ring3.position.y = 0.5;
    grupo.add(ring3);

    // 3. Flash (Luz de Impacto)
    // distance=14: ilumina apenas a zona imediata da explosão.
    // Antes era 80 (arena inteira) + intensity 150 — causava spike enorme na GPU.
    var flash = new THREE.PointLight(0xffffff, 0, 14, 2);
    flash.position.y = 2.0;
    grupo.add(flash);

    // 4. Materiais Partilhados das Partículas (Evita Overhead de 95 instâncias individuais)
    var matA = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 1.0, toneMapped: false
    });
    var matB = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 1.0, toneMapped: false
    });
    var matC = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false
    });

    // 5. Partículas A: Destroços Pesados da Armadura (15 Dodecaedros Sólidos)
    var geoA = new THREE.DodecahedronGeometry(0.35, 0);
    var particulasA = [];
    for (var i = 0; i < 15; i++) {
        var mA = new THREE.Mesh(geoA, matA);
        mA.userData.gravidade = 15.0;
        mA.userData.rotSpeed = new THREE.Vector3();
        mA.userData.vel = new THREE.Vector3();
        mA.userData.aterrou = false;
        mA.position.y = 1.0;
        grupo.add(mA);
        particulasA.push(mA);
    }

    // 6. Partículas B: Bolas Espelidas / Fragmentos Rápidos (15 Esferas Sólidas)
    var geoB = new THREE.SphereGeometry(0.2, 5, 5);
    var particulasB = [];
    for (var j = 0; j < 15; j++) {
        var mB = new THREE.Mesh(geoB, matB);
        mB.userData.gravidade = 12.0;
        mB.userData.rotSpeed = new THREE.Vector3();
        mB.userData.vel = new THREE.Vector3();
        mB.userData.aterrou = false;
        mB.position.y = 1.0;
        grupo.add(mB);
        particulasB.push(mB);
    }

    // 7. Partículas C: Fumo / Brasas de Energia Flutuantes (12 Octaedros)
    var geoC = new THREE.OctahedronGeometry(0.25, 0);
    var particulasC = [];
    for (var k = 0; k < 12; k++) {
        var mC = new THREE.Mesh(geoC, matC);
        mC.userData.gravidade = -1.5;
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
        ring3: ring3, ringGeo3: ringGeo3, ringMat3: ringMat3,
        flash: flash,
        particulasA: particulasA,
        particulasB: particulasB,
        particulasC: particulasC,
        matA: matA,
        matB: matB,
        matC: matC,
        geoA: geoA, geoB: geoB, geoC: geoC,
        idade: 0,
        duracao: 2.0,
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
        if (oldExp.ringMat3) oldExp.ringMat3.dispose();
        if (oldExp.ringGeo3) oldExp.ringGeo3.dispose();

        if (oldExp.matA) oldExp.matA.dispose();
        if (oldExp.matB) oldExp.matB.dispose();
        if (oldExp.matC) oldExp.matC.dispose();

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
    exp.ring3.visible = true; exp.ring3.scale.setScalar(1.0); exp.ringMat3.color.set(cor); exp.ringMat3.opacity = 0.9;

    exp.flash.color.set(cor); exp.flash.intensity = 35; // Reduzido de 150: menos spike de GPU

    // Configura as cores dos materiais partilhados e repõe a opacidade inicial
    exp.matA.color.set(cor); exp.matA.opacity = 1.0;
    exp.matB.color.set(cor); exp.matB.opacity = 1.0;
    exp.matC.color.set(cor); exp.matC.opacity = 0.9;

    // Destroços Pesados (A)
    for (var i = 0; i < exp.particulasA.length; i++) {
        var mA = exp.particulasA[i];
        mA.visible = true;
        mA.position.set(0, 1.0, 0);
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

    // 1. Núcleo de Plasma (3 Camadas) — expansão sequencial e rotação super rápida
    if (exp.idade < 0.25) {
        var ct = exp.idade / 0.25;
        exp.core1.scale.setScalar(0.1 + ct * 1.5);
        exp.core2.scale.setScalar(0.1 + ct * 1.8);
        exp.core3.scale.setScalar(0.1 + ct * 2.2);
    } else if (exp.idade < 0.4) {
        var fadeCore = 1 - (exp.idade - 0.25) / 0.15;
        exp.core1.scale.setScalar(1.6 * fadeCore);
        exp.core2.scale.setScalar(1.9 * fadeCore); exp.coreMat2.opacity = 0.85 * fadeCore;
        exp.core3.scale.setScalar(2.3 * fadeCore); exp.coreMat3.opacity = 0.7 * fadeCore;
    } else if (exp.core1.visible) {
        exp.core1.visible = false; exp.core2.visible = false; exp.core3.visible = false;
    }
    exp.core1.rotation.y += delta * 12.0; exp.core1.rotation.x += delta * 6.0;
    exp.core2.rotation.y -= delta * 9.0;  exp.core2.rotation.z += delta * 7.5;
    exp.core3.rotation.x -= delta * 7.5;  exp.core3.rotation.z -= delta * 4.5;

    // 2. Luzes — Flash inicial decai de 35 a 0 em 0.25s
    if (exp.idade < 0.25) {
        exp.flash.intensity = 35 * (1 - exp.idade / 0.25);
    } else if (exp.flash.intensity !== 0) {
        exp.flash.intensity = 0;
    }

    // 3. Ondas de Choque Triplas (Swirling e Expansão)
    if (exp.idade < 0.5) {
        var rt1 = exp.idade / 0.5;
        var raio1 = 0.8 + (16.0 - 0.8) * Math.pow(rt1, 0.7);
        var s1 = raio1 / 0.8;
        exp.ring1.scale.set(s1, s1, 1);
        exp.ringMat1.opacity = 1 - rt1;
        exp.ring1.rotation.z += delta * 4.0;
    } else if (exp.ringMat1.opacity !== 0) {
        exp.ringMat1.opacity = 0; exp.ring1.visible = false;
    }

    if (exp.idade < 0.6) {
        var rt2 = exp.idade / 0.6;
        var raio2 = 0.9 + (14.0 - 0.9) * Math.pow(rt2, 0.8);
        var s2 = raio2 / 0.9;
        exp.ring2.scale.set(s2, s2, 1);
        exp.ringMat2.opacity = 0.8 * (1 - rt2);
        exp.ring2.rotation.z -= delta * 3.5;
    } else if (exp.ringMat2.opacity !== 0) {
        exp.ringMat2.opacity = 0; exp.ring2.visible = false;
    }

    if (exp.idade < 0.55) {
        var rt3 = exp.idade / 0.55;
        var raio3 = 0.8 + (15.0 - 0.8) * Math.pow(rt3, 0.75);
        var s3 = raio3 / 0.8;
        exp.ring3.scale.set(s3, s3, 1);
        exp.ringMat3.opacity = 0.9 * (1 - rt3);
        exp.ring3.rotation.z += delta * 3.0;
    } else if (exp.ringMat3.opacity !== 0) {
        exp.ringMat3.opacity = 0; exp.ring3.visible = false;
    }

    // 4. Partículas A e B (Desvanecimento de Opacidade)
    var fadeParticula = 1.0;
    if (t > 0.3) {
        fadeParticula = 1.0 - (t - 0.3) / 0.7;
    }
    if (fadeParticula < 0) fadeParticula = 0;

    exp.matA.opacity = fadeParticula;
    exp.matB.opacity = fadeParticula;
    exp.matC.opacity = fadeParticula * 0.9;

    for (var i = 0; i < exp.particulasA.length; i++) {
        var pA = exp.particulasA[i];
        if (!pA.userData.aterrou) {
            pA.position.addScaledVector(pA.userData.vel, delta);
            pA.userData.vel.y -= pA.userData.gravidade * delta;
            pA.rotation.x += pA.userData.rotSpeed.x * delta;
            pA.rotation.y += pA.userData.rotSpeed.y * delta;
            pA.rotation.z += pA.userData.rotSpeed.z * delta;

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

            if (pB.position.y <= 0.2) {
                pB.position.y = 0.2;
                pB.userData.vel.set(0, 0, 0);
                pB.userData.rotSpeed.set(0, 0, 0);
                pB.userData.aterrou = true;
            }
        }
    }

    // 5. Partículas C (Brasas Flutuantes)
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
    exp.grupo.visible = false; // Remove todos os destroços imediatamente da visualização

    exp.flash.intensity = 0;
    exp.core1.visible = false;
    exp.core2.visible = false;
    exp.core3.visible = false;
    exp.ring1.visible = false;
    exp.ring2.visible = false;
    exp.ring3.visible = false;

    for (var i = 0; i < exp.particulasA.length; i++) {
        exp.particulasA[i].visible = false;
    }
    for (var j = 0; j < exp.particulasB.length; j++) {
        exp.particulasB[j].visible = false;
    }
    for (var k = 0; k < exp.particulasC.length; k++) {
        exp.particulasC[k].visible = false;
    }

    if (exp.trail && exp.trail.material && !exp.trailDone) {
        exp.trail.material.opacity = exp.trailOpacOrig;
    }
}

// Pré-compila shaders da explosão para eliminar stutters na primeira colisão
export function preCompilarExplosoes(renderer, cena, camara) {
    for (var i = 0; i < poolExplosoes.length; i++) {
        poolExplosoes[i].grupo.visible = true;
    }
    renderer.compile(cena, camara);
    for (var i = 0; i < poolExplosoes.length; i++) {
        poolExplosoes[i].grupo.visible = false;
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
    var titulo = document.createElement('div');
    titulo.className = 'rr-titulo';
    var subVitoria = document.createElement('div');
    subVitoria.className = 'rr-subvitoria';
    subVitoria.style.cssText = [
        'font-family:Orbitron, monospace', 'font-weight:700',
        'font-size:22px', 'letter-spacing:4px', 'margin-top:14px'
    ].join(';');
    var linhaCoracoes = document.createElement('div');
    linhaCoracoes.className = 'rr-coracoes';
    linhaCoracoes.style.cssText = [
        'font-family:Orbitron, monospace', 'font-weight:700',
        'font-size:24px', 'letter-spacing:6px', 'margin-top:14px'
    ].join(';');
    var linhaSobrevivencia = document.createElement('div');
    linhaSobrevivencia.className = 'rr-sobrev';
    linhaSobrevivencia.style.cssText = [
        'font-family:"Share Tech Mono", monospace', 'font-weight:400',
        'font-size:16px', 'letter-spacing:3px', 'margin-top:10px', 'opacity:0.85'
    ].join(';');
    var sub = document.createElement('div');
    sub.className = 'rr-sub';
    sub.style.cssText = [
        'font-family:"Share Tech Mono", monospace', 'font-weight:400',
        'font-size:18px', 'letter-spacing:4px', 'margin-top:14px', 'opacity:0.85'
    ].join(';');
    div.appendChild(titulo);
    div.appendChild(subVitoria);
    div.appendChild(linhaCoracoes);
    div.appendChild(linhaSobrevivencia);
    div.appendChild(sub);
    document.body.appendChild(div);
    estado.overlay = div;
    return div;
}

function corHexJogador(id) {
    var corNum = estado.cores[id];
    return (corNum !== undefined)
        ? '#' + corNum.toString(16).padStart(6, '0')
        : (id === 1 ? '#00eaff' : '#ff2bd6');
}

function nomeJogador(id) {
    if (estado.gameMode === 'local1v1' || estado.gameMode === 'split1v1') return id === 1 ? 'PLAYER 1' : 'PLAYER 2';
    return id === 1 ? 'PLAYER' : 'AI';
}

function mostrarResultado(venceuId) {
    var ov = obterOverlay();
    var corVenc = corHexJogador(venceuId);
    var corP1 = corHexJogador(1);
    var corP2 = corHexJogador(2);

    var titulo = ov.querySelector('.rr-titulo');
    var subVit = ov.querySelector('.rr-subvitoria');
    var coracoes = ov.querySelector('.rr-coracoes');
    var sobrev = ov.querySelector('.rr-sobrev');
    var sub = ov.querySelector('.rr-sub');

    if (estado.partidaTerminada) {
        // ─── GAME OVER ────────────────────────────────────────────
        titulo.textContent = 'GAME OVER';
        titulo.style.fontSize = '86px';
        titulo.style.color = '#ffffff';
        titulo.style.textShadow = '0 0 12px #ffffff, 0 0 24px #ffffff, 0 0 48px #ffffff';

        var nomeVenc = nomeJogador(venceuId);
        subVit.textContent = nomeVenc + ' WINS THE MATCH';
        subVit.style.color = corVenc;
        subVit.style.textShadow = '0 0 8px ' + corVenc + ', 0 0 16px ' + corVenc;
        subVit.style.display = 'block';

        var vidasV = estado.vidas[venceuId];
        var coracoesHtml = '';
        for (var i = 0; i < vidasV; i++) coracoesHtml += '<span style="color:' + corVenc + ';text-shadow:0 0 6px ' + corVenc + '">♥</span>';
        coracoesHtml += ' <span style="opacity:0.65;letter-spacing:4px">vs</span> ';
        var corPerd = corHexJogador(venceuId === 1 ? 2 : 1);
        coracoesHtml += '<span style="color:' + corPerd + ';opacity:0.5">♡</span>';
        coracoes.innerHTML = coracoesHtml;
        coracoes.style.display = 'block';

        sobrev.style.display = 'none';
        sub.textContent = 'RETURNING TO MENU IN 6s';
        sub.style.display = 'block';
    } else {
        // ─── Fim de ronda normal ───────────────────────────────────
        var texto = (estado.gameMode === 'local1v1' || estado.gameMode === 'split1v1')
            ? (venceuId === 1 ? 'PLAYER 1 WINS' : 'PLAYER 2 WINS')
            : (venceuId === 1 ? 'PLAYER WINS' : 'AI WINS');
        titulo.textContent = texto;
        titulo.style.fontSize = '72px';
        titulo.style.color = corVenc;
        titulo.style.textShadow = '0 0 12px ' + corVenc + ', 0 0 24px ' + corVenc + ', 0 0 48px ' + corVenc;

        subVit.style.display = 'none';

        // Linha de corações: P1 ♥♥♡ vs P2 ♥♥♥
        function fila(id, cor) {
            var total = estado.vidasIniciais;
            var v = estado.vidas[id];
            var html = '<span style="color:' + cor + ';margin-right:6px">' + (id === 1 ? 'P1' : 'P2') + '</span>';
            for (var i = 0; i < total; i++) {
                if (i < v) html += '<span style="color:' + cor + ';text-shadow:0 0 6px ' + cor + '">♥</span>';
                else      html += '<span style="color:' + cor + ';opacity:0.35">♡</span>';
            }
            return html;
        }
        coracoes.innerHTML = fila(1, corP1) + ' &nbsp;&nbsp; ' + fila(2, corP2);
        coracoes.style.display = 'block';

        // Linha de sobrevivência
        var tDecedido = estado.tempoRonda;
        var linhaSob = 'SURVIVED ' + tDecedido.toFixed(1) + 's';
        if (estado.gameMode === 'ai' && venceuId === 1 && tDecedido >= estado.recordeSobrevivencia && tDecedido > 0) {
            linhaSob += '   ★ NEW RECORD';
        }
        sobrev.textContent = linhaSob;
        sobrev.style.display = 'block';

        sub.textContent = 'NEW ROUND IN 3s   [ENTER]';
        sub.style.display = 'block';
    }

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
    estado.emContagem = false;
    estado.partidaTerminada = false;
    esconderResultado();
    esconderContagem();
    esconderHUD();
    for (var i = 0; i < estado.explosoes.length; i++) destruirExplosao(estado.explosoes[i]);
    estado.explosoes.length = 0;
    if (estado.trailMota)  resetarTrail(estado.trailMota);
    if (estado.trailSkate) resetarTrail(estado.trailSkate);
}

// ---------------------------------------------------------------
// Injecção de @keyframes (countdown-pop, heart-break)
// ---------------------------------------------------------------
function injetarStylesCountdown() {
    if (document.getElementById('neon-drive-styles')) return;
    var style = document.createElement('style');
    style.id = 'neon-drive-styles';
    style.textContent = [
        '@keyframes countdown-pop {',
        '  0%   { transform: translate(-50%, -50%) scale(1.5); opacity: 0.2; }',
        '  30%  { transform: translate(-50%, -50%) scale(1.0); opacity: 1.0; }',
        '  100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.85; }',
        '}',
        '.countdown-anim { animation: countdown-pop 0.8s ease-out; }',
        '@keyframes heart-break {',
        '  0%,100% { opacity: 1; transform: scale(1); }',
        '  20%     { opacity: 0; transform: scale(1.3); }',
        '  40%     { opacity: 1; transform: scale(1); }',
        '  60%     { opacity: 0; transform: scale(1.3); }',
        '  80%     { opacity: 1; transform: scale(1); }',
        '}',
        '.heart-break { display: inline-block; animation: heart-break 0.4s ease-out; }'
    ].join('\n');
    document.head.appendChild(style);
}

// ---------------------------------------------------------------
// Overlay de Contagem 3 → 2 → 1 → GO!
// ---------------------------------------------------------------
function obterOverlayContagem() {
    if (estado.overlayContagem) return estado.overlayContagem;
    var div = document.createElement('div');
    div.id = 'countdown-ronda';
    div.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%',
        'transform:translate(-50%, -50%)',
        'font-family:Orbitron, "Courier New", monospace',
        'font-weight:900', 'font-size:160px',
        'text-align:center', 'pointer-events:none',
        'z-index:1600', 'display:none'
    ].join(';');
    document.body.appendChild(div);
    estado.overlayContagem = div;
    return div;
}

function mostrarContagem(valor) {
    var ov = obterOverlayContagem();
    var cor, txt, fontSize;
    if (valor === 3)      { cor = '#ff2244'; txt = '3';   fontSize = '160px'; }
    else if (valor === 2) { cor = '#ffc83a'; txt = '2';   fontSize = '160px'; }
    else if (valor === 1) { cor = '#59ff7c'; txt = '1';   fontSize = '160px'; }
    else                  { cor = '#ffffff'; txt = 'GO!'; fontSize = '96px';  }

    ov.textContent = txt;
    ov.style.color = cor;
    ov.style.fontSize = fontSize;
    ov.style.textShadow = '0 0 12px ' + cor + ', 0 0 24px ' + cor + ', 0 0 48px ' + cor;
    ov.style.display = 'block';

    // Relança a animação CSS via reflow
    ov.classList.remove('countdown-anim');
    void ov.offsetWidth;
    ov.classList.add('countdown-anim');

    // SFX
    try {
        if (valor > 0) sfxCountdown('beep');
        else           sfxCountdown('go');
    } catch (e) {}
}

function esconderContagem() {
    if (estado.overlayContagem) estado.overlayContagem.style.display = 'none';
}

// ---------------------------------------------------------------
// HUD de Vidas (corações + ROUND N)
// ---------------------------------------------------------------
function obterHUDVidas() {
    if (estado.hudVidas) return estado.hudVidas;
    var div = document.createElement('div');
    div.id = 'hud-vidas';
    div.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%',
        'display:none', 'justify-content:space-between', 'align-items:center',
        'padding:10px 24px', 'box-sizing:border-box',
        'font-family:Orbitron, "Courier New", monospace',
        'font-size:13px', 'letter-spacing:2px',
        'pointer-events:none', 'z-index:1400'
    ].join(';');

    var p1 = document.createElement('div');
    p1.className = 'hud-p1';
    p1.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:700';
    var p2 = document.createElement('div');
    p2.className = 'hud-p2';
    p2.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:700';
    var meio = document.createElement('div');
    meio.className = 'hud-meio';
    meio.style.cssText = [
        'color:#ffffff', 'font-size:11px', 'letter-spacing:6px',
        'font-weight:900', 'text-shadow:0 0 6px #ffffff'
    ].join(';');

    div.appendChild(p1);
    div.appendChild(meio);
    div.appendChild(p2);
    document.body.appendChild(div);
    estado.hudVidas = div;
    return div;
}

function mostrarHUD() {
    var hud = obterHUDVidas();
    hud.style.display = 'flex';
}

function esconderHUD() {
    if (estado.hudVidas) estado.hudVidas.style.display = 'none';
}

function construirCoracoesHTML(jogadorId, indiceBreaking) {
    var cor = corHexJogador(jogadorId);
    var total = estado.vidasIniciais;
    var vivos = estado.vidas[jogadorId];
    var html = '';
    for (var i = 0; i < total; i++) {
        var key = jogadorId + '-' + i;
        if (i === indiceBreaking) {
            // Está a piscar antes de morrer — mostra ♥ na cor cheia com animação
            html += '<span class="heart-cell heart-break" data-id="' + key + '" style="color:' + cor + ';text-shadow:0 0 6px ' + cor + ',0 0 12px ' + cor + '">♥</span>';
        } else if (i < vivos) {
            html += '<span class="heart-cell" data-id="' + key + '" style="color:' + cor + ';text-shadow:0 0 6px ' + cor + ',0 0 12px ' + cor + '">♥</span>';
        } else {
            html += '<span class="heart-cell" data-id="' + key + '" style="color:' + cor + ';opacity:0.3">♡</span>';
        }
    }
    return html;
}

// Se `jogadorPerdeuVida` for passado, o coração na posição `vidas[id]`
// (já decrementado) é renderizado a piscar como ♥ durante 0.4s antes de
// passar definitivamente a ♡ no segundo render.
function atualizarHUD(jogadorPerdeuVida) {
    var hud = obterHUDVidas();
    var p1 = hud.querySelector('.hud-p1');
    var p2 = hud.querySelector('.hud-p2');
    var meio = hud.querySelector('.hud-meio');

    var nomeP1 = (estado.gameMode === 'local1v1' || estado.gameMode === 'split1v1') ? 'P1' : 'YOU';
    var nomeP2 = (estado.gameMode === 'local1v1' || estado.gameMode === 'split1v1') ? 'P2' : 'AI';
    var corP1 = corHexJogador(1);
    var corP2 = corHexJogador(2);

    var idxBreakP1 = (jogadorPerdeuVida === 1) ? estado.vidas[1] : -1;
    var idxBreakP2 = (jogadorPerdeuVida === 2) ? estado.vidas[2] : -1;

    p1.innerHTML = construirCoracoesHTML(1, idxBreakP1)
        + '<span style="color:' + corP1 + ';margin-left:10px;text-shadow:0 0 6px ' + corP1 + '">' + nomeP1 + '</span>';
    p2.innerHTML = '<span style="color:' + corP2 + ';margin-right:10px;text-shadow:0 0 6px ' + corP2 + '">' + nomeP2 + '</span>'
        + construirCoracoesHTML(2, idxBreakP2);
    meio.textContent = 'ROUND ' + estado.numRonda;

    // Após a animação, re-renderiza sem o "breaking" para o coração ficar ♡
    if (jogadorPerdeuVida) {
        setTimeout(function () { atualizarHUD(); }, 450);
    }
}
