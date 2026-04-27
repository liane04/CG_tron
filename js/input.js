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

// --- Colisão com obstáculos ---
var obstaculos = [];            // Array de THREE.Box3 (AABB em espaço-mundo)
var raioJ1 = 0.8;               // Raio de colisão (XZ) calculado em inicializarInput
var raioJ2 = 0.8;

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

    // Calcular raio de colisão a partir das dimensões reais do veículo
    raioJ1 = calcularRaioColisao(mota);
    raioJ2 = calcularRaioColisao(skate);

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};

    if (!listenersRegistados) {
        window.addEventListener('keydown', aoPremir);
        window.addEventListener('keyup', aoLargar);
        listenersRegistados = true;
    }
}

function calcularRaioColisao(veiculo) {
    // Raio aproximado no plano XZ. Usar 0.4× o lado maior dá uma colisão
    // ligeiramente mais permissiva do que a AABB visual, evitando que o
    // veículo encrave contra cantos enquanto vira.
    var box = new THREE.Box3().setFromObject(veiculo);
    if (box.isEmpty()) return 0.8;
    var size = new THREE.Vector3();
    box.getSize(size);
    return Math.max(size.x, size.z) * 0.4;
}

// Recolhe AABBs em espaço-mundo de todos os objetos marcados como obstáculo.
// Deve ser chamada após criar a arena e os seus objetos decorativos.
export function definirObstaculos(grupoArena) {
    obstaculos = [];
    if (!grupoArena) return;
    grupoArena.updateMatrixWorld(true);

    function coletar(obj) {
        if (obj.userData && obj.userData.isObstacle) {
            var box = new THREE.Box3().setFromObject(obj);
            if (!box.isEmpty()) obstaculos.push(box);
            return; // não descer na subárvore — a caixa do pai já a cobre
        }
        for (var i = 0; i < obj.children.length; i++) {
            coletar(obj.children[i]);
        }
    }
    coletar(grupoArena);
}

// Testa colisão círculo-vs-AABB no plano XZ.
function colideComObstaculo(posicao, raio) {
    for (var i = 0; i < obstaculos.length; i++) {
        var box = obstaculos[i];
        // Sobreposição vertical — permite saltar sobre obstáculos baixos
        if (posicao.y > box.max.y || posicao.y + 1.5 < box.min.y) continue;
        // Ponto da caixa mais próximo do veículo (no plano XZ)
        var cx = Math.max(box.min.x, Math.min(posicao.x, box.max.x));
        var cz = Math.max(box.min.z, Math.min(posicao.z, box.max.z));
        var dx = posicao.x - cx;
        var dz = posicao.z - cz;
        if (dx * dx + dz * dz < raio * raio) return true;
    }
    return false;
}

function atualizarJogador(veiculo, estado, teclaEsq, teclaDir, raio, delta) {
    if (!veiculo || !estado) return;

    // Rotação contínua enquanto a tecla estiver pressionada
    if (teclas[teclaEsq])  veiculo.rotation.y += VELOCIDADE_ROTACAO * delta;
    if (teclas[teclaDir])  veiculo.rotation.y -= VELOCIDADE_ROTACAO * delta;

    // Atualizar vetor direção (alinhado com a frente visual, -Z em espaço local)
    estado.direcao.set(-Math.sin(veiculo.rotation.y), 0, -Math.cos(veiculo.rotation.y));

    // Posição antes do movimento — necessária para resolver colisão com sliding
    var prevX = veiculo.position.x;
    var prevZ = veiculo.position.z;

    // Movimento contínuo para a frente
    veiculo.position.addScaledVector(estado.direcao, estado.velocidade * delta);

    // Limitar à arena (paredes exteriores)
    var margem = 0.5;
    veiculo.position.x = Math.max(-LIMITE_ARENA + margem, Math.min(LIMITE_ARENA - margem, veiculo.position.x));
    veiculo.position.z = Math.max(-LIMITE_ARENA + margem, Math.min(LIMITE_ARENA - margem, veiculo.position.z));

    // Colisão com obstáculos da arena — tenta deslizar mantendo o eixo livre
    if (obstaculos.length > 0 && colideComObstaculo(veiculo.position, raio)) {
        var newX = veiculo.position.x;
        var newZ = veiculo.position.z;

        // 1) Reverter X (mantém movimento em Z — desliza ao longo de paredes verticais)
        veiculo.position.x = prevX;
        if (colideComObstaculo(veiculo.position, raio)) {
            // 2) Reverter Z (mantém movimento em X — desliza ao longo de paredes horizontais)
            veiculo.position.x = newX;
            veiculo.position.z = prevZ;
            if (colideComObstaculo(veiculo.position, raio)) {
                // 3) Sem saída lateral — bloquear completamente
                veiculo.position.x = prevX;
                veiculo.position.z = prevZ;
            }
        }
    }

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
    atualizarJogador(motaJ1,  estadoJ1, 'ArrowLeft', 'ArrowRight', raioJ1, delta);
    atualizarJogador(skateJ2, estadoJ2, 'KeyA',      'KeyD',       raioJ2, delta);
}
