import * as THREE from 'three';

// --- Estado das teclas (preenchido pelos listeners) ---
var teclas = {};

// --- Referências aos veículos e respetivos estados físicos ---
// Jogador 1 → mota (controlo: setas + Shift)
// Jogador 2 → skate (controlo: WASD + Espaço)
var motaJ1 = null;
var skateJ2 = null;
var estadoJ1 = null;
var estadoJ2 = null;

// --- Parâmetros gerais ---
var VELOCIDADE_ROTACAO = 2.5;   // rad/s — viragem fluida
var VELOCIDADE_BASE    = 10;    // unidades/s
var ALTURA_MAX_SALTO   = 3;
var DURACAO_SALTO      = 0.6;   // segundos
var LIMITE_ARENA       = 20;    // ±ARENA/2 — atualizado por inicializarInput

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

function criarEstado(veiculo) {
    // A frente visual aponta para -Z, pelo que a direção usa sinal negativo
    return {
        velocidade: VELOCIDADE_BASE,
        direcao: new THREE.Vector3(-Math.sin(veiculo.rotation.y), 0, -Math.cos(veiculo.rotation.y)),
        saltando: false,
        tSalto: 0,
        alturaBase: veiculo.position.y,
        alturaMaxSalto: ALTURA_MAX_SALTO,
        duracaoSalto: DURACAO_SALTO
    };
}

export function inicializarInput(mota, skate, arena) {
    motaJ1 = mota;
    skateJ2 = skate;
    if (arena !== undefined) LIMITE_ARENA = arena / 2;
    estadoJ1 = criarEstado(mota);
    estadoJ2 = criarEstado(skate);

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};

    if (!listenersRegistados) {
        window.addEventListener('keydown', aoPremir);
        window.addEventListener('keyup', aoLargar);
        listenersRegistados = true;
    }
}

function atualizarJogador(veiculo, estado, teclaEsq, teclaDir, delta) {
    if (!veiculo || !estado) return;

    // Rotação contínua enquanto a tecla estiver pressionada
    if (teclas[teclaEsq])  veiculo.rotation.y += VELOCIDADE_ROTACAO * delta;
    if (teclas[teclaDir])  veiculo.rotation.y -= VELOCIDADE_ROTACAO * delta;

    // Atualizar vetor direção (alinhado com a frente visual, -Z em espaço local)
    estado.direcao.set(-Math.sin(veiculo.rotation.y), 0, -Math.cos(veiculo.rotation.y));

    // Movimento contínuo para a frente
    veiculo.position.addScaledVector(estado.direcao, estado.velocidade * delta);

    // Limitar à arena — clamp nas paredes (T5 tratará colisão real)
    var margem = 0.5;
    veiculo.position.x = Math.max(-LIMITE_ARENA + margem, Math.min(LIMITE_ARENA - margem, veiculo.position.x));
    veiculo.position.z = Math.max(-LIMITE_ARENA + margem, Math.min(LIMITE_ARENA - margem, veiculo.position.z));

    // Salto parabólico (sin) — mantém altura base ao aterrar
    if (estado.saltando) {
        estado.tSalto += delta;
        veiculo.position.y = estado.alturaBase +
            estado.alturaMaxSalto * Math.sin(Math.PI * estado.tSalto / estado.duracaoSalto);
        if (estado.tSalto >= estado.duracaoSalto) {
            estado.saltando = false;
            estado.tSalto = 0;
            veiculo.position.y = estado.alturaBase;
        }
    }
}

export function atualizarMotas(delta) {
    if (!motaJ1 || !skateJ2) return;
    atualizarJogador(motaJ1,  estadoJ1, 'ArrowLeft', 'ArrowRight', delta);
    atualizarJogador(skateJ2, estadoJ2, 'KeyA',      'KeyD',       delta);
}
