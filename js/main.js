// Top-level entry point. Boots the 3D menu first; on "start game", swaps the
// renderer over to the existing in-game scene/camera built in initGame().

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

import { criarArena } from './arena.js';
import { criarMota } from './mota.js';
import { criarSkate, atualizarSkate, destruirSkate } from './skate.js';
import { criarSpeeder, atualizarSpeeder } from './speeder.js';
import { criarGlider, atualizarGlider } from './glider.js';
import { inicializarInput, atualizarMotas, definirObstaculos } from './input.js';
import { criarLuzes, toggleLuz } from './luzes.js';
import { mapas } from './mapas.js';

import { adicionarObjetosSpace, atualizarSpace }     from './objetos/arenaSpace.js';
import { adicionarObjetosDeserto, atualizarDeserto } from './objetos/arenaDeserto.js';
import { adicionarObjetosGelo, atualizarGelo }       from './objetos/arenaGelo.js';
import { adicionarObjetosJungle, atualizarJungle }   from './objetos/arenaJungle.js';

import { initMenu, showMenu } from './menu/menuApp.js';
import { playMapMusic, playMenuMusic } from './audioManager.js';

// ---------------------------------------------------------------------------
// Renderer (shared between menu and game)
// ---------------------------------------------------------------------------
var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var reloginho = new THREE.Clock();

// ---------------------------------------------------------------------------
// App-level state machine: 'menu' | 'game'
// ---------------------------------------------------------------------------
var appMode = 'menu';
var menuApi = null;     // Returned by initMenu(), holds composer + update hooks
var gameApi = null;     // Built lazily on first game start
var menuSettings = null;

// ---------------------------------------------------------------------------
// Menu boot
// ---------------------------------------------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}

function start() {
    menuApi = initMenu(renderer, {
        title: 'NEON DRIVE',
        subtitle: 'GRAND PRIX 2087',
        onStartGame: function (settings) {
            menuSettings = settings;
            // Pick the user's chosen map (falls back to first map if missing)
            var mapId = settings.track && settings.track.mapId ? settings.track.mapId : mapas[0].id;
            var pickedMap = mapas.find(function (m) { return m.id === mapId; }) || mapas[0];
            ensureGameInitialised();
            gameApi.startWithMap(pickedMap, settings.garage || null);
            playMapMusic(pickedMap.id);
            appMode = 'game';
            document.getElementById('info').style.display = 'block';
            document.getElementById('hud-luzes').style.display = 'flex';
        },
        onSettingsChange: function (s) {
            menuSettings = s;
            // Live-apply camera mode the next time we enter the game
            if (gameApi) gameApi.applySettings(s);
        },
        onReturnFromGame: function () { backToMenu(); }
    });
    menuSettings = menuApi.getSettings();

    // Hide boot loader
    var boot = document.getElementById('boot');
    if (boot) {
        boot.classList.add('oculto');
        setTimeout(function () { boot.remove(); }, 700);
    }

    requestAnimationFrame(loop);
}

function backToMenu() {
    appMode = 'menu';
    document.getElementById('info').style.display = 'none';
    document.getElementById('hud-luzes').style.display = 'none';
    showMenu();
    playMenuMusic();
}

// ---------------------------------------------------------------------------
// Game (existing scene wrapped in a struct so we can build/teardown cleanly)
// ---------------------------------------------------------------------------
function ensureGameInitialised() {
    if (gameApi) return gameApi;
    gameApi = buildGame();
    return gameApi;
}

function buildGame() {
    var ARENA = 70;
    var cena = new THREE.Scene();

    var camaraPerspetiva = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    camaraPerspetiva.position.set(0, 45, 70);
    camaraPerspetiva.lookAt(0, 0, 0);

    var aspecto = window.innerWidth / window.innerHeight;
    var tamanhoOrto = ARENA * 0.62;
    var camaraOrtografica = new THREE.OrthographicCamera(
        -tamanhoOrto * aspecto, tamanhoOrto * aspecto,
        tamanhoOrto, -tamanhoOrto, 0.1, 800
    );
    camaraOrtografica.position.set(0, 120, 0);
    camaraOrtografica.lookAt(0, 0, 0);

    var camaraAtiva = camaraPerspetiva;
    var modoCamara = 'livre';
    var modoCamaraAnterior = 'livre';

    var controlos = new OrbitControls(camaraPerspetiva, renderer.domElement);
    controlos.enableDamping = true;
    controlos.dampingFactor = 0.08;
    controlos.target.set(0, 0, 0);

    var loaderGlobal = new THREE.TextureLoader();
    var loaderGLTF = new GLTFLoader();
    var loaderOBJ = new OBJLoader();
    var loaderMTL = new MTLLoader();

    var grupoArena = null;
    var motaJogador1 = null;
    var skateJogador2 = null;
    var luzes = null;

    var offsetTerceiraPessoa = new THREE.Vector3(0, 3.5, 8);
    var alvoTerceiraPessoa  = new THREE.Vector3(0, 1, -2);
    var posCamTemp = new THREE.Vector3();
    var alvoCamTemp = new THREE.Vector3();

    var COLOR_HEX = {
        cyan: 0x00eaff, magenta: 0xff2bd6, yellow: 0xffc83a,
        green: 0x59ff7c, purple: 0x9438ff, red: 0xff2244
    };

    function buildPlayer1(garage) {
        var color = (garage && COLOR_HEX[garage.colorId]) || 0x00ffff;
        var id = (garage && garage.vehicleId) || 'mota';
        if (id === 'mota')    return criarMota(color);
        if (id === 'skate')   return criarSkate(color);
        if (id === 'speeder') return criarSpeeder(color);
        if (id === 'glider')  return criarGlider(color);
        return criarMota(color);
    }

    function startWithMap(mapa, garage) {
        if (grupoArena) { cena.remove(grupoArena); grupoArena = null; }
        if (motaJogador1)  { cena.remove(motaJogador1);  motaJogador1 = null; }
        if (skateJogador2) { destruirSkate(skateJogador2); cena.remove(skateJogador2); skateJogador2 = null; }
        if (luzes) { Object.values(luzes).forEach(function (l) { cena.remove(l); }); luzes = null; }

        cena.background = new THREE.Color(mapa.corFundo);
        var corFog  = mapa.corFog  !== undefined ? mapa.corFog  : mapa.corFundo;
        var fogNear = mapa.fogNear !== undefined ? mapa.fogNear : 40;
        var fogFar  = mapa.fogFar  !== undefined ? mapa.fogFar  : 120;
        cena.fog = mapa.temFog === false ? null : new THREE.Fog(corFog, fogNear, fogFar);

        luzes = criarLuzes(cena, mapa);
        atualizarHUDLuzes();

        grupoArena = criarArena(cena, ARENA, mapa);

        if (mapa.id === 'space')   adicionarObjetosSpace(grupoArena, ARENA, loaderGlobal);
        if (mapa.id === 'deserto') adicionarObjetosDeserto(grupoArena, ARENA, loaderGlobal, mapa, loaderGLTF);
        if (mapa.id === 'jungle')  adicionarObjetosJungle(grupoArena, ARENA, loaderOBJ, loaderMTL);
        if (mapa.id === 'gelo')    adicionarObjetosGelo(grupoArena, ARENA, loaderGlobal);

        // Player 1 — vehicle picked in the Garage. Player 2 stays as the
        // hover-skate counterpart so the split-screen multiplayer still works.
        motaJogador1 = buildPlayer1(garage);
        motaJogador1.position.set(-5, 0, 0);
        motaJogador1.rotation.y = 0;
        cena.add(motaJogador1);

        skateJogador2 = criarSkate(0xff0066);
        skateJogador2.position.set(5, 0, 0);
        skateJogador2.rotation.y = Math.PI;
        cena.add(skateJogador2);

        inicializarInput(motaJogador1, skateJogador2, ARENA);
        definirObstaculos(grupoArena);

        // Apply menu-chosen camera mode
        if (menuSettings && menuSettings.visual && menuSettings.visual.cameraMode === 'orthographic') {
            camaraAtiva = camaraOrtografica;
            modoCamara = 'topo';
        } else {
            camaraAtiva = camaraPerspetiva;
            modoCamara = 'livre';
        }
    }

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
        if (appMode !== 'game') return;
        if (e.key === 'c' || e.key === 'C') {
            if (modoCamara !== 'livre') {
                modoCamara = 'livre';
                camaraAtiva = camaraPerspetiva;
            } else {
                camaraAtiva = (camaraAtiva === camaraPerspetiva) ? camaraOrtografica : camaraPerspetiva;
            }
            aplicarModoCamara();
        }
        if (e.key === 'v' || e.key === 'V') { modoCamara = 'terceiraPessoa'; aplicarModoCamara(); }
        if (e.key === 'b' || e.key === 'B') { modoCamara = 'topo'; aplicarModoCamara(); }
        if (e.key === 'Escape') { backToMenu(); }
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
        var entradas = [
            { id: 'hud-l1', chave: 'ambiente',    label: '[1] Ambiente' },
            { id: 'hud-l2', chave: 'direcional',  label: '[2] Direcional' },
            { id: 'hud-l3', chave: 'pontoArena',  label: '[3] Arena' },
            { id: 'hud-l4', chave: 'pontoMota1',  label: '[4] Mota' },
            { id: 'hud-l5', chave: 'pontoMota2',  label: '[5] Skate' },
        ];
        entradas.forEach(function (e) {
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

    function update(delta) {
        atualizarSpace(delta);
        atualizarDeserto(delta);
        atualizarJungle(delta);
        atualizarGelo(delta);
        atualizarSkate(delta);
        atualizarSpeeder(delta);
        atualizarGlider(delta);
        atualizarMotas(delta);

        if (luzes && motaJogador1) {
            luzes.pontoMota1.position.copy(motaJogador1.position);
            luzes.pontoMota1.position.y += 1.5;
        }
        if (luzes && skateJogador2) {
            luzes.pontoMota2.position.copy(skateJogador2.position);
            luzes.pontoMota2.position.y += 1.5;
        }

        var alvo = skateJogador2;
        if (modoCamara === 'terceiraPessoa' && alvo) {
            posCamTemp.copy(offsetTerceiraPessoa).applyQuaternion(alvo.quaternion);
            posCamTemp.add(alvo.position);
            alvoCamTemp.copy(alvoTerceiraPessoa).applyQuaternion(alvo.quaternion);
            alvoCamTemp.add(alvo.position);

            if (modoCamaraAnterior !== 'terceiraPessoa') camaraPerspetiva.position.copy(posCamTemp);
            else camaraPerspetiva.position.lerp(posCamTemp, Math.min(1, 8 * delta));
            camaraPerspetiva.lookAt(alvoCamTemp);
        }

        if (modoCamara === 'livre') controlos.update();
        modoCamaraAnterior = modoCamara;
    }

    function render() { renderer.render(cena, camaraAtiva); }

    function onResize(w, h) {
        var asp = w / h;
        camaraPerspetiva.aspect = asp;
        camaraPerspetiva.updateProjectionMatrix();
        camaraOrtografica.left = -tamanhoOrto * asp;
        camaraOrtografica.right = tamanhoOrto * asp;
        camaraOrtografica.top = tamanhoOrto;
        camaraOrtografica.bottom = -tamanhoOrto;
        camaraOrtografica.updateProjectionMatrix();
    }

    function applySettings(s) {
        if (!s || !s.visual) return;
        if (s.visual.cameraMode === 'orthographic') {
            camaraAtiva = camaraOrtografica; modoCamara = 'topo'; aplicarModoCamara();
        }
    }

    return {
        startWithMap: startWithMap,
        update: update,
        render: render,
        onResize: onResize,
        applySettings: applySettings
    };
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
window.addEventListener('resize', function () {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    if (menuApi) menuApi.resize(w, h);
    if (gameApi) gameApi.onResize(w, h);
});

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function loop() {
    var delta = reloginho.getDelta();

    if (appMode === 'menu') {
        if (menuApi) {
            menuApi.update(delta);
            menuApi.composer.render();
        }
    } else if (appMode === 'game') {
        if (gameApi) {
            gameApi.update(delta);
            gameApi.render();
        }
    }

    requestAnimationFrame(loop);
}
