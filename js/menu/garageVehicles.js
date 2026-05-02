// Garage uses the same vehicle factories the game uses, so the model the user
// previews is the actual model they'll drive. We wrap each factory in a build
// function that adds a small podium-friendly scale tweak.
import * as THREE from 'three';
import { criarMota } from '../mota.js';
import { criarSkate } from '../skate.js';
import { criarSpeeder } from '../speeder.js';
import { criarGlider } from '../glider.js';

export var COLORS = [
    { id: 'cyan',    name: 'CYBER CYAN',    hex: 0x00eaff, finish: 'metallic' },
    { id: 'magenta', name: 'NEON MAGENTA',  hex: 0xff2bd6, finish: 'metallic' },
    { id: 'yellow',  name: 'SUNSET GOLD',   hex: 0xffc83a, finish: 'matte' },
    { id: 'green',   name: 'TOXIC LIME',    hex: 0x59ff7c, finish: 'neon' },
    { id: 'purple',  name: 'ULTRA VIOLET',  hex: 0x9438ff, finish: 'metallic' },
    { id: 'red',     name: 'LASER RED',     hex: 0xff2244, finish: 'neon' }
];

// In-game vehicle factories take only a colour, so the colour finish ('matte',
// 'neon', etc.) is decorative-only at the moment — the underlying vehicle uses
// the hex value directly. The visual difference between finishes still shows
// up on the colour swatches in the row.

export var VEHICLES = [
    {
        id: 'mota',
        name: 'LIGHT CYCLE',
        stats: { speed: 0.85, acceleration: 0.75, handling: 0.7 },
        build: function (color) {
            // The mota is built fairly large with its own internal scale; shrink
            // it slightly so it sits comfortably on the garage podium.
            var v = criarMota(color.hex);
            v.scale.multiplyScalar(2.2);
            return v;
        },
        podiumOffsetY: 0
    },
    {
        id: 'skate',
        name: 'HOVER SKATE',
        stats: { speed: 0.7, acceleration: 0.9, handling: 0.85 },
        build: function (color) {
            var v = criarSkate(color.hex);
            v.scale.multiplyScalar(2.2);
            return v;
        },
        podiumOffsetY: 0.5
    },
    {
        id: 'speeder',
        name: 'SPEEDER X1',
        stats: { speed: 0.95, acceleration: 0.7, handling: 0.6 },
        build: function (color) {
            var v = criarSpeeder(color.hex);
            v.scale.multiplyScalar(1.6);
            return v;
        },
        podiumOffsetY: 0
    },
    {
        id: 'glider',
        name: 'GLIDER V9',
        stats: { speed: 0.8, acceleration: 0.95, handling: 0.55 },
        build: function (color) {
            var v = criarGlider(color.hex);
            v.scale.multiplyScalar(1.6);
            return v;
        },
        podiumOffsetY: 0
    }
];

export function findVehicle(id) {
    for (var i = 0; i < VEHICLES.length; i++) if (VEHICLES[i].id === id) return VEHICLES[i];
    return VEHICLES[0];
}
export function findColor(id) {
    for (var i = 0; i < COLORS.length; i++) if (COLORS[i].id === id) return COLORS[i];
    return COLORS[0];
}

// Each vehicle factory bakes the colour at construction time. To "apply" a
// new colour we just rebuild — the textures cache after the first load so this
// is cheap. Returns the new mesh; the caller swaps it on the podium.
export function rebuildWithColor(vehicleDef, color) {
    return vehicleDef.build(color);
}
