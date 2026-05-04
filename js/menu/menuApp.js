// Top-level orchestrator for the 3D menu system. Owns the menu's scene and
// camera; the game's scene/camera are owned by main.js. Both render to the
// same canvas — the host swaps which scene is being rendered.

import * as THREE from 'three';
import { buildEnvironment, updateEnvironment } from './environment.js';
import { initCameraRig, tickCameraRig } from './cameraRig.js';
import { buildPostFX, resizePostFX, setPostFXCamera, setQuality, tickPostFX, getComposer } from './postFX.js';
import { initInput, updateInput, setActiveHandler } from './inputManager.js';
import { updateTweens } from './tween.js';
import { setAudioSettings } from './audioManager.js';
import { loadSettings, saveSettings } from './settingsStore.js';

import { buildSplashScreen } from './screens/splashScreen.js';
import { buildMainMenu } from './screens/mainMenu.js';
import { buildGarage } from './screens/garage.js';
import { buildSettings } from './screens/settings.js';
import { buildTrackSelect } from './screens/trackSelect.js';
import { initMenuState, updateMenuState, returnToMenu, getCurrentState, STATES } from './menuState.js';

var menuScene = null;
var menuCamera = null;
var renderer = null;
var settings = null;
var environment = null;
var hostCallbacks = null;

export function initMenu(rendererRef, opts) {
    renderer = rendererRef;
    hostCallbacks = opts || {};
    settings = loadSettings();

    // --- Menu scene + camera ---
    menuScene = new THREE.Scene();
    menuCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

    environment = buildEnvironment(menuScene);
    initCameraRig(menuCamera);

    // Build all screens
    buildSplashScreen(menuScene, { title: opts.title || 'NEON DRIVE', subtitle: opts.subtitle || 'GRAND PRIX 2087' });
    buildMainMenu(menuScene);
    buildGarage(menuScene);
    buildSettings(menuScene, settings);
    buildTrackSelect(menuScene);

    // Post-FX
    buildPostFX(renderer, menuScene, menuCamera, {
        bloomStrength: 0.42, bloomRadius: 0.55, bloomThreshold: 0.45
    });
    setQuality(settings.visual.quality);

    // Input
    initInput(renderer, menuCamera, {
        onEscape: function () {
            // Global Esc = back/return; handled per-screen, but if nothing
            // catches it (game state etc.) we route to host
            if (getCurrentState() === STATES.GAME && hostCallbacks.onReturnFromGame) {
                hostCallbacks.onReturnFromGame();
            }
        }
    });

    // Apply persisted audio prefs
    setAudioSettings(settings.audio);

    // Initialise the state machine
    initMenuState(settings, {
        onStartGame: function (s) {
            saveSettings(s);
            if (hostCallbacks.onStartGame) hostCallbacks.onStartGame(s);
        },
        onSettingsChange: function (s) {
            setAudioSettings(s.audio);
            setQuality(s.visual.quality);
            if (hostCallbacks.onSettingsChange) hostCallbacks.onSettingsChange(s);
        }
    });

    return {
        scene: menuScene,
        camera: menuCamera,
        composer: getComposer(),
        update: updateMenu,
        resize: resizeMenu,
        getSettings: function () { return settings; }
    };
}

export function updateMenu(dt) {
    updateEnvironment(dt);
    updateMenuState(dt);
    updateTweens();
    tickCameraRig();
    tickPostFX(dt);
    updateInput();
}

export function resizeMenu(width, height) {
    if (!menuCamera) return;
    menuCamera.aspect = width / height;
    menuCamera.updateProjectionMatrix();
    resizePostFX(width, height);
}

export function showMenu() {
    returnToMenu();
}
