// Pixel/neon-style text rendering via canvas-texture sprites and planes.
// We avoid loading external fonts — the system uses 'Courier New' which is
// monospace-ish and works as a stand-in for the synthwave aesthetic.
import * as THREE from 'three';

export function makeTextTexture(text, opts) {
    opts = opts || {};
    var fontSize = opts.fontSize || 96;
    var color    = opts.color    || '#00ffff';
    var glowColor = opts.glowColor || color;
    var bgColor  = opts.bgColor  || 'rgba(0,0,0,0)';
    var padding  = opts.padding != null ? opts.padding : 24;
    var fontFamily = opts.fontFamily || '"Courier New", monospace';
    var weight = opts.weight || 'bold';

    // Measure text on an offscreen canvas
    var measureCanvas = document.createElement('canvas');
    var mctx = measureCanvas.getContext('2d');
    mctx.font = weight + ' ' + fontSize + 'px ' + fontFamily;
    var metrics = mctx.measureText(text);
    var textWidth = Math.ceil(metrics.width);
    var textHeight = Math.ceil(fontSize * 1.2);

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

    // Single subtle halo so the text reads cleanly without saturating bloom.
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Crisp top layer
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    var tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return { texture: tex, width: canvas.width, height: canvas.height };
}

// Returns a plane mesh sized so 1 world unit ~= worldHeight tall.
export function makeTextPlane(text, opts) {
    opts = opts || {};
    var info = makeTextTexture(text, opts);
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
    return mesh;
}

// Replaces the texture on a previously-built text plane in place.
export function updateTextPlane(mesh, text, opts) {
    var info = makeTextTexture(text, opts);
    var oldMap = mesh.material.map;
    mesh.material.map = info.texture;
    mesh.material.needsUpdate = true;
    if (oldMap) oldMap.dispose();
    var aspect = info.width / info.height;
    var worldHeight = (opts && opts.worldHeight) ? opts.worldHeight : mesh.geometry.parameters.height;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.PlaneGeometry(worldHeight * aspect, worldHeight);
    mesh.userData.textInfo = info;
}
