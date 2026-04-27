import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { aoIniciarJogo, mostrarMenu } from './menu.js';
import { criarArena } from './arena.js';
import { criarMota } from './mota.js';
import { criarSkate, atualizarSkate } from './skate.js';
import { inicializarInput, atualizarMotas } from './input.js';
import { criarLuzes, toggleLuz } from './luzes.js';

// Importar objetos decorativos e animações das arenas
import { adicionarObjetosSpace, atualizarSpace }   from './objetos/arenaSpace.js';
import { adicionarObjetosDeserto, atualizarDeserto } from './objetos/arenaDeserto.js';
import { adicionarObjetosGelo, atualizarGelo }       from './objetos/arenaGelo.js';
import { adicionarObjetosJungle, atualizarJungle }   from './objetos/arenaJungle.js';

document.addEventListener('DOMContentLoaded', Start);

// --- Cena e Renderer ---
var cena = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var reloginho = new THREE.Clock();
var loaderGlobal = new THREE.TextureLoader();
var loaderGLTF = new GLTFLoader();
var loaderOBJ = new OBJLoader();
var loaderMTL = new MTLLoader();

// --- Tamanho da arena ---
var ARENA = 70;

// --- Câmara em Perspetiva ---
var camaraPerspetiva = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    800
);
camaraPerspetiva.position.set(0, 45, 70);
camaraPerspetiva.lookAt(0, 0, 0);

// --- Câmara Ortográfica (vista topo) ---
var aspecto = window.innerWidth / window.innerHeight;
var tamanhoOrto = ARENA * 0.62;
var camaraOrtografica = new THREE.OrthographicCamera(
    -tamanhoOrto * aspecto,
    tamanhoOrto * aspecto,
    tamanhoOrto,
    -tamanhoOrto,
    0.1,
    800
);
camaraOrtografica.position.set(0, 120, 0);
camaraOrtografica.lookAt(0, 0, 0);

var camaraAtiva = camaraPerspetiva;

// --- Modos de câmara: 'livre' | 'terceiraPessoa' | 'topo' ---
var modoCamara = 'livre';

// --- Controlos de Órbita (câmara perspetiva) ---
var controlos = new OrbitControls(camaraPerspetiva, renderer.domElement);
controlos.enableDamping = true;
controlos.dampingFactor = 0.08;
controlos.target.set(0, 0, 0);

// --- Estado global ---
var grupoArena = null;
var motaJogador1 = null;
var skateJogador2 = null;
var luzes = null;

aoIniciarJogo(function (mapa) {
    // Remover arena anterior se existir
    if (grupoArena) {
        cena.remove(grupoArena);
        grupoArena = null;
    }

    // Remover veículos anteriores se existirem
    if (motaJogador1)  { cena.remove(motaJogador1);  motaJogador1  = null; }
    if (skateJogador2) { cena.remove(skateJogador2); skateJogador2 = null; }

    // Remover luzes anteriores se existirem
    if (luzes) {
        Object.values(luzes).forEach(function(l) { cena.remove(l); });
        luzes = null;
    }

    cena.background = new THREE.Color(mapa.corFundo);
    var corFog  = mapa.corFog  !== undefined ? mapa.corFog  : mapa.corFundo;
    var fogNear = mapa.fogNear !== undefined ? mapa.fogNear : 40;
    var fogFar  = mapa.fogFar  !== undefined ? mapa.fogFar  : 120;
    cena.fog = mapa.temFog === false ? null : new THREE.Fog(corFog, fogNear, fogFar);

    // Criar luzes para o mapa atual (configurações por mapa em luzes.js)
    luzes = criarLuzes(cena, mapa);
    atualizarHUDLuzes();

    grupoArena = criarArena(cena, ARENA, mapa);

    // --- Adicionar objetos decorativos específicos por mapa ---
    if (mapa.id === 'space') {
        adicionarObjetosSpace(grupoArena, ARENA, loaderGlobal);
    } else if (mapa.id === 'deserto') {
        adicionarObjetosDeserto(grupoArena, ARENA, loaderGlobal, mapa, loaderGLTF);
    } else if (mapa.id === 'jungle') {
        adicionarObjetosJungle(grupoArena, ARENA, loaderOBJ, loaderMTL);
    } else if (mapa.id === 'gelo') {
        adicionarObjetosGelo(grupoArena, ARENA, loaderGlobal);
    }

    // --- Veículos ---
    // Jogador 1 → mota (cyan), controlo por setas + Shift
    motaJogador1 = criarMota(0x00ffff);
    motaJogador1.position.set(-5, 0, 0);
    motaJogador1.rotation.y = 0;
    cena.add(motaJogador1);

    // Jogador 2 → skate (rosa), controlo por WASD + Espaço
    skateJogador2 = criarSkate(0xff0066);
    skateJogador2.position.set(5, 0, 0);
    skateJogador2.rotation.y = Math.PI;
    cena.add(skateJogador2);

    // --- Input: ligar teclado aos veículos ---
    inicializarInput(motaJogador1, skateJogador2, ARENA);
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

// --- Modos de câmara ---
var modoCamaraAnterior = 'livre';

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
    if (e.key === '4') { if (luzes) toggleLuz(luzes, 'pontoMota1');  atualizarHUDLuzes(); }
    if (e.key === '5') { if (luzes) toggleLuz(luzes, 'pontoMota2');  atualizarHUDLuzes(); }
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
        { id: 'hud-l4', chave: 'pontoMota1',  label: '[4] Mota' },
        { id: 'hud-l5', chave: 'pontoMota2',  label: '[5] Skate' },
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

// Offset em espaço local: a frente visual aponta para -Z, logo a câmara fica em +Z (atrás)
var offsetTerceiraPessoa = new THREE.Vector3(0, 3.5, 8);
var alvoTerceiraPessoa  = new THREE.Vector3(0, 1, -2);
var posCamTemp = new THREE.Vector3();
var alvoCamTemp = new THREE.Vector3();

function loop() {
    var delta = reloginho.getDelta();

    // Atualizar animações de todas as arenas
    atualizarSpace(delta);
    atualizarDeserto(delta);
    atualizarJungle(delta);
    atualizarGelo(delta);

    // Animação interna do skate (hover bob, propulsores)
    atualizarSkate(delta);

    // Movimento e rotação dos veículos via input
    atualizarMotas(delta);

    // Acompanhar o ponto de luz de cada veículo
    if (luzes && motaJogador1) {
        luzes.pontoMota1.position.copy(motaJogador1.position);
        luzes.pontoMota1.position.y += 1.5;
    }
    if (luzes && skateJogador2) {
        luzes.pontoMota2.position.copy(skateJogador2.position);
        luzes.pontoMota2.position.y += 1.5;
    }

    // A câmara em terceira pessoa segue o jogador 2 (skate, WASD)
    var alvo = skateJogador2;
    if (modoCamara === 'terceiraPessoa' && alvo) {
        posCamTemp.copy(offsetTerceiraPessoa).applyQuaternion(alvo.quaternion);
        posCamTemp.add(alvo.position);

        alvoCamTemp.copy(alvoTerceiraPessoa).applyQuaternion(alvo.quaternion);
        alvoCamTemp.add(alvo.position);

        if (modoCamaraAnterior !== 'terceiraPessoa') {
            camaraPerspetiva.position.copy(posCamTemp);
        } else {
            camaraPerspetiva.position.lerp(posCamTemp, Math.min(1, 8 * delta));
        }
        camaraPerspetiva.lookAt(alvoCamTemp);
    }

    // OrbitControls.update() reescreve a posição mesmo com enabled=false;
    // só o chamamos em modo livre para não anular a câmara 3ª pessoa.
    if (modoCamara === 'livre') controlos.update();

    modoCamaraAnterior = modoCamara;

    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}
