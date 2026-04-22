import * as THREE from 'three';

// --- Estado das teclas (preenchido pelos listeners) ---
var teclas = {};

// --- Referências às motas e respetivos estados físicos ---
var motaJ1 = null;
var motaJ2 = null;
var estadoJ1 = null;
var estadoJ2 = null;

// --- Parâmetros gerais ---
var VELOCIDADE_ROTACAO = 2.5;   // rad/s — viragem fluida
var VELOCIDADE_BASE    = 10;    // unidades/s
var ALTURA_MAX_SALTO   = 3;
var DURACAO_SALTO      = 0.6;   // segundos

// --- Listeners (registados uma única vez) ---
var listenersRegistados = false;

function aoPremir(e) {
    teclas[e.code] = true;

    // Saltos — disparo único no keydown
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && estadoJ1 && !estadoJ1.saltando) {
        estadoJ1.saltando = true;
        estadoJ1.tSalto = 0;
    }
    if (e.code === 'Space' && estadoJ2 && !estadoJ2.saltando) {
        estadoJ2.saltando = true;
        estadoJ2.tSalto = 0;
    }
}

function aoLargar(e) {
    teclas[e.code] = false;
}

function criarEstado(mota) {
    return {
        velocidade: VELOCIDADE_BASE,
        direcao: new THREE.Vector3(Math.sin(mota.rotation.y), 0, Math.cos(mota.rotation.y)),
        saltando: false,
        tSalto: 0,
        alturaBase: mota.position.y,
        alturaMaxSalto: ALTURA_MAX_SALTO,
        duracaoSalto: DURACAO_SALTO
    };
}

export function inicializarInput(mota1, mota2) {
    motaJ1 = mota1;
    motaJ2 = mota2;
    estadoJ1 = criarEstado(mota1);
    estadoJ2 = criarEstado(mota2);

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};

    if (!listenersRegistados) {
        window.addEventListener('keydown', aoPremir);
        window.addEventListener('keyup', aoLargar);
        listenersRegistados = true;
    }
}

function atualizarJogador(mota, estado, teclaEsq, teclaDir, delta) {
    if (!mota || !estado) return;

    // Rotação contínua enquanto a tecla estiver pressionada
    if (teclas[teclaEsq])  mota.rotation.y += VELOCIDADE_ROTACAO * delta;
    if (teclas[teclaDir])  mota.rotation.y -= VELOCIDADE_ROTACAO * delta;

    // Atualizar vetor direção a partir da rotação corrente
    estado.direcao.set(Math.sin(mota.rotation.y), 0, Math.cos(mota.rotation.y));

    // Movimento contínuo para a frente
    mota.position.addScaledVector(estado.direcao, estado.velocidade * delta);

    // Salto parabólico (sin) — mantém altura base ao aterrar
    if (estado.saltando) {
        estado.tSalto += delta;
        mota.position.y = estado.alturaBase +
            estado.alturaMaxSalto * Math.sin(Math.PI * estado.tSalto / estado.duracaoSalto);
        if (estado.tSalto >= estado.duracaoSalto) {
            estado.saltando = false;
            estado.tSalto = 0;
            mota.position.y = estado.alturaBase;
        }
    }
}

export function atualizarMotas(delta) {
    if (!motaJ1 || !motaJ2) return;
    atualizarJogador(motaJ1, estadoJ1, 'ArrowLeft', 'ArrowRight', delta);
    atualizarJogador(motaJ2, estadoJ2, 'KeyA',      'KeyD',       delta);
}
