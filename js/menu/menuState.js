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

import { saveSettings } from './settingsStore.js';

export var STATES = {
    SPLASH: 'SPLASH',
    MAIN: 'MAIN',
    GARAGE: 'GARAGE',
    SETTINGS: 'SETTINGS',
    TRACK_SELECT: 'TRACK_SELECT',
    GAME: 'GAME'
};

var currentState = STATES.SPLASH;
var settings = null;
var onStartGame = null;
// What to do once a track is picked. We send the user straight to the game.
var pendingAfterTrackSelect = null;

function clearHoverables() { setHoverables([]); }

function goToState(next, opts) {
    if (next === currentState) return;
    var prev = currentState;
    currentState = next;

    var hideAfter = function () {
        if (prev === STATES.SPLASH)        hideSplash();
        if (prev === STATES.MAIN)          hideMainMenu();
        if (prev === STATES.GARAGE)        hideGarage();
        if (prev === STATES.SETTINGS)      hideSettings();
        if (prev === STATES.TRACK_SELECT)  hideTrackSelect();
    };

    if (next === STATES.SPLASH) {
        showSplash();
        setHoverables([]);
        setActiveHandler(splashHandler);
        moveTo('SPLASH', { onComplete: hideAfter });
    } else if (next === STATES.MAIN) {
        showMainMenu();
        setHoverables(getMainMenuHoverables());
        setActiveHandler(mainHandler);
        moveTo('MAIN', { onComplete: hideAfter });
    } else if (next === STATES.GARAGE) {
        showGarage(settings.garage);
        setHoverables(getGarageHoverables());
        setActiveHandler(garageHandler);
        moveTo('GARAGE', { onComplete: hideAfter });
    } else if (next === STATES.SETTINGS) {
        showSettings();
        setHoverables([]);
        setActiveHandler(settingsHandler);
        moveTo('SETTINGS', { onComplete: hideAfter });
    } else if (next === STATES.TRACK_SELECT) {
        showTrackSelect(settings.track);
        setHoverables(getTrackSelectHoverables());
        setActiveHandler(trackSelectHandler);
        moveTo('TRACK_SELECT', { onComplete: hideAfter });
    } else if (next === STATES.GAME) {
        clearHoverables();
        setActiveHandler(null);
        moveTo('GAME_HANDOFF', {
            duration: 1.0,
            onComplete: function () {
                hideAfter();
                if (onStartGame) onStartGame(settings);
            }
        });
    }
}

// --- Handlers (built lazily after screens exist) ---
var splashHandler, mainHandler, garageHandler, settingsHandler, trackSelectHandler;

export function initMenuState(initialSettings, opts) {
    settings = initialSettings;
    onStartGame = opts.onStartGame || null;

    splashHandler = getSplashHandler(function () {
        goToState(STATES.MAIN);
    });

    mainHandler = getMainMenuHandler({
        onSelect: function (id) {
            if (id === 'play')     goToState(STATES.TRACK_SELECT);
            if (id === 'garage')   goToState(STATES.GARAGE);
            if (id === 'settings') goToState(STATES.SETTINGS);
            if (id === 'records')  {
                console.info('[menu] RECORDS screen not implemented');
            }
        },
        onBack: function () { goToState(STATES.SPLASH); }
    });

    garageHandler = getGarageHandler({
        onConfirm: function (selection) {
            settings.garage.vehicleId = selection.vehicleId;
            settings.garage.colorId = selection.colorId;
            saveSettings(settings);
            // After picking a vehicle, jump to track select then the game.
            goToState(STATES.TRACK_SELECT);
        },
        onBack: function (selection) {
            settings.garage.vehicleId = selection.vehicleId;
            settings.garage.colorId = selection.colorId;
            saveSettings(settings);
            goToState(STATES.MAIN);
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
    updateGarage(dt);
    updateSettings(dt);
    updateTrackSelect(dt);
}
