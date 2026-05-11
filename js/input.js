import * as THREE from 'three';

// --- Estado das teclas (preenchido pelos listeners) ---
var teclas = {};

// --- Teclas sintéticas para a IA ---
// Quando iaAtiva === true, o jogador ignora as teclas reais e lê apenas as flags.
var iaAtivaJ1 = false;
var iaAtivaJ2 = false;
var teclasIA_J1 = { esq: false, dir: false };
var teclasIA_J2 = { esq: false, dir: false };

// --- Referências aos veículos e respetivos estados físicos ---
// Jogador 1 → mota (controlo: setas + Shift  ou  IA)
// Jogador 2 → skate (controlo: WASD + Espaço  ou  IA)
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
var VELOCIDADE_BASE = 10;    // unidades/s
var ALTURA_MAX_SALTO = 3;
var DURACAO_SALTO = 0.6;   // segundos
var LIMITE_ARENA = 20;    // ±ARENA/2 — atualizado por inicializarInput

// --- Colisão com obstáculos ---
var obstaculos = [];            // Array de THREE.Box3 (AABB em espaço-mundo)

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

    var dim1 = calcularDimensoes(mota);
    estadoJ1.hw = dim1.hw;
    estadoJ1.hl = dim1.hl;

    var dim2 = calcularDimensoes(skate);
    estadoJ2.hw = dim2.hw;
    estadoJ2.hl = dim2.hl;

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};
    teclasIA_J1.esq = false;
    teclasIA_J1.dir = false;
    teclasIA_J2.esq = false;
    teclasIA_J2.dir = false;
    pausadoJ1 = false;
    pausadoJ2 = false;

    if (!listenersRegistados) {
        window.addEventListener('keydown', aoPremir);
        window.addEventListener('keyup', aoLargar);
        listenersRegistados = true;
    }
}

function calcularDimensoes(veiculo) {
    // Guardar rotação original
    var rotY = veiculo.rotation.y;
    // Colocar a 0 para obter o tamanho local exato em X (largura) e Z (comprimento)
    veiculo.rotation.y = 0;
    veiculo.updateMatrixWorld(true);

    var box = new THREE.Box3().setFromObject(veiculo);
    var size = new THREE.Vector3();
    if (!box.isEmpty()) box.getSize(size);
    else size.set(1.6, 1.6, 3.2); // Fallback

    // Restaurar rotação original
    veiculo.rotation.y = rotY;
    veiculo.updateMatrixWorld(true);

    // Retorna as metades das dimensões (half-widths) para o cálculo OBB
    // Usamos 0.45 (90% de metade) para dar uma minúscula tolerância e evitar encravar em paredes
    return { hw: size.x * 0.45, hl: size.z * 0.45 };
}

export function definirObstaculos(grupoArena) {
    obstaculos = [];
    if (!grupoArena) return;
    grupoArena.updateMatrixWorld(true);

    function coletar(obj) {
        if (obj.userData && obj.userData.isObstacle) {
            var box = new THREE.Box3().setFromObject(obj);
            if (!box.isEmpty()) {
                // Se for um Mesh de hitbox (como criámos no deserto), 
                // usamos a sua própria AABB para simplificar.
                obstaculos.push(box);
            }
            return;
        }
        for (var i = 0; i < obj.children.length; i++) {
            coletar(obj.children[i]);
        }
    }
    coletar(grupoArena);
}

/**
 * Verifica colisão OBB (veículo) vs AABB (obstáculo) usando SAT simplificado.
 */
function colideComObstaculo(veiculo, hw, hl) {
    var pos = veiculo.position;
    var rot = veiculo.rotation.y;

    // Eixos locais do veículo (direções X e Z no mundo)
    var ax = Math.cos(rot);
    var az = Math.sin(rot);

    for (var i = 0; i < obstaculos.length; i++) {
        var box = obstaculos[i];
        
        // Check rápido de altura
        if (pos.y > box.max.y || pos.y + 1.2 < box.min.y) continue;

        // Centro do obstáculo e meia-extensão (AABB)
        var ox = (box.min.x + box.max.x) / 2;
        var oz = (box.min.z + box.max.z) / 2;
        var ohw = (box.max.x - box.min.x) / 2;
        var ohl = (box.max.z - box.min.z) / 2;

        // Vetor centro a centro
        var dx = pos.x - ox;
        var dz = pos.z - oz;

        // SAT: Testar nos eixos do obstáculo (Mundo X e Z)
        // Eixo X
        var projL = hw * Math.abs(ax) + hl * Math.abs(az);
        if (Math.abs(dx) > ohw + projL) continue;
        
        // Eixo Z
        var projLz = hw * Math.abs(az) + hl * Math.abs(ax);
        if (Math.abs(dz) > ohl + projLz) continue;

        // SAT: Testar nos eixos do veículo
        // Eixo Forward (Z local)
        var s = -Math.sin(rot), c = -Math.cos(rot);
        var distF = Math.abs(dx * s + dz * c);
        var projO = ohw * Math.abs(s) + ohl * Math.abs(c);
        if (distF > hl + projO) continue;

        // Eixo Side (X local)
        var sx = Math.cos(rot), sz = -Math.sin(rot);
        var distS = Math.abs(dx * sx + dz * sz);
        var projOs = ohw * Math.abs(sx) + ohl * Math.abs(sz);
        if (distS > hw + projOs) continue;

        return true;
    }
    return false;
}

function atualizarJogador(veiculo, estado, fonteTeclas, teclaEsq, teclaDir, hw, hl, delta, paredeCb) {
    if (!veiculo || !estado) return;

    if (fonteTeclas[teclaEsq]) veiculo.rotation.y += VELOCIDADE_ROTACAO * delta;
    if (fonteTeclas[teclaDir]) veiculo.rotation.y -= VELOCIDADE_ROTACAO * delta;

    estado.direcao.set(-Math.sin(veiculo.rotation.y), 0, -Math.cos(veiculo.rotation.y));

    var prevX = veiculo.position.x;
    var prevZ = veiculo.position.z;

    veiculo.position.addScaledVector(estado.direcao, estado.velocidade * delta);

    // Limitar à arena (paredes exteriores) — disparar callback se foi clampado
    var margem = 0.5;
    var limiteMax = LIMITE_ARENA - margem;
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
    if (obstaculos.length > 0 && colideComObstaculo(veiculo, hw, hl)) {
        var newX = veiculo.position.x;
        var newZ = veiculo.position.z;
        veiculo.position.x = prevX;
        if (colideComObstaculo(veiculo, hw, hl)) {
            veiculo.position.x = newX;
            veiculo.position.z = prevZ;
            if (colideComObstaculo(veiculo, hw, hl)) {
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
        atualizarJogador(motaJ1, estadoJ1, fonteJ1, 'ArrowLeft', 'ArrowRight', estadoJ1.hw, estadoJ1.hl, delta,
            aoColidirParedeJ1);
    }
    if (!pausadoJ2) {
        var fonteJ2 = iaAtivaJ2
            ? { KeyA: teclasIA_J2.esq, KeyD: teclasIA_J2.dir }
            : teclas;
        atualizarJogador(skateJ2, estadoJ2, fonteJ2, 'KeyA', 'KeyD', estadoJ2.hw, estadoJ2.hl, delta,
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

export function definirIAJ2Ativa(ativa) {
    iaAtivaJ2 = !!ativa;
    teclasIA_J2.esq = false;
    teclasIA_J2.dir = false;
}

export function escreverTeclasIA(esq, dir) {
    if (iaAtivaJ1) {
        teclasIA_J1.esq = !!esq;
        teclasIA_J1.dir = !!dir;
    }
    if (iaAtivaJ2) {
        teclasIA_J2.esq = !!esq;
        teclasIA_J2.dir = !!dir;
    }
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
