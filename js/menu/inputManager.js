// Centralised keyboard/mouse routing for the menu screens.
// Each screen registers a handler when active; only the active handler receives input.

import * as THREE from 'three';

var activeHandler = null;
var keyListener = null;
var clickListener = null;
var moveListener = null;
var rendererEl = null;
var camera = null;
var pointer = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
var hoverables = [];
var globalEsc = null;

export function initInput(renderer, cam, opts) {
    rendererEl = renderer.domElement;
    camera = cam;
    opts = opts || {};
    globalEsc = opts.onEscape || null;

    keyListener = function (e) {
        var key = normaliseKey(e);
        var handled = false;
        if (activeHandler && activeHandler.onKey) {
            handled = activeHandler.onKey(key, e);
        }
        // Fallback: only fire the global ESC hook if no screen handler was active
        // or the active handler chose not to consume the keypress.
        if (!handled && key === 'ESC' && globalEsc) {
            globalEsc();
            handled = true;
        }
        if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', keyListener);

    moveListener = function (e) {
        var rect = rendererEl.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    rendererEl.addEventListener('mousemove', moveListener);

    clickListener = function (e) {
        if (!activeHandler || !activeHandler.onClick) return;
        var hit = pickHoverable();
        if (hit) activeHandler.onClick(hit.object, hit);
    };
    rendererEl.addEventListener('click', clickListener);
}

function normaliseKey(e) {
    if (e.key === 'ArrowUp')    return 'UP';
    if (e.key === 'ArrowDown')  return 'DOWN';
    if (e.key === 'ArrowLeft')  return 'LEFT';
    if (e.key === 'ArrowRight') return 'RIGHT';
    if (e.key === 'Enter')      return 'ENTER';
    if (e.key === 'Escape')     return 'ESC';
    if (e.key === 'Backspace')  return 'BACK';
    if (e.key === ' ')          return 'SPACE';
    if (e.key && e.key.length === 1) return e.key.toUpperCase();
    return e.key;
}

export function setActiveHandler(handler) {
    if (activeHandler && activeHandler.onLeave) activeHandler.onLeave();
    activeHandler = handler;
    if (activeHandler && activeHandler.onEnter) activeHandler.onEnter();
}

export function setHoverables(list) {
    hoverables = list || [];
}

function pickHoverable() {
    if (!hoverables.length) return null;
    raycaster.setFromCamera(pointer, camera);
    var hits = raycaster.intersectObjects(hoverables, true);
    return hits.length ? hits[0] : null;
}

// Called every frame to update hover highlight on the active screen.
export function updateInput() {
    if (!activeHandler || !activeHandler.onHover) return;
    var hit = pickHoverable();
    activeHandler.onHover(hit ? hit.object : null);
}

export function disposeInput() {
    if (keyListener)   window.removeEventListener('keydown', keyListener);
    if (moveListener)  rendererEl && rendererEl.removeEventListener('mousemove', moveListener);
    if (clickListener) rendererEl && rendererEl.removeEventListener('click', clickListener);
    keyListener = moveListener = clickListener = null;
    activeHandler = null;
}
