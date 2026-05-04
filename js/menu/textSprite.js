// Pixel/neon-style text rendering via canvas-texture sprites and planes.
// Uses Orbitron (loaded via Google Fonts in index.html) as the primary
// typeface. Text planes register themselves so once the webfont finishes
// loading we can rebuild every texture with the proper font.
import * as THREE from 'three';

var DEFAULT_FONT = '"Orbitron", "Share Tech Mono", "Courier New", monospace';
var registry = []; // every live text plane, so we can rebuild on font-ready
var fontReady = false;

// Trigger a rebuild of every live text plane once the webfont resolves.
if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    Promise.all([
        document.fonts.load('900 96px Orbitron'),
        document.fonts.load('700 64px Orbitron'),
        document.fonts.load('500 32px Orbitron')
    ]).then(function () {
        fontReady = true;
        registry.forEach(function (entry) {
            if (!entry.mesh || !entry.mesh.material) return;
            redrawInPlace(entry.mesh, entry.text, entry.opts);
        });
    }).catch(function () { /* font failed; fall back is fine */ });
}

function buildTexture(text, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 96;
    var color    = opts.color    || '#ffffff';
    var glowColor = opts.glowColor || color;
    var bgColor  = opts.bgColor  || 'rgba(0,0,0,0)';
    var padding  = opts.padding != null ? opts.padding : 36;
    var fontFamily = opts.fontFamily || DEFAULT_FONT;
    var weight = opts.weight || '900';
    var letterSpacing = opts.letterSpacing != null ? opts.letterSpacing : 0;
    var glowStrength = opts.glowStrength != null ? opts.glowStrength : 1.0;

    // Measure
    var measureCanvas = document.createElement('canvas');
    var mctx = measureCanvas.getContext('2d');
    mctx.font = weight + ' ' + fontSize + 'px ' + fontFamily;
    var textWidth = Math.ceil(mctx.measureText(text).width + letterSpacing * Math.max(0, text.length - 1));
    var textHeight = Math.ceil(fontSize * 1.25);

    var canvas = document.createElement('canvas');
    canvas.width  = textWidth + padding * 2;
    canvas.height = textHeight + padding * 2;

    var ctx = canvas.getContext('2d');
    if (bgColor && bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = weight + ' ' + fontSize + 'px ' + fontFamily;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    function draw(t) {
        if (letterSpacing === 0) {
            ctx.fillText(t, cx, cy);
        } else {
            // Manual letter-spacing for the chunky display fonts
            var w = ctx.measureText(t).width + letterSpacing * (t.length - 1);
            var x = cx - w / 2;
            for (var i = 0; i < t.length; i++) {
                var ch = t.charAt(i);
                var cw = ctx.measureText(ch).width;
                ctx.fillText(ch, x + cw / 2, cy);
                x += cw + letterSpacing;
            }
        }
    }

    // Multi-layer glow: outer wide halo, middle ring, sharp core.
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18 * glowStrength;
    ctx.fillStyle = glowColor;
    draw(text);
    ctx.shadowBlur = 8 * glowStrength;
    draw(text);
    // Crisp core (full color, no glow)
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    draw(text);

    var tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return { texture: tex, width: canvas.width, height: canvas.height };
}

export function makeTextTexture(text, opts) { return buildTexture(text, opts); }

// Returns a plane mesh sized so 1 world unit ~= worldHeight tall.
export function makeTextPlane(text, opts) {
    opts = opts || {};
    var info = buildTexture(text, opts);
    var worldHeight = opts.worldHeight || 1;
    var aspect = info.width / info.height;
    var geo = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
    var mat = new THREE.MeshBasicMaterial({
        map: info.texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.userData.textInfo = info;
    mesh.userData.textOpts = opts;
    mesh.userData.textValue = text;

    // Register so once Orbitron loads we rebuild this plane in place.
    registry.push({ mesh: mesh, text: text, opts: opts });
    if (registry.length > 800) registry.shift(); // bound the registry

    return mesh;
}

function redrawInPlace(mesh, text, opts) {
    var info = buildTexture(text, opts);
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.map = info.texture;
    mesh.material.needsUpdate = true;
    var worldHeight = (opts && opts.worldHeight) ? opts.worldHeight : mesh.geometry.parameters.height;
    var aspect = info.width / info.height;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
    mesh.userData.textInfo = info;
}

// Replaces the texture on a previously-built text plane in place.
export function updateTextPlane(mesh, text, opts) {
    redrawInPlace(mesh, text, opts);
    mesh.userData.textOpts = opts;
    mesh.userData.textValue = text;
    // Keep the registry entry up to date so font-ready rebuilds render the
    // current text, not the original.
    for (var i = 0; i < registry.length; i++) {
        if (registry[i].mesh === mesh) {
            registry[i].text = text;
            registry[i].opts = opts;
            break;
        }
    }
}

export function isFontReady() { return fontReady; }
