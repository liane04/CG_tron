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

    // Calcular dimensões exatas de colisão (AABB -> OBB)
    var dim1 = calcularDimensoes(mota);
    estadoJ1.hw = dim1.hw;
    estadoJ1.hl = dim1.hl;

    var dim2 = calcularDimensoes(skate);
    estadoJ2.hw = dim2.hw;
    estadoJ2.hl = dim2.hl;

    // Limpar estado de teclas — evita heranças de sessões anteriores
    teclas = {};

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
    
    // Usa 0.45 (90% de metade) para dar uma minúscula tolerância e evitar encravar em paredes
    return { hw: size.x * 0.45, hl: size.z * 0.45 };
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

// Testa colisão OBB (veículo) vs AABB (obstáculos) usando o Separating Axis Theorem (SAT)
function colideComObstaculo(posicao, estado, angulo) {
    var cx = posicao.x;
    var cz = posicao.z;
    var hw = estado.hw;
    var hl = estado.hl;
    var cos = Math.cos(angulo);
    var sin = Math.sin(angulo);

    for (var i = 0; i < obstaculos.length; i++) {
        var box = obstaculos[i];
        // Sobreposição vertical
        if (posicao.y > box.max.y || posicao.y + 1.5 < box.min.y) continue;

        var bcx = (box.min.x + box.max.x) / 2;
        var bcz = (box.min.z + box.max.z) / 2;
        var bhw = (box.max.x - box.min.x) / 2;
        var bhl = (box.max.z - box.min.z) / 2;

        var dx = cx - bcx;
        var dz = cz - bcz;

        // Eixo 1: X global
        var projOBB_X = hw * Math.abs(cos) + hl * Math.abs(sin);
        if (Math.abs(dx) > bhw + projOBB_X) continue;

        // Eixo 2: Z global
        var projOBB_Z = hw * Math.abs(sin) + hl * Math.abs(cos);
        if (Math.abs(dz) > bhl + projOBB_Z) continue;

        // Eixo 3: X local do veículo
        var dist_LX = Math.abs(dx * cos - dz * sin);
        var projAABB_LX = bhw * Math.abs(cos) + bhl * Math.abs(sin);
        if (dist_LX > hw + projAABB_LX) continue;

        // Eixo 4: Z local do veículo
        var dist_LZ = Math.abs(dx * sin + dz * cos);
        var projAABB_LZ = bhw * Math.abs(sin) + bhl * Math.abs(cos);
        if (dist_LZ > hl + projAABB_LZ) continue;

        // Se falhou todos os testes de separação, há colisão!
        return true;
    }
    return false;
}

function atualizarJogador(veiculo, estado, teclaEsq, teclaDir, delta) {
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

    // Colisão OBB com obstáculos da arena — tenta deslizar mantendo o eixo livre
    if (obstaculos.length > 0 && colideComObstaculo(veiculo.position, estado, veiculo.rotation.y)) {
        var newX = veiculo.position.x;
        var newZ = veiculo.position.z;

        // 1) Reverter X (mantém movimento em Z — desliza ao longo de paredes verticais)
        veiculo.position.x = prevX;
        if (colideComObstaculo(veiculo.position, estado, veiculo.rotation.y)) {
            // 2) Reverter Z (mantém movimento em X — desliza ao longo de paredes horizontais)
            veiculo.position.x = newX;
            veiculo.position.z = prevZ;
            if (colideComObstaculo(veiculo.position, estado, veiculo.rotation.y)) {
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
    atualizarJogador(motaJ1,  estadoJ1, 'ArrowLeft', 'ArrowRight', delta);
    atualizarJogador(skateJ2, estadoJ2, 'KeyA',      'KeyD',       delta);
}
