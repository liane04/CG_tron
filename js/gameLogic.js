import * as THREE from 'three';
import {
    pausarJogador, pausarTodos, reposicionarJogador,
    definirCallbackColisao, obterLimiteArena
} from './input.js';
import { adicionarPonto, obterSegmentos, resetarTrail } from './trail.js';

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
    gameMode: 'ai'                    // 'ai' | 'local1v1' — usado para o texto de vitória
};

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
    pausarTodos(false);
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
        adicionarPonto(estado.trailMota, estado.motaRef.position);
    }
    if (estado.activos[2] && estado.skateRef) {
        adicionarPonto(estado.trailSkate, estado.skateRef.position);
    }

    // Detectar colisões trail
    if (estado.activos[1] && verificarColisaoTrails(estado.motaRef.position, 1)) {
        accionarMorte(1);
    }
    if (estado.activos[2] && verificarColisaoTrails(estado.skateRef.position, 2)) {
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
// Explosão
// ---------------------------------------------------------------
function criarExplosao(posicao, cor, trail) {
    var grupo = new THREE.Group();
    grupo.position.copy(posicao);

    // Flash inicial — desce a 0 nos primeiros 0.15s e ilumina a arena
    var flash = new THREE.PointLight(cor, 70, 60, 2);
    flash.position.y = 1.5;
    grupo.add(flash);

    // Luz de fogo persistente — pulsa irregularmente durante toda a explosão
    var fogo = new THREE.PointLight(cor, 12, 25, 2);
    fogo.position.y = 1.0;
    grupo.add(fogo);

    // Anel de choque (shockwave) — expande no plano XZ
    var ringGeo = new THREE.RingGeometry(0.1, 0.5, 48);
    var ringMat = new THREE.MeshBasicMaterial({
        color: cor, toneMapped: false, transparent: true, opacity: 1.0,
        side: THREE.DoubleSide, depthWrite: false
    });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    grupo.add(ring);

    // Partículas — Grupo A: destroços principais (40, com gravidade 9.8)
    var geoA = new THREE.SphereGeometry(0.25, 5, 5);
    var particulasA = [];
    for (var i = 0; i < 40; i++) {
        var matA = new THREE.MeshBasicMaterial({
            color: cor, toneMapped: false, transparent: true, opacity: 1.0
        });
        var mA = new THREE.Mesh(geoA, matA);
        var angA = Math.random() * Math.PI * 2;
        var velHA = 8 + Math.random() * 10;   // 8–18
        var velVA = 3 + Math.random() * 7;    // 3–10
        mA.userData.vel = new THREE.Vector3(
            Math.cos(angA) * velHA, velVA, Math.sin(angA) * velHA
        );
        mA.userData.gravidade = 9.8;
        mA.position.y = 1.0;
        grupo.add(mA);
        particulasA.push(mA);
    }

    // Grupo B: faíscas pequenas (20, gravidade muito baixa)
    var geoB = new THREE.SphereGeometry(0.08, 4, 4);
    var particulasB = [];
    for (var j = 0; j < 20; j++) {
        var matB = new THREE.MeshBasicMaterial({
            color: cor, toneMapped: false, transparent: true, opacity: 1.0
        });
        var mB = new THREE.Mesh(geoB, matB);
        var angB = Math.random() * Math.PI * 2;
        var velHB = 15 + Math.random() * 15;  // 15–30
        var velVB = 5 + Math.random() * 10;   // 5–15
        mB.userData.vel = new THREE.Vector3(
            Math.cos(angB) * velHB, velVB, Math.sin(angB) * velHB
        );
        mB.userData.gravidade = 2.0;
        mB.position.y = 1.0;
        grupo.add(mB);
        particulasB.push(mB);
    }

    estado.cena.add(grupo);

    var exp = {
        grupo: grupo,
        flash: flash,
        fogo: fogo,
        ring: ring,
        ringGeo: ringGeo,
        ringMat: ringMat,
        particulasA: particulasA,
        particulasB: particulasB,
        geoA: geoA,
        geoB: geoB,
        idade: 0,
        duracao: 2.0,
        // Trail residual — pisca depois desaparece
        trail: trail || null,
        trailDuracao: 1.5,
        trailOpacOrig: trail && trail.material ? trail.material.opacity : 0,
        trailDone: false
    };
    estado.explosoes.push(exp);
    return exp;
}

function atualizarExplosao(exp, delta) {
    exp.idade += delta;
    var t = exp.idade / exp.duracao;
    if (t >= 1) return false;

    // Flash inicial — decai linearmente para 0 nos primeiros 0.15s
    if (exp.idade < 0.15) {
        exp.flash.intensity = 70 * (1 - exp.idade / 0.15);
    } else if (exp.flash.intensity !== 0) {
        exp.flash.intensity = 0;
    }

    // Luz de fogo persistente — pulso irregular (combina duas frequências)
    var fadeFogo = 1 - t;
    var pulso = 0.7 + 0.3 * Math.sin(exp.idade * 25) * Math.cos(exp.idade * 13.7);
    exp.fogo.intensity = 12 * fadeFogo * pulso;

    // Anel de choque — expande de raio 0.5 a 8 em 0.4s e desaparece em fade
    if (exp.idade < 0.4) {
        var rt = exp.idade / 0.4;
        var raio = 0.5 + (8.0 - 0.5) * rt;
        var s = raio / 0.5; // outerRadius original = 0.5
        exp.ring.scale.set(s, s, 1);
        exp.ringMat.opacity = 1 - rt;
    } else if (exp.ringMat.opacity !== 0) {
        exp.ringMat.opacity = 0;
    }

    // Partículas — fade começa a 50% da duração
    var fade = 1.0;
    if (t > 0.5) fade = 1 - (t - 0.5) / 0.5;
    if (fade < 0) fade = 0;

    for (var i = 0; i < exp.particulasA.length; i++) {
        var pA = exp.particulasA[i];
        pA.position.addScaledVector(pA.userData.vel, delta);
        pA.userData.vel.y -= pA.userData.gravidade * delta;
        if (pA.material) pA.material.opacity = fade;
    }
    for (var k = 0; k < exp.particulasB.length; k++) {
        var pB = exp.particulasB[k];
        pB.position.addScaledVector(pB.userData.vel, delta);
        pB.userData.vel.y -= pB.userData.gravidade * delta;
        if (pB.material) pB.material.opacity = fade;
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
    if (exp.grupo.parent) exp.grupo.parent.remove(exp.grupo);

    for (var i = 0; i < exp.particulasA.length; i++) {
        if (exp.particulasA[i].material) exp.particulasA[i].material.dispose();
    }
    for (var j = 0; j < exp.particulasB.length; j++) {
        if (exp.particulasB[j].material) exp.particulasB[j].material.dispose();
    }
    if (exp.geoA) exp.geoA.dispose();
    if (exp.geoB) exp.geoB.dispose();
    if (exp.ringGeo) exp.ringGeo.dispose();
    if (exp.ringMat) exp.ringMat.dispose();

    // Garante que o trail não fica invisível se a explosão foi destruída a meio do piscar
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
}
