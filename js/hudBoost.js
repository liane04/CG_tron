// HUD de Nitro/Boost — barra no canto inferior direito.
// Em single-player mostra apenas o jogador humano (J1).
// No modo local1v1 mostra ambos os jogadores, empilhados.

import { obterBoost, obterBoostMax } from './input.js';

var container = null;
var barras = []; // { idx, fill, label, cor }

function corHex(corNum) {
    return '#' + (corNum >>> 0).toString(16).padStart(6, '0');
}

function criarBarra(idx, cor, etiqueta) {
    var hex = corHex(cor);

    var wrap = document.createElement('div');
    wrap.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:flex-end',
        'gap:4px',
        'font-family:Orbitron, "Share Tech Mono", "Courier New", monospace',
        'letter-spacing:3px'
    ].join(';');

    var label = document.createElement('div');
    label.textContent = etiqueta + ' · NITRO';
    label.style.cssText = [
        'font-size:11px',
        'font-weight:700',
        'color:' + hex,
        'text-shadow:0 0 6px ' + hex
    ].join(';');

    var track = document.createElement('div');
    track.style.cssText = [
        'position:relative',
        'width:220px',
        'height:14px',
        'background:rgba(0,0,0,0.55)',
        'border:1px solid ' + hex,
        'box-shadow:0 0 8px ' + hex + ', inset 0 0 6px rgba(0,0,0,0.7)',
        'overflow:hidden'
    ].join(';');

    var fill = document.createElement('div');
    fill.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        'height:100%',
        'width:100%',
        'background:linear-gradient(90deg, ' + hex + ' 0%, #ffffff 100%)',
        'box-shadow:0 0 10px ' + hex + ', 0 0 18px ' + hex,
        'transition:width 60ms linear'
    ].join(';');
    track.appendChild(fill);

    wrap.appendChild(label);
    wrap.appendChild(track);

    return { idx: idx, wrap: wrap, fill: fill, track: track, cor: hex };
}

export function criarHudBoost(opts) {
    destruirHudBoost();
    var gameMode = opts && opts.gameMode ? opts.gameMode : 'ai';
    var cores = (opts && opts.cores) || {};
    var corP1 = cores[1] !== undefined ? cores[1] : 0x00eaff;
    var corP2 = cores[2] !== undefined ? cores[2] : 0xff2bd6;

    container = document.createElement('div');
    container.id = 'hud-nitro';
    container.style.cssText = [
        'position:fixed',
        'right:18px',
        'bottom:18px',
        'display:flex',
        'flex-direction:column',
        'align-items:flex-end',
        'gap:10px',
        'pointer-events:none',
        'z-index:50'
    ].join(';');

    barras = [];
    var ehDuelo = (gameMode === 'local1v1' || gameMode === 'split1v1');
    if (ehDuelo) {
        barras.push(criarBarra(1, corP1, 'P1 [↑]'));
        barras.push(criarBarra(2, corP2, 'P2 [W]'));
    } else {
        barras.push(criarBarra(1, corP1, 'P1 [↑]'));
    }
    for (var i = 0; i < barras.length; i++) container.appendChild(barras[i].wrap);

    document.body.appendChild(container);
}

export function atualizarHudBoost() {
    if (!container) return;
    var max = obterBoostMax();
    for (var i = 0; i < barras.length; i++) {
        var b = barras[i];
        var info = obterBoost(b.idx);
        var pct = Math.max(0, Math.min(1, info.carga / max));
        // Quantiza a 0.5% — evita layout/paint a cada frame por mudanças sub-pixel.
        var pctQ = Math.round(pct * 200);
        if (b._lastPctQ !== pctQ) {
            b.fill.style.width = (pctQ * 0.5).toFixed(1) + '%';
            b._lastPctQ = pctQ;
        }
        // Glow só muda quando o estado activo/inactivo muda — não em cada frame.
        if (b._lastAtivo !== info.ativo) {
            b.track.style.boxShadow = info.ativo
                ? '0 0 14px ' + b.cor + ', 0 0 24px ' + b.cor + ', inset 0 0 6px rgba(0,0,0,0.7)'
                : '0 0 8px ' + b.cor + ', inset 0 0 6px rgba(0,0,0,0.7)';
            b._lastAtivo = info.ativo;
        }
    }
}

export function mostrarHudBoost(visivel) {
    if (!container) return;
    container.style.display = visivel ? 'flex' : 'none';
}

export function destruirHudBoost() {
    if (container && container.parentNode) container.parentNode.removeChild(container);
    container = null;
    barras = [];
}
