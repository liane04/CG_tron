import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { aoIniciarJogo, mostrarMenu } from './menu.js';
import { criarArena, atualizarDeserto, atualizarJungle } from './arena.js';
import { criarMota } from './mota.js';
import { inicializarInput, atualizarMotas } from './input.js';
import { criarLuzes, toggleLuz } from './luzes.js';

document.addEventListener('DOMContentLoaded', Start);

// --- Cena e Renderer ---
var cena = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var reloginho = new THREE.Clock();

// --- Tamanho da arena ---
var ARENA = 40;

// --- Câmara em Perspetiva ---
var camaraPerspetiva = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
);
camaraPerspetiva.position.set(0, 30, 45);
camaraPerspetiva.lookAt(0, 0, 0);

// --- Câmara Ortográfica (vista topo) ---
var aspecto = window.innerWidth / window.innerHeight;
var tamanhoOrto = ARENA * 0.6;
var camaraOrtografica = new THREE.OrthographicCamera(
    -tamanhoOrto * aspecto,
    tamanhoOrto * aspecto,
    tamanhoOrto,
    -tamanhoOrto,
    0.1,
    500
);
camaraOrtografica.position.set(0, 80, 0);
camaraOrtografica.lookAt(0, 0, 0);

var camaraAtiva = camaraPerspetiva;

// --- Modos de câmara: 'livre' | 'terceiraPessoa' | 'topo' ---
var modoCamara = 'livre';

// --- Controlos de Órbita (câmara perspetiva) ---
var controlos = new OrbitControls(camaraPerspetiva, renderer.domElement);
controlos.enableDamping = true;
controlos.dampingFactor = 0.08;
controlos.target.set(0, 0, 0);

// --- Aplicar tema do mapa selecionado ---
var grupoArena = null;
var motaJogador1 = null;
var motaJogador2 = null;
var luzes = null;

aoIniciarJogo(function (mapa) {
    // Remover arena anterior se existir
    if (grupoArena) {
        cena.remove(grupoArena);
        grupoArena = null;
    }

    cena.background = new THREE.Color(mapa.corFundo);
    var corFog  = mapa.corFog  !== undefined ? mapa.corFog  : mapa.corFundo;
    var fogNear = mapa.fogNear !== undefined ? mapa.fogNear : 40;
    var fogFar  = mapa.fogFar  !== undefined ? mapa.fogFar  : 120;
    cena.fog = mapa.temFog === false ? null : new THREE.Fog(corFog, fogNear, fogFar);

    // Remover luzes anteriores se existirem
    if (luzes) {
        Object.values(luzes).forEach(function(l) { cena.remove(l); });
    }
    luzes = criarLuzes(cena, mapa);
    atualizarHUDLuzes();

    grupoArena = criarArena(cena, ARENA, mapa);

    // --- Motas ---
    // Remover motas anteriores se existirem
    if (motaJogador1) { cena.remove(motaJogador1); motaJogador1 = null; }
    if (motaJogador2) { cena.remove(motaJogador2); motaJogador2 = null; }

    motaJogador1 = criarMota(mapa.id, 0x00ffff);   // jogador 1 — ciano
    motaJogador1.position.set(-5, 0, 0);
    motaJogador1.rotation.y = 0;
    cena.add(motaJogador1);

    motaJogador2 = criarMota(mapa.id, 0xff0066);   // jogador 2 — rosa
    motaJogador2.position.set(5, 0, 0);
    motaJogador2.rotation.y = Math.PI;             // virado para o lado oposto
    cena.add(motaJogador2);

    // --- Input: ligar teclado às motas recém-criadas ---
    inicializarInput(motaJogador1, motaJogador2, ARENA);
});

// --- Redimensionamento ---
window.addEventListener('resize', function () {
    var asp = window.innerWidth / window.innerHeight;

    camaraPerspetiva.aspect = asp;
    camaraPerspetiva.updateProjectionMatrix();

    camaraOrtografica.left = -tamanhoOrto * asp;
    camaraOrtografica.right = tamanhoOrto * asp;
    camaraOrtografica.top = tamanhoOrto;
    camaraOrtografica.bottom = -tamanhoOrto;
    camaraOrtografica.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Input de teclado (câmaras / menu) ---
var modoCamaraAnterior = 'livre';  // sentinela para snap inicial ao entrar em 3ª pessoa

function aplicarModoCamara() {
    if (modoCamara === 'livre') {
        controlos.enabled = true;
    } else if (modoCamara === 'terceiraPessoa') {
        camaraAtiva = camaraPerspetiva;
        controlos.enabled = false;
    } else if (modoCamara === 'topo') {
        camaraAtiva = camaraOrtografica;
        camaraOrtografica.position.set(0, 80, 0);
        camaraOrtografica.lookAt(0, 0, 0);
        controlos.enabled = false;
    }
}

window.addEventListener('keydown', function (e) {
    if (e.key === 'c' || e.key === 'C') {
        if (modoCamara !== 'livre') {
            modoCamara = 'livre';
            camaraAtiva = camaraPerspetiva;
        } else {
            camaraAtiva = (camaraAtiva === camaraPerspetiva) ? camaraOrtografica : camaraPerspetiva;
        }
        aplicarModoCamara();
    }
    if (e.key === 'v' || e.key === 'V') {
        modoCamara = 'terceiraPessoa';
        aplicarModoCamara();
    }
    if (e.key === 'b' || e.key === 'B') {
        modoCamara = 'topo';
        aplicarModoCamara();
    }
    if (e.key === 'Escape') {
        mostrarMenu();
    }
    if (e.key === '1') { if (luzes) toggleLuz(luzes, 'ambiente');    atualizarHUDLuzes(); }
    if (e.key === '2') { if (luzes) toggleLuz(luzes, 'direcional');  atualizarHUDLuzes(); }
    if (e.key === '3') { if (luzes) toggleLuz(luzes, 'pontoArena');  atualizarHUDLuzes(); }
    if (e.key === '4') { if (luzes) toggleLuz(luzes, 'pontoMota1'); atualizarHUDLuzes(); }
    if (e.key === '5') { if (luzes) toggleLuz(luzes, 'pontoMota2'); atualizarHUDLuzes(); }
});

function atualizarHUDLuzes() {
    if (!luzes) return;
    var hud = document.getElementById('hud-luzes');
    if (!hud) return;
    hud.style.display = 'flex';

    var entradas = [
        { id: 'hud-l1', chave: 'ambiente',    label: '[1] Ambiente' },
        { id: 'hud-l2', chave: 'direcional',  label: '[2] Direcional' },
        { id: 'hud-l3', chave: 'pontoArena',  label: '[3] Arena' },
        { id: 'hud-l4', chave: 'pontoMota1',  label: '[4] Mota1' },
        { id: 'hud-l5', chave: 'pontoMota2',  label: '[5] Mota2' },
    ];
    entradas.forEach(function(e) {
        var span = document.getElementById(e.id);
        if (!span) return;
        var on = luzes[e.chave].visible;
        span.textContent = e.label + ': ' + (on ? 'ON' : 'OFF');
        span.style.color = on ? '#00ffcc' : '#666688';
        span.style.padding = '2px 6px';
        span.style.background = 'rgba(0,0,0,0.55)';
        span.style.borderRadius = '3px';
        span.style.border = on ? '1px solid #00ffcc44' : '1px solid #33335544';
    });
}

// --- Start / Loop ---
function Start() {
    requestAnimationFrame(loop);
}

// Offset em espaço local da mota: a frente visual da mota aponta para -Z
// (roda dianteira em ZF = -1.18 em mota.js), logo a traseira está em +Z → câmara atrás.
var offsetTerceiraPessoa = new THREE.Vector3(0, 3.5, 8);
var alvoTerceiraPessoa  = new THREE.Vector3(0, 1, -2);  // mira ligeiramente à frente da mota
var posCamTemp = new THREE.Vector3();
var alvoCamTemp = new THREE.Vector3();

function loop() {
    var delta = reloginho.getDelta();
    atualizarDeserto(delta);
    atualizarJungle(delta);
    atualizarMotas(delta);

    if (luzes && motaJogador1) {
        luzes.pontoMota1.position.copy(motaJogador1.position);
        luzes.pontoMota1.position.y += 1.5;
    }
    if (luzes && motaJogador2) {
        luzes.pontoMota2.position.copy(motaJogador2.position);
        luzes.pontoMota2.position.y += 1.5;
    }

    // A câmara segue a mota do jogador ativo (WASD → motaJogador2, rosa/vermelha).
    var motaAlvo = motaJogador2;
    if (modoCamara === 'terceiraPessoa' && motaAlvo) {
        posCamTemp.copy(offsetTerceiraPessoa).applyQuaternion(motaAlvo.quaternion);
        posCamTemp.add(motaAlvo.position);

        alvoCamTemp.copy(alvoTerceiraPessoa).applyQuaternion(motaAlvo.quaternion);
        alvoCamTemp.add(motaAlvo.position);

        if (modoCamaraAnterior !== 'terceiraPessoa') {
            // Primeira frame neste modo — snap sem lerp para evitar arrastar da posição da câmara livre
            camaraPerspetiva.position.copy(posCamTemp);
        } else {
            camaraPerspetiva.position.lerp(posCamTemp, Math.min(1, 8 * delta));
        }
        camaraPerspetiva.lookAt(alvoCamTemp);
    }

    // OrbitControls.update() reescreve a posição da câmara mesmo com enabled=false;
    // só o chamamos em modo livre para não anular a câmara 3ª pessoa.
    if (modoCamara === 'livre') controlos.update();

    modoCamaraAnterior = modoCamara;
    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}
