import * as THREE from 'three';
import { obterSegmentos } from './trail.js';
import { escreverTeclasIA } from './input.js';

// IA simples para a mota (jogador 1).
// Decide a cada frame se vira para esquerda, direita ou segue em frente,
// escrevendo flags em input.js (escreverTeclasIA). Não duplica a física.

// --- Constantes invariantes (não dependem da dificuldade) ---
const ANG_LATERAL       = 30 * Math.PI / 180;
const ANG_DIAGONAL      = Math.PI / 12;     // 15° — raios para detectar "caixas"
const RAIO_AMOSTRAS     = 5;                // pontos amostrados por raio
const DIST_BLOQUEIO_TR  = 1.0;              // distância mínima a um segmento de trail
const ZONA_SEGURANCA    = 15;               // segmentos finais do próprio trail ignorados
const VIRAGEM_DURACAO   = 0.5;
const DIST_PAREDE       = 6.0;
const VELOCIDADE_REF    = 10;               // VELOCIDADE_BASE de input.js (fallback)

// Heurística de espaço livre
const PASSO_HEURISTICA  = 1.0;
const MAX_PASSOS_HEUR   = 20;
const VANTAGEM_MIN_HEUR = 3;

// Agressividade
const MIN_PASSOS_AGRESS = 8;
const THROTTLE_AGRESS   = 0.5;
const PESO_ESPACO_PJ    = 0.4;

// --- Presets de dificuldade ---
const DIFICULDADES = {
    easy:   { compRaio: 2.5, probViragemBase: 0.15, usarHeuristica: false, usarAgressividade: false, comprimentoAdaptativo: false },
    medium: { compRaio: 4.0, probViragemBase: 0.05, usarHeuristica: true,  usarAgressividade: false, comprimentoAdaptativo: true  },
    hard:   { compRaio: 6.0, probViragemBase: 0.02, usarHeuristica: true,  usarAgressividade: true,  comprimentoAdaptativo: true  }
};

// Valores actuais (mutados por definirDificuldadeIA)
var compRaio              = 4.0;
var probViragemBase       = 0.05;
var usarHeuristica        = true;
var usarAgressividade     = false;
var comprimentoAdaptativo = true;
var dificuldadeActual     = 'medium';

const estado = {
    mota: null,
    trailMota: null,
    trailSkate: null,
    limite: 35,
    viragemAtiva: 0,   // -1, 0, +1
    viragemTimer: 0,
    // Throttle da estimativa global de espaço do jogador (cache)
    tempoUltCalcJogador: 0,
    espacoJogadorCache: MAX_PASSOS_HEUR
};

// Throttle global da IA — corre a 30Hz em vez de 60Hz. Cada raioBloqueado faz
// ~15k verificações de distância em medium, ~50k em hard; a 30Hz é metade.
// A IA decide em janelas de 0.5s portanto não há perda de comportamento.
var _aiAcumulador = 0;
const AI_PERIODO = 1 / 30;

export function definirDificuldadeIA(nivel) {
    var preset = DIFICULDADES[nivel];
    if (!preset) return false;
    dificuldadeActual     = nivel;
    compRaio              = preset.compRaio;
    probViragemBase       = preset.probViragemBase;
    usarHeuristica        = preset.usarHeuristica;
    usarAgressividade     = preset.usarAgressividade;
    comprimentoAdaptativo = preset.comprimentoAdaptativo;
    return true;
}

export function obterDificuldadeIA() {
    return dificuldadeActual;
}

export function inicializarIA(mota, trailMota, trailSkate, limiteArena, dificuldade) {
    estado.mota = mota;
    estado.trailMota = trailMota;
    estado.trailSkate = trailSkate;
    estado.limite = limiteArena;
    estado.viragemAtiva = 0;
    estado.viragemTimer = 0;
    estado.tempoUltCalcJogador = 0;
    estado.espacoJogadorCache = MAX_PASSOS_HEUR;
    _aiAcumulador = 0;
    definirDificuldadeIA(dificuldade || 'medium');
}

export function atualizarIA(delta) {
    if (!estado.mota) return;
    _aiAcumulador += delta;
    if (_aiAcumulador < AI_PERIODO) return;
    // Usa o delta acumulado para os timers internos (viragemTimer, throttle do
    // cálculo de espaço do jogador) progredirem em tempo real, não em ticks.
    delta = _aiAcumulador;
    _aiAcumulador = 0;

    var pos = estado.mota.position;
    var rotY = estado.mota.rotation.y;
    var dirFx = -Math.sin(rotY);
    var dirFz = -Math.cos(rotY);

    // (1) Comprimento adaptativo dos raios
    var velActual = (estado.mota.userData && estado.mota.userData.velocidade) || VELOCIDADE_REF;
    var comprimentoEfectivo = comprimentoAdaptativo
        ? compRaio + velActual * 0.3
        : compRaio;

    // Direcções dos 3 raios principais
    var aL = rotY + ANG_LATERAL;
    var aR = rotY - ANG_LATERAL;
    var dirLx = -Math.sin(aL), dirLz = -Math.cos(aL);
    var dirRx = -Math.sin(aR), dirRz = -Math.cos(aR);

    // Direcções dos 2 raios diagonais (±15°) para detectar fechamento
    var aDL = rotY + ANG_DIAGONAL;
    var aDR = rotY - ANG_DIAGONAL;
    var dirDLx = -Math.sin(aDL), dirDLz = -Math.cos(aDL);
    var dirDRx = -Math.sin(aDR), dirDRz = -Math.cos(aDR);

    var bloqFrente   = raioBloqueado(pos, dirFx, dirFz, comprimentoEfectivo);
    var bloqEsquerda = raioBloqueado(pos, dirLx, dirLz, comprimentoEfectivo);
    var bloqDireita  = raioBloqueado(pos, dirRx, dirRz, comprimentoEfectivo);

    // Diagonais estreitos: combinados com o lateral indicam "caixa" a fechar
    var bloqDiagEsq = raioBloqueado(pos, dirDLx, dirDLz, comprimentoEfectivo);
    var bloqDiagDir = raioBloqueado(pos, dirDRx, dirDRz, comprimentoEfectivo);
    var semiBloqEsq = bloqDiagEsq && bloqEsquerda;
    var semiBloqDir = bloqDiagDir && bloqDireita;

    // (4) Throttle de cálculo global do espaço do jogador (apenas Hard)
    estado.tempoUltCalcJogador += delta;
    if (usarAgressividade && estado.tempoUltCalcJogador >= THROTTLE_AGRESS) {
        estado.espacoJogadorCache = estimarEspacoJogador();
        estado.tempoUltCalcJogador = 0;
    }

    var virarEsq = false, virarDir = false;
    var jaDecidido = false;

    // Prioridade 3: Recuperação de canto — perto duma parede e a apontar para ela
    var apontaParede = aponteParaParede(pos, dirFx, dirFz);
    if (apontaParede.perto && apontaParede.aponta) {
        if (apontaParede.virar === 'esq') virarEsq = true;
        else virarDir = true;
        estado.viragemAtiva = 0;
        estado.viragemTimer = 0;
        jaDecidido = true;
    }
    // Prioridade 1: Evitar colisão iminente
    else if (bloqFrente) {
        if (!bloqEsquerda && bloqDireita) virarEsq = true;
        else if (!bloqDireita && bloqEsquerda) virarDir = true;
        else if (!bloqEsquerda && !bloqDireita) {
            // Ambos lados livres — semi-bloqueios desempatam
            if (semiBloqEsq && !semiBloqDir) virarDir = true;
            else if (semiBloqDir && !semiBloqEsq) virarEsq = true;
            else {
                virarEsq = (Math.floor(performance.now() * 0.001) % 2) === 0;
                virarDir = !virarEsq;
            }
        } else {
            virarEsq = true;
        }
        estado.viragemAtiva = 0;
        estado.viragemTimer = 0;
        jaDecidido = true;
    }
    // Prioridade 2: não há ameaça imediata — heurística / agressividade / aleatório
    else {
        var espacoF = -1;

        // (4) Modo agressivo (Hard) — tenta encurralar o jogador
        if (usarAgressividade) {
            espacoF = estimarEspacoLivre(pos.x, pos.z, dirFx, dirFz);
            if (espacoF >= MIN_PASSOS_AGRESS) {
                var pj = obterPosJogador();
                if (pj) {
                    var espE = bloqEsquerda ? -999 : estimarEspacoLivre(pos.x, pos.z, dirLx, dirLz);
                    var espD = bloqDireita  ? -999 : estimarEspacoLivre(pos.x, pos.z, dirRx, dirRz);

                    var espJF = estimarEspacoLivre(pj.x, pj.z, dirFx, dirFz);
                    var espJE = estimarEspacoLivre(pj.x, pj.z, dirLx, dirLz);
                    var espJD = estimarEspacoLivre(pj.x, pj.z, dirRx, dirRz);

                    var pontF = espacoF - PESO_ESPACO_PJ * espJF;
                    var pontE = espE    - PESO_ESPACO_PJ * espJE;
                    var pontD = espD    - PESO_ESPACO_PJ * espJD;
                    if (semiBloqEsq) pontE *= 0.5;
                    if (semiBloqDir) pontD *= 0.5;

                    var melhor = 'F', melhorPont = pontF;
                    if (pontE > melhorPont) { melhor = 'E'; melhorPont = pontE; }
                    if (pontD > melhorPont) { melhor = 'D'; melhorPont = pontD; }

                    if (melhor === 'E') {
                        virarEsq = true; jaDecidido = true;
                        estado.viragemAtiva = 0; estado.viragemTimer = 0;
                    } else if (melhor === 'D') {
                        virarDir = true; jaDecidido = true;
                        estado.viragemAtiva = 0; estado.viragemTimer = 0;
                    }
                }
            }
        }

        // (2) Heurística de espaço livre (medium+)
        if (!jaDecidido && usarHeuristica) {
            if (espacoF < 0) espacoF = estimarEspacoLivre(pos.x, pos.z, dirFx, dirFz);
            var espE2 = bloqEsquerda ? 0 : estimarEspacoLivre(pos.x, pos.z, dirLx, dirLz);
            var espD2 = bloqDireita  ? 0 : estimarEspacoLivre(pos.x, pos.z, dirRx, dirRz);

            var preferEsq = (espE2 - espacoF > VANTAGEM_MIN_HEUR) && (espE2 >= espD2) && !semiBloqEsq;
            var preferDir = (espD2 - espacoF > VANTAGEM_MIN_HEUR) && (espD2 > espE2)  && !semiBloqDir;

            if (preferEsq) {
                virarEsq = true; jaDecidido = true;
                estado.viragemAtiva = 0; estado.viragemTimer = 0;
            } else if (preferDir) {
                virarDir = true; jaDecidido = true;
                estado.viragemAtiva = 0; estado.viragemTimer = 0;
            }
        }

        // Fallback: viragem aleatória orgânica
        if (!jaDecidido) {
            if (estado.viragemTimer > 0) {
                estado.viragemTimer -= delta;
                if (estado.viragemAtiva > 0) virarEsq = true;
                else if (estado.viragemAtiva < 0) virarDir = true;
                if (estado.viragemTimer <= 0) {
                    estado.viragemAtiva = 0;
                }
            } else if (Math.random() < probViragemBase) {
                var lado = (Math.random() < 0.5) ? -1 : 1;
                // (1) Semi-bloqueio reduz prob. de virar para esse lado em 50%
                if (lado > 0 && semiBloqEsq && Math.random() < 0.5) lado = -1;
                else if (lado < 0 && semiBloqDir && Math.random() < 0.5) lado = +1;

                estado.viragemAtiva = lado;
                estado.viragemTimer = VIRAGEM_DURACAO * (0.5 + Math.random() * 0.8);
                if (estado.viragemAtiva > 0) virarEsq = true;
                else virarDir = true;
            }
        }
    }

    escreverTeclasIA(virarEsq, virarDir);
}

// (1) Raios adaptativos — comprimento opcional
function raioBloqueado(pos, dx, dz, comprimento) {
    var c = (comprimento === undefined) ? compRaio : comprimento;
    var lim = estado.limite - 1.0;
    var ex = pos.x + dx * c;
    var ez = pos.z + dz * c;
    if (ex >  lim || ex < -lim || ez > lim || ez < -lim) return true;

    var lim2 = DIST_BLOQUEIO_TR * DIST_BLOQUEIO_TR;
    for (var s = 1; s <= RAIO_AMOSTRAS; s++) {
        var t = (s / RAIO_AMOSTRAS) * c;
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

// (2) Avança em passos de 1 unidade até bater em parede/trail; devolve nº de passos livres (0–20)
function estimarEspacoLivre(origemX, origemZ, dx, dz) {
    var lim = estado.limite - 1.0;
    var lim2 = DIST_BLOQUEIO_TR * DIST_BLOQUEIO_TR;
    for (var p = 1; p <= MAX_PASSOS_HEUR; p++) {
        var x = origemX + dx * p * PASSO_HEURISTICA;
        var z = origemZ + dz * p * PASSO_HEURISTICA;
        if (x > lim || x < -lim || z > lim || z < -lim) return p - 1;
        if (segmentoProximo(estado.trailMota, x, z, lim2, true)) return p - 1;
        if (segmentoProximo(estado.trailSkate, x, z, lim2, true)) return p - 1;
    }
    return MAX_PASSOS_HEUR;
}

// O último segmento do trail do adversário aproxima a posição actual do jogador
function obterPosJogador() {
    if (!estado.trailSkate) return null;
    var segs = obterSegmentos(estado.trailSkate);
    if (!segs || segs.length === 0) return null;
    return segs[segs.length - 1];
}

// (4) Espaço mínimo do jogador nas 4 direcções cardeais — métrica de "encurralamento"
function estimarEspacoJogador() {
    var pj = obterPosJogador();
    if (!pj) return MAX_PASSOS_HEUR;
    var dirs = [
        { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
        { dx: 0, dz: 1 }, { dx: 0, dz: -1 }
    ];
    var minEsp = MAX_PASSOS_HEUR;
    for (var i = 0; i < dirs.length; i++) {
        var e = estimarEspacoLivre(pj.x, pj.z, dirs[i].dx, dirs[i].dz);
        if (e < minEsp) minEsp = e;
    }
    return minEsp;
}
