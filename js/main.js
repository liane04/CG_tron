import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { aoIniciarJogo, mostrarMenu } from './menu.js';
import { criarArena, atualizarDeserto, atualizarJungle, atualizarNeve } from './arena.js';
import { criarMota } from './mota.js';

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
var ARENA = 70;

// --- Câmara Ortográfica (vista topo) — câmara de jogo principal ---
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

// --- Câmara Follow (segue a mota em perspetiva) ---
var camaraFollow = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    800
);
var FOLLOW_OFFSET_Z = -4.5;  // distância atrás
var FOLLOW_OFFSET_Y =  1.8;  // altura da câmara acima da mota
var FOLLOW_LERP     =  0.08; // suavização (0 = parado, 1 = instantâneo)

var camaraAtiva = camaraOrtografica;

// --- Controlos de Órbita (câmara de topo) ---
var controlos = new OrbitControls(camaraOrtografica, renderer.domElement);
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
    luzAmbiente.intensity = 1.2;   // valor por omissão; a jungle regula para baixo

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
        // Sol filtrado pelas copas — luz fria esverdeada, vinda de um ângulo lateral.
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
        // Luz principal branca intensa de ângulo baixo — rasante cria sombras longas
        luzAmbiente.intensity = 0.3;
        luzDirecional.color.set(0xffffff);
        luzDirecional.intensity = 3.0;
        luzDirecional.position.set(-40, 20, 10);
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

    // --- Mota de pré-visualização no centro da arena ---
    var corNeon = mapa.corNeonMota !== undefined ? mapa.corNeonMota : 0x00ffff;
    grupoMota = criarMota(corNeon);
    grupoMota.position.set(0, 0, 0);
    cena.add(grupoMota);
});

// --- Redimensionamento ---
window.addEventListener('resize', function () {
    var asp = window.innerWidth / window.innerHeight;

    camaraOrtografica.left = -tamanhoOrto * asp;
    camaraOrtografica.right = tamanhoOrto * asp;
    camaraOrtografica.top = tamanhoOrto;
    camaraOrtografica.bottom = -tamanhoOrto;
    camaraOrtografica.updateProjectionMatrix();

    camaraFollow.aspect = asp;
    camaraFollow.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Input de teclado ---
window.addEventListener('keydown', function (e) {
    var key = e.key.toLowerCase();

    if (key === 'c') {
        // Alternar: Vista Topo (orto)
        camaraAtiva = camaraOrtografica;
        controlos.enabled = true;
    }

    if (key === 'x') {
        // Alternar: Follow Camera
        if (camaraAtiva === camaraFollow) {
            camaraAtiva = camaraOrtografica;
            controlos.enabled = true;
        } else {
            camaraAtiva = camaraFollow;
            controlos.enabled = false;
        }
    }

    if (key === 'escape') {
        mostrarMenu();
    }
});

// --- Start / Loop ---
function Start() {
    criarHUD();
    requestAnimationFrame(loop);
}

function atualizarCamaraFollow() {
    if (!grupoMota) return;

    // Posição alvo: offset atrás e acima da mota em espaço mundo
    // A mota está orientada ao longo do eixo Z (nariz para +Z),
    // por isso a câmara fica em -Z relativo.
    var posAlvo = new THREE.Vector3(
        grupoMota.position.x,
        grupoMota.position.y + FOLLOW_OFFSET_Y,
        grupoMota.position.z + FOLLOW_OFFSET_Z
    );

    // Interpolação suave (lerp) para evitar movimento brusco
    camaraFollow.position.lerp(posAlvo, FOLLOW_LERP);

    // Ponto de mira: ligeiramente acima do centro da mota
    var alvo = new THREE.Vector3(
        grupoMota.position.x,
        grupoMota.position.y + 0.5,
        grupoMota.position.z
    );
    camaraFollow.lookAt(alvo);
}

function loop() {
    var delta = reloginho.getDelta();
    atualizarDeserto(delta);
    atualizarJungle(delta);
    atualizarNeve(delta);

    if (camaraAtiva === camaraFollow) {
        atualizarCamaraFollow();
    } else {
        controlos.update();
    }

    renderer.render(cena, camaraAtiva);
    requestAnimationFrame(loop);
}

// --- HUD de teclas ---
function criarHUD() {
    var hud = document.createElement('div');
    hud.id = 'hud-cameras';
    hud.style.cssText = [
        'position:fixed',
        'bottom:18px',
        'right:18px',
        'display:flex',
        'flex-direction:column',
        'gap:6px',
        'pointer-events:none',
        'font-family:monospace',
        'z-index:100'
    ].join(';');

    var teclas = [
        { key: 'C', desc: 'Vista Topo'    },
        { key: 'X', desc: 'Follow Camera' },
        { key: 'ESC', desc: 'Menu'        }
    ];

    teclas.forEach(function (t) {
        var linha = document.createElement('div');
        linha.style.cssText = 'display:flex;align-items:center;gap:8px';

        var badge = document.createElement('span');
        badge.textContent = t.key;
        badge.style.cssText = [
            'background:rgba(0,200,255,0.15)',
            'border:1px solid rgba(0,200,255,0.5)',
            'color:#00d4ff',
            'padding:2px 7px',
            'border-radius:4px',
            'font-size:11px',
            'letter-spacing:1px',
            'min-width:36px',
            'text-align:center'
        ].join(';');

        var label = document.createElement('span');
        label.textContent = t.desc;
        label.style.cssText = 'color:rgba(255,255,255,0.55);font-size:11px';

        linha.appendChild(badge);
        linha.appendChild(label);
        hud.appendChild(linha);
    });

    document.body.appendChild(hud);
}
