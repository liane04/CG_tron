// Top-level entry point. Boots the 3D menu first; on "start game", swaps the
// renderer over to the existing in-game scene/camera built in initGame().

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';

import { criarArena } from './arena.js';
import { criarMota, atualizarMota } from './mota.js';
import { criarSkate, atualizarSkate, destruirSkate } from './skate.js';
import { criarSpeeder, atualizarSpeeder } from './speeder.js';
import { inicializarInput, atualizarMotas, definirObstaculos, definirIAJ1Ativa, definirIAJ2Ativa } from './input.js';
import { criarLuzes } from './luzes.js';
import { mapas } from './mapas.js';
import { criarTrail, destruirTrail, atualizarTrail } from './trail.js';
import { configurarGameLogic, iniciarRonda, atualizarGameLogic, limparGameLogic, preCompilarExplosoes } from './gameLogic.js';
import { inicializarIA, atualizarIA } from './ai.js';
import { criarHudBoost, atualizarHudBoost, destruirHudBoost, mostrarHudBoost } from './hudBoost.js';

import { adicionarObjetosSpace, atualizarSpace } from './objetos/arenaSpace.js';
import { adicionarObjetosDeserto, atualizarDeserto } from './objetos/arenaDeserto.js';
import { adicionarObjetosJungle, atualizarJungle } from './objetos/arenaJungle.js';

import { initMenu, showMenu } from './menu/menuApp.js';
import { playMapMusic, playMenuMusic } from './audioManager.js';
import { initDebugGUI, updateDebugContext } from './debugGUI.js';

// ---------------------------------------------------------------------------
// Renderer (shared between menu and game)
// ---------------------------------------------------------------------------
var renderer = new THREE.WebGLRenderer({ antialias: true });
// Clamp do DPR a 2 — em ecrãs HiDPI (DPR 3 em alguns portáteis/4K) o custo de
// fragmento cresce com o quadrado da resolução; 2 já está ao nível "retina"
// e a diferença visual para 3 é imperceptível neste tipo de cena neon.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Ativa a cache global do Three.js para texturas, modelos GLTF/OBJ e ficheiros
THREE.Cache.enabled = true;

var reloginho = new THREE.Clock();

// ---------------------------------------------------------------------------
// App-level state machine: 'menu' | 'loading' | 'game'
// ---------------------------------------------------------------------------
var appMode = 'menu';
var menuApi = null;     // Returned by initMenu(), holds composer + update hooks
var gameApi = null;     // Built lazily on first game start
var menuSettings = null;

// Overlay de loading mostrado durante a compilação de shaders
var loadingOverlay = (function () {
    var el = document.createElement('div');
    el.id = 'loading-overlay';
    el.style.cssText = [
        'position:fixed', 'inset:0', 'display:none', 'z-index:9999',
        'background:rgba(0,0,0,0.85)', 'color:#00eaff',
        'font-family:monospace', 'font-size:1.6rem', 'letter-spacing:.2em',
        'align-items:center', 'justify-content:center', 'flex-direction:column',
        'text-shadow:0 0 12px #00eaff'
    ].join(';');
    el.innerHTML = '<div>COMPILING SHADERS…</div><div style="font-size:.8rem;margin-top:.5em;opacity:.6">just a moment</div>';
    document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(el); });
    return {
        show: function () { el.style.display = 'flex'; },
        hide: function () { el.style.display = 'none'; }
    };
}());

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
            var gameMode = settings.gameMode || 'ai';

            // Mostrar loading enquanto a GPU compila os shaders
            loadingOverlay.show();
            appMode = 'loading';

            gameApi.startWithMap(pickedMap, settings.garage || null, gameMode, settings.garage2 || null);
            playMapMusic(pickedMap.id);

            var info = document.getElementById('info');
            info.style.display = 'block';
            info.innerHTML = (gameMode === 'local1v1' || gameMode === 'split1v1')
                ? 'P1 SETAS (&uarr; NITRO) &nbsp; P2 WASD (W NITRO) &nbsp; [ESC] Menu'
                : '[&uarr;] Nitro &nbsp; [V] 3&ordf; Pessoa &nbsp; [B] Topo &nbsp; [C] Alternar &nbsp; [ESC] Menu';

            // compileAsync compila shaders e faz upload de texturas para a GPU
            // antes do primeiro frame — elimina o freeze inicial.
            var camCompile = gameApi._camaraPerspetiva || renderer;
            var compilePromise = (renderer.compileAsync)
                ? renderer.compileAsync(gameApi._cena, camCompile)
                : Promise.resolve();

            compilePromise.then(function () {
                loadingOverlay.hide();
                appMode = 'game';
            });
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
    if (gameApi && gameApi.teardown) gameApi.teardown();
    document.getElementById('info').style.display = 'none';
    var divider = document.getElementById('split-divider');
    if (divider) divider.style.display = 'none';
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
    var ARENA = 105;
    var cena = new THREE.Scene();

    var camaraPerspetiva = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    camaraPerspetiva.position.set(0, 45, 70);
    camaraPerspetiva.lookAt(0, 0, 0);

    var camaraPerspetivaP2 = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 800);
    camaraPerspetivaP2.position.set(0, 45, 70);
    camaraPerspetivaP2.lookAt(0, 0, 0);

    var aspecto = window.innerWidth / window.innerHeight;
    // Vista ortográfica encosta verticalmente à arena (ARENA/2 de meia-extensão)
    // — as motas ficam grandes o suficiente para o modo 1v1 sem cortar a arena
    // na horizontal num ecrã landscape típico.
    var tamanhoOrto = ARENA * 0.5;
    var camaraOrtografica = new THREE.OrthographicCamera(
        -tamanhoOrto * aspecto, tamanhoOrto * aspecto,
        tamanhoOrto, -tamanhoOrto, 0.1, 800
    );
    camaraOrtografica.position.set(0, 120, 0);
    camaraOrtografica.lookAt(0, 0, 0);

    var camaraAtiva = camaraPerspetiva;
    var modoCamara = 'livre';
    var modoCamaraAnterior = 'livre';
    var modoJogoAtual = 'ai';   // 'ai' | 'local1v1' — define IA e câmara fixa

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
    var trailMota = null;
    var trailSkate = null;

    var COR_SKATE_J2 = 0xff0066; // cor do veículo do jogador 2

    // Configurar contexto para o GUI
    var gameContext = {
        luzes: null, cena: null, grupoArena: null,
        ambientIntensity: 1.0, ambientColor: 0xffffff,
        dirIntensity: 1.0, sceneBgColor: 0x000000,
        wireframeMode: false,
        temFog: false,
        cameraMode: 'livre',
        toggleShadows: false,
        musicVolume: 0.6,
        sfxVolume: 0.8,
        updateAudio: function (s) {
            import('./audioManager.js').then(am => am.setAudioSettings(s));
        },
        setCameraMode: function (m) {
            modoCamara = m;
            aplicarModoCamara();
        }
    };
    initDebugGUI(gameContext);

    var offsetTerceiraPessoa = new THREE.Vector3(0, 3.5, 8);
    var alvoTerceiraPessoa = new THREE.Vector3(0, 1, -2);
    var posCamTemp = new THREE.Vector3();
    var alvoCamTemp = new THREE.Vector3();
    var posCamTempP2 = new THREE.Vector3();
    var alvoCamTempP2 = new THREE.Vector3();

    var COLOR_HEX = {
        cyan: 0x00eaff, magenta: 0xff2bd6, yellow: 0xffc83a,
        green: 0x59ff7c, purple: 0x9438ff, red: 0xff2244
    };

    function resolverCor(garage, fallback) {
        return (garage && COLOR_HEX[garage.colorId]) || fallback;
    }

    function buildVehicle(garage, fallbackColor) {
        var color = resolverCor(garage, fallbackColor);
        var id = (garage && garage.vehicleId) || 'mota';
        if (id === 'mota') return criarMota(color);
        if (id === 'skate') return criarSkate(color);
        if (id === 'speeder') return criarSpeeder(color);
        return criarMota(color);
    }

    function startWithMap(mapa, garage, gameMode, garage2) {
        modoJogoAtual = gameMode || 'ai';
        if (grupoArena) { cena.remove(grupoArena); grupoArena = null; }
        if (motaJogador1) { cena.remove(motaJogador1); motaJogador1 = null; }
        if (skateJogador2) { destruirSkate(skateJogador2); cena.remove(skateJogador2); skateJogador2 = null; }
        if (luzes) { Object.values(luzes).forEach(function (l) { cena.remove(l); }); luzes = null; }
        if (trailMota) { destruirTrail(trailMota, cena); trailMota = null; }
        if (trailSkate) { destruirTrail(trailSkate, cena); trailSkate = null; }

        cena.background = new THREE.Color(mapa.corFundo);
        var corFog = mapa.corFog !== undefined ? mapa.corFog : mapa.corFundo;
        var fogNear = mapa.fogNear !== undefined ? mapa.fogNear : 40;
        var fogFar = mapa.fogFar !== undefined ? mapa.fogFar : 120;
        cena.fog = mapa.temFog === false ? null : new THREE.Fog(corFog, fogNear, fogFar);

        luzes = criarLuzes(cena, mapa);

        grupoArena = criarArena(cena, ARENA, mapa);

        if (mapa.id === 'space') adicionarObjetosSpace(grupoArena, ARENA, loaderGlobal);
        if (mapa.id === 'deserto') adicionarObjetosDeserto(grupoArena, ARENA, loaderGlobal, mapa, loaderGLTF);
        if (mapa.id === 'jungle') adicionarObjetosJungle(grupoArena, ARENA, loaderOBJ, loaderMTL);

        // Player 1 — escolhido na Garage/Customize. Player 2 só usa garage2 no
        // modo local1v1; em single-player fica como skate magenta por defeito.
        var corP1 = resolverCor(garage, 0x00ffff);
        var ehDuelo = (modoJogoAtual === 'local1v1' || modoJogoAtual === 'split1v1');
        var corP2 = ehDuelo ? resolverCor(garage2, COR_SKATE_J2) : COR_SKATE_J2;

        motaJogador1 = buildVehicle(garage, 0x00ffff);
        motaJogador1.position.set(-5, 0, 0);
        motaJogador1.rotation.y = 0;
        cena.add(motaJogador1);
        if (luzes.pontoMota1) luzes.pontoMota1.color.set(corP1);

        skateJogador2 = ehDuelo ? buildVehicle(garage2, COR_SKATE_J2) : criarSkate(corP2);
        skateJogador2.position.set(5, 0, 0);
        skateJogador2.rotation.y = Math.PI;
        cena.add(skateJogador2);
        if (luzes.pontoMota2) luzes.pontoMota2.color.set(corP2);

        inicializarInput(motaJogador1, skateJogador2, ARENA);
        definirObstaculos(grupoArena);

        // Trails — cor sincronizada com a do veículo correspondente. No 1v1
        // o P2 usa o rasto escolhido em garage2; no AI usa o mesmo do P1.
        var trailIdP1 = garage && garage.trailId;
        var trailIdP2 = (ehDuelo && garage2 && garage2.trailId) ? garage2.trailId : trailIdP1;
        trailMota = criarTrail(corP1, 300, trailIdP1);
        trailSkate = criarTrail(corP2, 300, trailIdP2);
        cena.add(trailMota.mesh);
        cena.add(trailSkate.mesh);

        // No modo "ai" o skate é controlado pela IA; no "local1v1" ambos os
        // jogadores são humanos (setas vs WASD) e a IA fica desligada.
        var iaJ2Ativa = (modoJogoAtual !== 'local1v1' && modoJogoAtual !== 'split1v1');
        definirIAJ1Ativa(false);
        definirIAJ2Ativa(iaJ2Ativa);
        if (iaJ2Ativa) {
            var aiDif = (menuSettings && menuSettings.aiDifficulty) || 'medium';
            inicializarIA(skateJogador2, trailSkate, trailMota, ARENA / 2, aiDif);
        }

        // HUD do nitro/boost — colocado no canto inferior direito.
        criarHudBoost({ gameMode: modoJogoAtual, cores: { 1: corP1, 2: corP2 } });

        // Configurar e arrancar a primeira ronda
        configurarGameLogic({
            cena: cena,
            arena: ARENA,
            motaRef: motaJogador1,
            skateRef: skateJogador2,
            trailMota: trailMota,
            trailSkate: trailSkate,
            cores: { 1: corP1, 2: corP2 },
            gameMode: modoJogoAtual,
            vidasIniciais: (menuSettings && menuSettings.vidasIniciais) || 3,
            onMatchEnd: function () { backToMenu(); }
        });
        iniciarRonda();

        // Câmara: no modo 1v1 fica obrigatoriamente em topo (estilo Tron de 1982).
        // No modo single-player respeita a preferência das definições.
        if (modoJogoAtual === 'local1v1') {
            camaraAtiva = camaraOrtografica;
            modoCamara = 'topo';
            aplicarModoCamara();
        } else if (modoJogoAtual === 'split1v1') {
            camaraAtiva = camaraPerspetiva;
            modoCamara = 'terceiraPessoa';
            aplicarModoCamara();
        } else if (menuSettings && menuSettings.visual && menuSettings.visual.cameraMode === 'orthographic') {
            camaraAtiva = camaraOrtografica;
            modoCamara = 'topo';
        } else {
            camaraAtiva = camaraPerspetiva;
            modoCamara = 'terceiraPessoa';
            aplicarModoCamara();
        }

        // Atualiza a interface GUI com as novas referências do mapa
        updateDebugContext(luzes, cena, grupoArena);

        onResize(window.innerWidth, window.innerHeight);

        // Pré-compilação de shaders na GPU para evitar stutter no primeiro frame
        preCompilarExplosoes(renderer, cena, camaraAtiva);
        if (modoJogoAtual === 'split1v1') preCompilarExplosoes(renderer, cena, camaraPerspetivaP2);

        var divider = document.getElementById('split-divider');
        if (!divider) {
            divider = document.createElement('div');
            divider.id = 'split-divider';
            divider.style.cssText = 'position:fixed; top:0; left:50%; width:4px; height:100%; background: linear-gradient(to bottom, #00eaff, #ff2bd6); z-index:1300; transform:translateX(-50%); display:none; pointer-events:none; box-shadow: 0 0 15px #00eaff;';
            document.body.appendChild(divider);
        }
        divider.style.display = (modoJogoAtual === 'split1v1') ? 'block' : 'none';
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
        if (e.key === 'Escape') { backToMenu(); return; }
        // No modo 1v1 a câmara é fixa em topo — os toggles C/V/B ficam inativos
        // para não partir o equilíbrio do split-keyboard.
        if (modoJogoAtual === 'local1v1' || modoJogoAtual === 'split1v1') return;
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
    });

    function update(delta) {
        atualizarSpace(delta);
        atualizarDeserto(delta);
        atualizarJungle(delta);
        atualizarMota(delta);
        atualizarSkate(delta);
        atualizarSpeeder(delta);
        if (modoJogoAtual !== 'local1v1' && modoJogoAtual !== 'split1v1') atualizarIA(delta);
        atualizarMotas(delta);
        atualizarGameLogic(delta);
        atualizarHudBoost();

        if (luzes && motaJogador1) {
            luzes.pontoMota1.position.copy(motaJogador1.position);
            luzes.pontoMota1.position.y += 1.5;
        }
        if (luzes && skateJogador2) {
            luzes.pontoMota2.position.copy(skateJogador2.position);
            luzes.pontoMota2.position.y += 1.5;
        }

        var alvo = motaJogador1;
        if (modoCamara === 'terceiraPessoa' && alvo) {
            posCamTemp.copy(offsetTerceiraPessoa).applyQuaternion(alvo.quaternion);
            posCamTemp.add(alvo.position);
            alvoCamTemp.copy(alvoTerceiraPessoa).applyQuaternion(alvo.quaternion);
            alvoCamTemp.add(alvo.position);

            if (modoCamaraAnterior !== 'terceiraPessoa') camaraPerspetiva.position.copy(posCamTemp);
            else camaraPerspetiva.position.lerp(posCamTemp, Math.min(1, 8 * delta));
            camaraPerspetiva.lookAt(alvoCamTemp);
        }

        if (modoJogoAtual === 'split1v1' && skateJogador2) {
            posCamTempP2.copy(offsetTerceiraPessoa).applyQuaternion(skateJogador2.quaternion);
            posCamTempP2.add(skateJogador2.position);
            alvoCamTempP2.copy(alvoTerceiraPessoa).applyQuaternion(skateJogador2.quaternion);
            alvoCamTempP2.add(skateJogador2.position);

            if (modoCamaraAnterior !== 'terceiraPessoa') camaraPerspetivaP2.position.copy(posCamTempP2);
            else camaraPerspetivaP2.position.lerp(posCamTempP2, Math.min(1, 8 * delta));
            camaraPerspetivaP2.lookAt(alvoCamTempP2);
        }

        if (modoCamara === 'livre') controlos.update();
        modoCamaraAnterior = modoCamara;

        // --- ANIMAÇÃO DE ENERGIA INSTÁVEL (Tremor e Pulso nos Trails) ---
        var camP1 = camaraAtiva;
        var camP2 = (modoJogoAtual === 'split1v1') ? camaraPerspetivaP2 : camaraAtiva;
        if (trailMota)  atualizarTrail(trailMota, delta, camP1);
        if (trailSkate) atualizarTrail(trailSkate, delta, camP2);
    }

    function render() {
        if (modoJogoAtual === 'split1v1') {
            var w = window.innerWidth;
            var h = window.innerHeight;

            renderer.setScissorTest(true);

            // Player 1 (Left half)
            renderer.setScissor(0, 0, w / 2, h);
            renderer.setViewport(0, 0, w / 2, h);
            renderer.render(cena, camaraPerspetiva);

            // Player 2 (Right half)
            renderer.setScissor(w / 2, 0, w / 2, h);
            renderer.setViewport(w / 2, 0, w / 2, h);
            renderer.render(cena, camaraPerspetivaP2);

            renderer.setScissorTest(false);
            renderer.setViewport(0, 0, w, h);
        } else {
            renderer.render(cena, camaraAtiva);
        }
    }

    function onResize(w, h) {
        var asp = (modoJogoAtual === 'split1v1') ? (w / 2) / h : w / h;
        camaraPerspetiva.aspect = asp;
        camaraPerspetiva.updateProjectionMatrix();
        camaraPerspetivaP2.aspect = asp;
        camaraPerspetivaP2.updateProjectionMatrix();

        var aspOrto = w / h;
        camaraOrtografica.left = -tamanhoOrto * aspOrto;
        camaraOrtografica.right = tamanhoOrto * aspOrto;
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

    function teardown() {
        limparGameLogic();
        if (trailMota) { destruirTrail(trailMota, cena); trailMota = null; }
        if (trailSkate) { destruirTrail(trailSkate, cena); trailSkate = null; }
        var divider = document.getElementById('split-divider');
        if (divider) divider.style.display = 'none';
        destruirHudBoost();
    }

    return {
        startWithMap: startWithMap,
        update: update,
        render: render,
        onResize: onResize,
        applySettings: applySettings,
        teardown: teardown,
        // Expostos para compileAsync no onStartGame
        _cena: cena,
        _camaraPerspetiva: camaraPerspetiva
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
