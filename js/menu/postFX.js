// Post-processing pipeline: UnrealBloomPass for the neon glow plus a custom
// CRT scanlines + subtle barrel-distortion shader pass for retro feel.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

var CRTShader = {
    uniforms: {
        tDiffuse:   { value: null },
        time:       { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        scanIntensity: { value: 0.06 },
        vignette:   { value: 0.30 },
        curvature:  { value: 0.0 }
    },
    vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
    ].join('\n'),
    fragmentShader: [
        'uniform sampler2D tDiffuse;',
        'uniform float time;',
        'uniform vec2 resolution;',
        'uniform float scanIntensity;',
        'uniform float vignette;',
        'uniform float curvature;',
        'varying vec2 vUv;',
        'vec2 curveUV(vec2 uv) {',
        '  uv = uv * 2.0 - 1.0;',
        '  vec2 offset = abs(uv.yx) / vec2(6.0 / curvature);',
        '  uv = uv + uv * offset * offset;',
        '  return uv * 0.5 + 0.5;',
        '}',
        'void main() {',
        '  vec2 uv = curveUV(vUv);',
        '  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {',
        '    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return;',
        '  }',
        '  vec3 col = texture2D(tDiffuse, uv).rgb;',
        '  // Very subtle chromatic aberration — reduced so text stays sharp',
        '  float ab = 0.0004;',
        '  col.r = texture2D(tDiffuse, uv + vec2(ab, 0.0)).r;',
        '  col.b = texture2D(tDiffuse, uv - vec2(ab, 0.0)).b;',
        '  // Scanlines',
        '  float scan = sin(uv.y * resolution.y * 1.4 + time * 4.0) * 0.5 + 0.5;',
        '  col *= 1.0 - scanIntensity * scan;',
        '  // Vignette',
        '  vec2 vUvCentered = uv - 0.5;',
        '  float vig = 1.0 - dot(vUvCentered, vUvCentered) * vignette;',
        '  col *= clamp(vig, 0.0, 1.0);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n')
};

var composer = null;
var bloomPass = null;
var crtPass = null;

export function buildPostFX(renderer, scene, camera, opts) {
    opts = opts || {};
    composer = new EffectComposer(renderer);
    composer.setSize(window.innerWidth, window.innerHeight);

    var renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        opts.bloomStrength != null ? opts.bloomStrength : 0.32,
        opts.bloomRadius != null ? opts.bloomRadius : 0.4,
        opts.bloomThreshold != null ? opts.bloomThreshold : 0.85
    );
    composer.addPass(bloomPass);

    crtPass = new ShaderPass(CRTShader);
    crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    composer.addPass(crtPass);

    composer.addPass(new OutputPass());
    return composer;
}

export function setPostFXCamera(camera) {
    if (!composer) return;
    composer.passes.forEach(function (p) {
        if (p.camera !== undefined) p.camera = camera;
    });
}

export function resizePostFX(width, height) {
    if (!composer) return;
    composer.setSize(width, height);
    if (crtPass) crtPass.uniforms.resolution.value.set(width, height);
}

export function setQuality(level) {
    if (!bloomPass) return;
    if (level === 'low')    { bloomPass.strength = 0.22; bloomPass.radius = 0.35; bloomPass.threshold = 0.55; if (crtPass) crtPass.uniforms.scanIntensity.value = 0.0; }
    if (level === 'medium') { bloomPass.strength = 0.32; bloomPass.radius = 0.45; bloomPass.threshold = 0.5;  if (crtPass) crtPass.uniforms.scanIntensity.value = 0.04; }
    if (level === 'high')   { bloomPass.strength = 0.42; bloomPass.radius = 0.55; bloomPass.threshold = 0.45; if (crtPass) crtPass.uniforms.scanIntensity.value = 0.06; }
}

export function tickPostFX(dt) {
    if (crtPass) crtPass.uniforms.time.value += dt;
}

export function getComposer() { return composer; }
