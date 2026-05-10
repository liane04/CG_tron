import * as THREE from 'three';

// --- Estado das teclas (preenchido pelos listeners) ---
var teclas = {};

// --- Teclas sintéticas para a IA ---
// Quando iaAtivaJ1 === true, o jogador 1 (mota) ignora ArrowLeft/ArrowRight
// reais e lê apenas estas flags, escritas pelo módulo ai.js.
var iaAtivaJ1 = false;
var teclasIA_J1 = { esq: false, dir: false };

// --- Referências aos veículos e respetivos estados físicos ---
// Jogador 1 → mota (controlo: setas + Shift  ou  IA)
// Jogador 2 → skate (controlo: WASD + Espaço)
var motaJ1 = null;
var skateJ2 = null;
var estadoJ1 = null;
var estadoJ2 = null;

// --- Pausa por jogador (usado quando o jogador morre durante uma ronda) ---
var pausadoJ1 = false;
var pausadoJ2 = false;

// --- Callback opcional para colisão com paredes ---
// Segundo slot ("trail") reservado para uso futuro: a detecção de colisão
// com trails é feita em gameLogic.js, não aqui.
var aoColidirParedeJ1 = null;
var aoColidirParedeJ2 = null;

// --- Parâmetros gerais ---
var VELOCIDADE_ROTACAO = 2.5;   // rad/s — viragem fluida
var VELOCIDADE_BASE    = 10;    // unidades/s
var ALTURA_MAX_SALTO   = 3;
var DURACAO_SALTO      = 0.6;   // segundos
var LIMITE_ARENA       = 20;    // ±ARENA/2 — atualizado por inicializarInput

// --- Colisão com obstáculos ---
var obstaculos = [];            // Array de THREE.Box3 (AABB em espaço-mundo)
var raioJ1 = 0.8;               // Raio de colisão (XZ) calculado em inicializarInput
var raioJ2 = 0.8;

// --- Listeners (registados uma única vez) ---
var listenersRegistados = false;

function aoPremir(e) {
    teclas[e.code] = true;

    // Saltos — disparo único no keydown
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && estadoJ1 && !estadoJ1.saltando && !pausadoJ1) {
        estadoJ1.saltando = true;
        estadoJ1.tSalto = 0;
    }
    if (e.code === 'Space' && estadoJ2 && !estadoJ2.saltando && !pausadoJ2) {
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

    raioJ1 = calcularRaioColisao(mota);
    raioJ2 = calcularRaioColisao(skate);

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};
    teclasIA_J1.esq = false;
    teclasIA_J1.dir = false;
    pausadoJ1 = false;
    pausadoJ2 = false;

    if (!listenersRegistados) {
        window.addEventListener('keydown', aoPremir);
        window.addEventListener('keyup', aoLargar);
        listenersRegistados = true;
    }
}

function calcularRaioColisao(veiculo) {
    var box = new THREE.Box3().setFromObject(veiculo);
    if (box.isEmpty()) return 0.8;
    var size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.z) * 0.4;
}

export function definirObstaculos(grupoArena) {
    obstaculos = [];
    if (!grupoArena) return;
    grupoArena.updateMatrixWorld(true);

    function coletar(obj) {
        if (obj.userData && obj.userData.isObstacle) {
            var box = new THREE.Box3().setFromObject(obj);
            if (!box.isEmpty()) obstaculos.push(box);
            return;
        }
        for (var i = 0; i < obj.children.length; i++) {
            coletar(obj.children[i]);
        }
    }
    coletar(grupoArena);
}

function colideComObstaculo(posicao, raio) {
    for (var i = 0; i < obstaculos.length; i++) {
        var box = obstaculos[i];
        if (posicao.y > box.max.y || posicao.y + 1.5 < box.min.y) continue;
        var cx = Math.max(box.min.x, Math.min(posicao.x, box.max.x));
        var cz = Math.max(box.min.z, Math.min(posicao.z, box.max.z));
        var dx = posicao.x - cx;
        var dz = posicao.z - cz;
        if (dx * dx + dz * dz < raio * raio) return true;
    }
    return false;
}

function atualizarJogador(veiculo, estado, fonteTeclas, teclaEsq, teclaDir, raio, delta, paredeCb) {
    if (!veiculo || !estado) return;

    if (fonteTeclas[teclaEsq])  veiculo.rotation.y += VELOCIDADE_ROTACAO * delta;
    if (fonteTeclas[teclaDir])  veiculo.rotation.y -= VELOCIDADE_ROTACAO * delta;

    estado.direcao.set(-Math.sin(veiculo.rotation.y), 0, -Math.cos(veiculo.rotation.y));

    var prevX = veiculo.position.x;
    var prevZ = veiculo.position.z;

    veiculo.position.addScaledVector(estado.direcao, estado.velocidade * delta);

    // Limitar à arena (paredes exteriores) — disparar callback se foi clampado
    var margem = 0.5;
    var limiteMax =  LIMITE_ARENA - margem;
    var limiteMin = -LIMITE_ARENA + margem;
    var bateuParede = false;
    if (veiculo.position.x > limiteMax) { veiculo.position.x = limiteMax; bateuParede = true; }
    else if (veiculo.position.x < limiteMin) { veiculo.position.x = limiteMin; bateuParede = true; }
    if (veiculo.position.z > limiteMax) { veiculo.position.z = limiteMax; bateuParede = true; }
    else if (veiculo.position.z < limiteMin) { veiculo.position.z = limiteMin; bateuParede = true; }
    if (bateuParede && paredeCb) paredeCb();

    // Colisão com obstáculos da arena — qualquer contacto é letal.
    // Tenta encostar o veículo ao limite (sliding) antes de disparar a morte
    // para que a posição da explosão seja coerente com o local do impacto.
    if (obstaculos.length > 0 && colideComObstaculo(veiculo.position, raio)) {
        var newX = veiculo.position.x;
        var newZ = veiculo.position.z;
        veiculo.position.x = prevX;
        if (colideComObstaculo(veiculo.position, raio)) {
            veiculo.position.x = newX;
            veiculo.position.z = prevZ;
            if (colideComObstaculo(veiculo.position, raio)) {
                veiculo.position.x = prevX;
                veiculo.position.z = prevZ;
            }
        }
        if (paredeCb) paredeCb();
    }

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

    if (!pausadoJ1) {
        var fonteJ1 = iaAtivaJ1
            ? { ArrowLeft: teclasIA_J1.esq, ArrowRight: teclasIA_J1.dir }
            : teclas;
        atualizarJogador(motaJ1,  estadoJ1, fonteJ1, 'ArrowLeft', 'ArrowRight', raioJ1, delta,
            aoColidirParedeJ1);
    }
    if (!pausadoJ2) {
        atualizarJogador(skateJ2, estadoJ2, teclas, 'KeyA', 'KeyD', raioJ2, delta,
            aoColidirParedeJ2);
    }
}

// ---------------------------------------------------------------
// API extra usada pela lógica de jogo / IA
// ---------------------------------------------------------------

export function definirIAJ1Ativa(ativa) {
    iaAtivaJ1 = !!ativa;
    teclasIA_J1.esq = false;
    teclasIA_J1.dir = false;
}

export function escreverTeclasIA(esq, dir) {
    teclasIA_J1.esq = !!esq;
    teclasIA_J1.dir = !!dir;
}

export function pausarJogador(idx, pausado) {
    if (idx === 1) pausadoJ1 = !!pausado;
    else if (idx === 2) pausadoJ2 = !!pausado;
}

export function pausarTodos(pausado) {
    pausadoJ1 = !!pausado;
    pausadoJ2 = !!pausado;
}

// (jogadorId, cbParede, cbTrail) — cbTrail está reservado para uso futuro;
// a colisão com trails é detectada em gameLogic.js. Por agora só cbParede é usado.
export function definirCallbackColisao(idx, paredeCb, _trailCbReservado) {
    if (idx === 1) {
        aoColidirParedeJ1 = paredeCb || null;
    } else if (idx === 2) {
        aoColidirParedeJ2 = paredeCb || null;
    }
}

export function reposicionarJogador(idx, x, z, rotY) {
    var v = (idx === 1) ? motaJ1 : (idx === 2 ? skateJ2 : null);
    var st = (idx === 1) ? estadoJ1 : (idx === 2 ? estadoJ2 : null);
    if (!v || !st) return;
    v.position.x = x;
    v.position.z = z;
    v.position.y = st.alturaBase;
    v.rotation.y = rotY;
    st.direcao.set(-Math.sin(rotY), 0, -Math.cos(rotY));
    st.saltando = false;
    st.tSalto = 0;
}

export function obterLimiteArena() { return LIMITE_ARENA; }
export function obterMotaJ1() { return motaJ1; }
export function obterSkateJ2() { return skateJ2; }
export function obterRotacaoJ1() { return motaJ1 ? motaJ1.rotation.y : 0; }
