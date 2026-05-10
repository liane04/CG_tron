import * as THREE from 'three';
import { obterSegmentos } from './trail.js';
import { escreverTeclasIA } from './input.js';

// IA simples para a mota (jogador 1).
// Decide a cada frame se vira para esquerda, direita ou segue em frente,
// escrevendo flags em input.js (escreverTeclasIA). Não duplica a física.

const COMP_RAIO         = 4.0;   // comprimento dos raios virtuais
const ANG_LATERAL       = 30 * Math.PI / 180;
const RAIO_AMOSTRAS     = 5;     // pontos amostrados por raio
const DIST_BLOQUEIO_TR  = 1.0;   // distância mínima a um segmento de trail
const ZONA_SEGURANCA    = 15;    // segmentos finais do próprio trail ignorados
const PROB_VIRAGEM_BASE = 0.05;  // 5% por frame
const VIRAGEM_DURACAO   = 0.5;
const DIST_PAREDE       = 6.0;

const estado = {
    mota: null,
    trailMota: null,
    trailSkate: null,
    limite: 35,
    viragemAtiva: 0,   // -1, 0, +1
    viragemTimer: 0
};

export function inicializarIA(mota, trailMota, trailSkate, limiteArena) {
    estado.mota = mota;
    estado.trailMota = trailMota;
    estado.trailSkate = trailSkate;
    estado.limite = limiteArena;
    estado.viragemAtiva = 0;
    estado.viragemTimer = 0;
}

export function atualizarIA(delta) {
    if (!estado.mota) return;

    var pos = estado.mota.position;
    var rotY = estado.mota.rotation.y;
    var dirFx = -Math.sin(rotY);
    var dirFz = -Math.cos(rotY);

    // Direcções dos 3 raios
    var aL = rotY + ANG_LATERAL;
    var aR = rotY - ANG_LATERAL;
    var dirLx = -Math.sin(aL), dirLz = -Math.cos(aL);
    var dirRx = -Math.sin(aR), dirRz = -Math.cos(aR);

    var bloqFrente   = raioBloqueado(pos, dirFx, dirFz);
    var bloqEsquerda = raioBloqueado(pos, dirLx, dirLz);
    var bloqDireita  = raioBloqueado(pos, dirRx, dirRz);

    var virarEsq = false, virarDir = false;

    // Prioridade 3: Recuperação de canto — se demasiado perto de uma parede
    // e a apontar para ela, força viragem para o interior.
    var apontaParede = aponteParaParede(pos, dirFx, dirFz);
    if (apontaParede.perto && apontaParede.aponta) {
        // Vira no sentido que afasta da parede
        if (apontaParede.virar === 'esq') virarEsq = true;
        else virarDir = true;
        // anula viragem aleatória em curso
        estado.viragemAtiva = 0;
        estado.viragemTimer = 0;
    }
    // Prioridade 1: Evitar colisão iminente
    else if (bloqFrente) {
        if (!bloqEsquerda && bloqDireita) virarEsq = true;
        else if (!bloqDireita && bloqEsquerda) virarDir = true;
        else if (!bloqEsquerda && !bloqDireita) {
            // Ambos lados livres — escolhe um pseudo-aleatoriamente coerente
            virarEsq = (Math.floor(performance.now() * 0.001) % 2) === 0;
            virarDir = !virarEsq;
        } else {
            // Tudo bloqueado — vira para o lado com maior espaço (heurística)
            virarEsq = true;
        }
        estado.viragemAtiva = 0;
        estado.viragemTimer = 0;
    }
    // Prioridade 2: viragem aleatória orgânica
    else {
        if (estado.viragemTimer > 0) {
            estado.viragemTimer -= delta;
            if (estado.viragemAtiva > 0) virarEsq = true;
            else if (estado.viragemAtiva < 0) virarDir = true;
            if (estado.viragemTimer <= 0) {
                estado.viragemAtiva = 0;
            }
        } else if (Math.random() < PROB_VIRAGEM_BASE) {
            estado.viragemAtiva = (Math.random() < 0.5) ? -1 : 1;
            estado.viragemTimer = VIRAGEM_DURACAO * (0.5 + Math.random() * 0.8);
            if (estado.viragemAtiva > 0) virarEsq = true;
            else virarDir = true;
        }
    }

    escreverTeclasIA(virarEsq, virarDir);
}

function raioBloqueado(pos, dx, dz) {
    var lim = estado.limite - 1.0;
    // Endpoint fora da arena → bloqueado
    var ex = pos.x + dx * COMP_RAIO;
    var ez = pos.z + dz * COMP_RAIO;
    if (ex >  lim || ex < -lim || ez > lim || ez < -lim) return true;

    // Amostragem ao longo do raio para detectar segmentos de trail
    var lim2 = DIST_BLOQUEIO_TR * DIST_BLOQUEIO_TR;
    for (var s = 1; s <= RAIO_AMOSTRAS; s++) {
        var t = (s / RAIO_AMOSTRAS) * COMP_RAIO;
        var sx = pos.x + dx * t;
        var sz = pos.z + dz * t;
        if (segmentoProximo(estado.trailMota, sx, sz, lim2, true)) return true;
        if (segmentoProximo(estado.trailSkate, sx, sz, lim2, false)) return true;
    }
    return false;
}

function segmentoProximo(trail, x, z, thr2, ehProprio) {
    if (!trail) return false;
    var segs = obterSegmentos(trail);
    var n = segs.length;
    var max = ehProprio ? Math.max(0, n - ZONA_SEGURANCA) : n;
    for (var i = 0; i < max; i++) {
        var s = segs[i];
        var ddx = s.x - x, ddz = s.z - z;
        if (ddx * ddx + ddz * ddz < thr2) return true;
    }
    return false;
}

function aponteParaParede(pos, dfx, dfz) {
    var lim = estado.limite;
    var perto = false;
    var aponta = false;
    var virar = 'esq';

    // X+
    if (lim - pos.x < DIST_PAREDE) {
        perto = true;
        if (dfx > 0.3) { aponta = true; virar = (dfz > 0) ? 'esq' : 'dir'; }
    }
    if (pos.x - (-lim) < DIST_PAREDE) {
        perto = true;
        if (dfx < -0.3) { aponta = true; virar = (dfz > 0) ? 'dir' : 'esq'; }
    }
    if (lim - pos.z < DIST_PAREDE) {
        perto = true;
        if (dfz > 0.3) { aponta = true; virar = (dfx > 0) ? 'dir' : 'esq'; }
    }
    if (pos.z - (-lim) < DIST_PAREDE) {
        perto = true;
        if (dfz < -0.3) { aponta = true; virar = (dfx > 0) ? 'esq' : 'dir'; }
    }
    return { perto: perto, aponta: aponta, virar: virar };
}
