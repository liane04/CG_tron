import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { aoIniciarJogo, mostrarMenu } from './menu.js';
import { criarArena } from './arena.js';

document.addEventListener('DOMContentLoaded', Start);

// --- Cena e Renderer ---
var cena = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

// --- Controlos de Órbita (câmara perspetiva) ---
var controlos = new OrbitControls(camaraPerspetiva, renderer.domElement);
controlos.enableDamping = true;
controlos.dampingFactor = 0.08;
controlos.target.set(0, 0, 0);

// --- Iluminação base (T4 irá expandir com toggles) ---
var luzAmbiente = new THREE.AmbientLight(0x222244, 1.2);
cena.add(luzAmbiente);

var luzDirecional = new THREE.DirectionalLight(0xffffff, 0.4);
luzDirecional.position.set(20, 40, 15);
cena.add(luzDirecional);

// --- Aplicar tema do mapa selecionado ---
var grupoArena = null;

aoIniciarJogo(function (mapa) {
    // Remover arena anterior se existir
    if (grupoArena) {
        cena.remove(grupoArena);
        grupoArena = null;
    }

    cena.background = new THREE.Color(mapa.corFundo);
    cena.fog = mapa.temFog === false ? null : new THREE.Fog(mapa.corFundo, 40, 120);
    luzAmbiente.color.set(mapa.luzAmbiente);

    if (mapa.id === 'deserto') {
        luzDirecional.color.set(0xffcc66);
        luzDirecional.intensity = 1.2;
        luzDirecional.position.set(30, 50, 10);
    } else if (mapa.id === 'jungle') {
        luzDirecional.color.set(0x88ff88);
        luzDirecional.intensity = 0.6;
        luzDirecional.position.set(10, 30, 10);
    } else {
        luzDirecional.color.set(0xffffff);
        luzDirecional.intensity = 0.4;
        luzDirecional.position.set(20, 40, 15);
    }

    grupoArena = criarArena(cena, ARENA, mapa);
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

// --- Input de teclado ---
window.addEventListener('keydown', function (e) {
    if (e.key === 'c' || e.key === 'C') {
        camaraAtiva = (camaraAtiva === camaraPerspetiva) ? camaraOrtografica : camaraPerspetiva;
    }
    if (e.key === 'Escape') {
        mostrarMenu();
    }
});

// --- Start / Loop ---
function Start() {
    requestAnimationFrame(loop);
}

function loop() {
    controlos.update();
    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}
