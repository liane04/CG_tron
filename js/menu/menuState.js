// Menu state machine. Holds the current screen, runs transitions and routes
// "Game start" requests up to the host (main.js) so the existing game can run
// against the same renderer.

import { moveTo, ANCHORS } from './cameraRig.js';
import { setActiveHandler, setHoverables } from './inputManager.js';

import { showSplash, hideSplash, getSplashHandler, updateSplash } from './screens/splashScreen.js';
import { showMainMenu, hideMainMenu, getMainMenuHandler, getMainMenuHoverables, updateMainMenu } from './screens/mainMenu.js';
import { showGarage, hideGarage, getGarageHandler, getGarageHoverables, updateGarage } from './screens/garage.js';
import { showSettings, hideSettings, getSettingsHandler, updateSettings } from './screens/settings.js';
import { showTrackSelect, hideTrackSelect, getTrackSelectHandler, getTrackSelectHoverables, updateTrackSelect } from './screens/trackSelect.js';
import { showCustomize, hideCustomize, getCustomizeHandler, getCustomizeHoverables, updateCustomize } from './screens/customize.js';
import { showModeSelect, hideModeSelect, getModeSelectHandler, getModeSelectHoverables, updateModeSelect } from './screens/modeSelect.js';

import { saveSettings } from './settingsStore.js';

export var STATES = {
    SPLASH: 'SPLASH',
    MAIN: 'MAIN',
    MODE_SELECT: 'MODE_SELECT',
    GARAGE: 'GARAGE',
    SETTINGS: 'SETTINGS',
    TRACK_SELECT: 'TRACK_SELECT',
    GAME: 'GAME',
    CUSTOMIZE: 'CUSTOMIZE'
};

var currentState = STATES.SPLASH;
var settings = null;
var onStartGame = null;
// What to do once a track is picked. We send the user straight to the game.
var pendingAfterTrackSelect = null;
// Qual jogador está a ser configurado no fluxo de personalização.
//   null  → fluxo single-player (AI) ou acesso direto à garagem do menu (sem label)
//   1 / 2 → fluxo 1v1, cada jogador escolhe a sua mota/cor/rasto sequencialmente
var customizingPlayer = null;

function garageForPlayer(p) {
    return p === 2 ? settings.garage2 : settings.garage;
}

function clearHoverables() { setHoverables([]); }

function goToState(next, opts) {
    if (next === currentState) return;
    var prev = currentState;
    currentState = next;

    var hideAfter = function () {
        if (prev === STATES.SPLASH)        hideSplash();
        if (prev === STATES.MAIN)          hideMainMenu();
        if (prev === STATES.MODE_SELECT)   hideModeSelect();
        if (prev === STATES.GARAGE)        hideGarage();
        if (prev === STATES.SETTINGS)      hideSettings();
        if (prev === STATES.TRACK_SELECT)  hideTrackSelect();
        if (prev === STATES.CUSTOMIZE)     hideCustomize();
    };

    if (next === STATES.GAME) {
        clearHoverables();
        setActiveHandler(null);
        moveTo('GAME_HANDOFF', {
            duration: 1.0,
            onComplete: function () {
                hideAfter();
                if (onStartGame) onStartGame(settings);
            }
        });
    } else {
        hideAfter();

        if (next === STATES.SPLASH) {
            showSplash();
            setHoverables([]);
            setActiveHandler(splashHandler);
            moveTo('SPLASH');
        } else if (next === STATES.MAIN) {
            showMainMenu();
            setHoverables(getMainMenuHoverables());
            setActiveHandler(mainHandler);
            moveTo('MAIN');
        } else if (next === STATES.GARAGE) {
            showGarage(garageForPlayer(customizingPlayer), customizingPlayer);
            setHoverables(getGarageHoverables());
            setActiveHandler(garageHandler);
            moveTo('GARAGE');
        } else if (next === STATES.SETTINGS) {
            showSettings();
            setHoverables([]);
            setActiveHandler(settingsHandler);
            moveTo('SETTINGS');
        } else if (next === STATES.TRACK_SELECT) {
            showTrackSelect(settings.track);
            setHoverables(getTrackSelectHoverables());
            setActiveHandler(trackSelectHandler);
            moveTo('TRACK_SELECT');
        } else if (next === STATES.CUSTOMIZE) {
            showCustomize(garageForPlayer(customizingPlayer), customizingPlayer);
            setHoverables(getCustomizeHoverables());
            setActiveHandler(customizeHandler);
            moveTo('CUSTOMIZE');
        } else if (next === STATES.MODE_SELECT) {
            showModeSelect(settings.gameMode);
            setHoverables(getModeSelectHoverables());
            setActiveHandler(modeSelectHandler);
            moveTo('MODE_SELECT');
        }
    }
}

// --- Handlers (built lazily after screens exist) ---
var splashHandler, mainHandler, garageHandler, settingsHandler, trackSelectHandler, customizeHandler, modeSelectHandler;

export function initMenuState(initialSettings, opts) {
    settings = initialSettings;
    onStartGame = opts.onStartGame || null;

    splashHandler = getSplashHandler(function () {
        goToState(STATES.MAIN);
    });

    mainHandler = getMainMenuHandler({
        onSelect: function (id) {
            if (id === 'play')     goToState(STATES.MODE_SELECT);
            if (id === 'garage')   { customizingPlayer = null; goToState(STATES.GARAGE); }
            if (id === 'settings') goToState(STATES.SETTINGS);
        },
        onBack: function () { goToState(STATES.SPLASH); }
    });

    modeSelectHandler = getModeSelectHandler({
        onConfirm: function (selection) {
            settings.gameMode = selection.modeId;
            saveSettings(settings);
            // No 1v1 o P1 é o primeiro a configurar; no AI mantemos null (sem label)
            customizingPlayer = (selection.modeId === 'local1v1') ? 1 : null;
            goToState(STATES.GARAGE);
        },
        onBack: function () { goToState(STATES.MAIN); }
    });

    garageHandler = getGarageHandler({
        onConfirm: function (selection) {
            garageForPlayer(customizingPlayer).vehicleId = selection.vehicleId;
            saveSettings(settings);
            goToState(STATES.CUSTOMIZE);
        },
        onBack: function () {
            // No 1v1 e a meio do P2, voltar para a personalização do P1
            if (customizingPlayer === 2) {
                customizingPlayer = 1;
                goToState(STATES.CUSTOMIZE);
            } else if (customizingPlayer === 1) {
                goToState(STATES.MODE_SELECT);
            } else {
                goToState(STATES.MAIN);
            }
        }
    });

    customizeHandler = getCustomizeHandler({
        onConfirm: function (selection) {
            var g = garageForPlayer(customizingPlayer);
            g.colorId = selection.colorId;
            g.trailId = selection.trailId;
            saveSettings(settings);
            // No 1v1, após o P1 segue-se a Garage do P2
            if (settings.gameMode === 'local1v1' && customizingPlayer === 1) {
                customizingPlayer = 2;
                goToState(STATES.GARAGE);
            } else {
                goToState(STATES.TRACK_SELECT);
            }
        },
        onBack: function (selection) {
            var g = garageForPlayer(customizingPlayer);
            g.colorId = selection.colorId;
            g.trailId = selection.trailId;
            saveSettings(settings);
            goToState(STATES.GARAGE);
        }
    });

    settingsHandler = getSettingsHandler({
        onChange: function (s) { saveSettings(s); if (opts.onSettingsChange) opts.onSettingsChange(s); },
        onBack: function () { saveSettings(settings); goToState(STATES.MAIN); }
    });

    trackSelectHandler = getTrackSelectHandler({
        onConfirm: function (selection) {
            if (!settings.track) settings.track = { mapId: 'space' };
            settings.track.mapId = selection.mapId;
            saveSettings(settings);
            goToState(STATES.GAME);
        },
        onBack: function () { goToState(STATES.MAIN); }
    });

    showSplash();
    setActiveHandler(splashHandler);
}

export function getCurrentState() { return currentState; }

export function returnToMenu() {
    showSplash();
    setActiveHandler(splashHandler);
    setHoverables([]);
    currentState = STATES.SPLASH;
    moveTo('SPLASH', { duration: 0.6 });
}

export function updateMenuState(dt) {
    updateSplash(dt);
    updateMainMenu(dt);
    updateModeSelect(dt);
    updateGarage(dt);
    updateCustomize(dt);
    updateSettings(dt);
    updateTrackSelect(dt);
}
