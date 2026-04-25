import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { aoIniciarJogo, mostrarMenu } from './menu.js';
import { criarArena } from './arena.js';
import { criarMota } from './mota.js';
import { criarSkate } from './skate.js';

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

// --- Controlos de Órbita (câmara perspetiva) ---
var controlos = new OrbitControls(camaraPerspetiva, renderer.domElement);
controlos.enableDamping = true;
controlos.dampingFactor = 0.08;
controlos.target.set(0, 0, 0);

// --- Iluminação base ---
var luzAmbiente = new THREE.AmbientLight(0x222244, 1.2);
cena.add(luzAmbiente);

var luzDirecional = new THREE.DirectionalLight(0xffffff, 0.4);
luzDirecional.position.set(20, 40, 15);
cena.add(luzDirecional);

// --- Aplicar tema do mapa selecionado ---
var grupoArena = null;
var grupoMota = null;

aoIniciarJogo(function (mapa) {
    // Remover arena anterior se existir
    if (grupoArena) {
        cena.remove(grupoArena);
        grupoArena = null;
    }
    // Remover mota anterior se existir
    if (grupoMota) {
        cena.remove(grupoMota);
        grupoMota = null;
    }

    cena.background = new THREE.Color(mapa.corFundo);
    var corFog  = mapa.corFog  !== undefined ? mapa.corFog  : mapa.corFundo;
    var fogNear = mapa.fogNear !== undefined ? mapa.fogNear : 40;
    var fogFar  = mapa.fogFar  !== undefined ? mapa.fogFar  : 120;
    cena.fog = mapa.temFog === false ? null : new THREE.Fog(corFog, fogNear, fogFar);
    luzAmbiente.color.set(mapa.luzAmbiente);
    luzAmbiente.intensity = 1.2;

    if (mapa.id === 'deserto') {
        luzDirecional.color.set(0xFFB347);
        luzDirecional.intensity = 1.5;
        luzDirecional.position.set(60, 20, 40);
        luzDirecional.castShadow = true;
        luzDirecional.shadow.mapSize.set(1024, 1024);
        luzDirecional.shadow.camera.left   = -40;
        luzDirecional.shadow.camera.right  =  40;
        luzDirecional.shadow.camera.top    =  40;
        luzDirecional.shadow.camera.bottom = -40;
        luzDirecional.shadow.camera.near   = 1;
        luzDirecional.shadow.camera.far    = 150;
        luzDirecional.shadow.camera.updateProjectionMatrix();
    } else if (mapa.id === 'jungle') {
        luzAmbiente.intensity = 0.8;
        luzDirecional.color.set(0xa8d870);
        luzDirecional.intensity = 0.6;
        luzDirecional.position.set(-20, 30, 15);
        luzDirecional.castShadow = true;
        luzDirecional.shadow.mapSize.set(1024, 1024);
        luzDirecional.shadow.camera.left   = -25;
        luzDirecional.shadow.camera.right  =  25;
        luzDirecional.shadow.camera.top    =  25;
        luzDirecional.shadow.camera.bottom = -25;
        luzDirecional.shadow.camera.near   = 1;
        luzDirecional.shadow.camera.far    = 120;
        luzDirecional.shadow.camera.updateProjectionMatrix();
    } else if (mapa.id === 'gelo') {
        luzAmbiente.color.set(0x444444);
        luzAmbiente.intensity = 0.5;
        luzDirecional.color.set(0xffffff);
        luzDirecional.intensity = 3.0;
        luzDirecional.position.set(-40, 60, 10);
        luzDirecional.castShadow = true;
        luzDirecional.shadow.mapSize.set(2048, 2048);
        luzDirecional.shadow.camera.left   = -45;
        luzDirecional.shadow.camera.right  =  45;
        luzDirecional.shadow.camera.top    =  45;
        luzDirecional.shadow.camera.bottom = -45;
        luzDirecional.shadow.camera.near   = 1;
        luzDirecional.shadow.camera.far    = 150;
        luzDirecional.shadow.camera.updateProjectionMatrix();
    } else {
        luzDirecional.color.set(0xffffff);
        luzDirecional.intensity = 0.4;
        luzDirecional.position.set(20, 40, 15);
        luzDirecional.castShadow = false;
    }

    grupoArena = criarArena(cena, ARENA, mapa);

    // --- Adicionar objetos decorativos específicos injetados dos ficheiros externos ---
    if (mapa.id === 'space') {
        adicionarObjetosSpace(grupoArena, ARENA);
    } else if (mapa.id === 'deserto') {
        adicionarObjetosDeserto(grupoArena, ARENA, loaderGlobal, mapa, loaderGLTF);
    } else if (mapa.id === 'jungle') {
        adicionarObjetosJungle(grupoArena, ARENA);
    } else if (mapa.id === 'gelo') {
        adicionarObjetosGelo(grupoArena, ARENA, loaderGlobal);
    }

    // --- Mota de pré-visualização no centro da arena ---
    var corNeon = mapa.corNeonMota !== undefined ? mapa.corNeonMota : 0x00ffff;
    grupoMota = criarMota(corNeon);
    grupoMota.position.set(-2, 0, 0);
    cena.add(grupoMota);

    var grupoSkate = criarSkate(corNeon);
    grupoSkate.position.set(2, 0, 0);
    cena.add(grupoSkate);
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
    var delta = reloginho.getDelta();
    
    // Atualizar animações de todas as possíveis arenas
    atualizarSpace(delta);
    atualizarDeserto(delta);
    atualizarJungle(delta);
    atualizarGelo(delta);

    controlos.update();
    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}
