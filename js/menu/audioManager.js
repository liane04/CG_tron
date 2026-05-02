// Tiny WebAudio-backed audio manager. We synthesize SFX inline so the menu
// has audio feedback without bundling sound files. Music is a simple
// retrowave-flavoured oscillator pad; can be muted.

var ctx = null;
var musicGain = null;
var sfxGain = null;
var musicNodes = null;
var settings = { music: 0.6, sfx: 0.8, muted: false };

function ensureCtx() {
    if (ctx) return ctx;
    try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        sfxGain = ctx.createGain();
        sfxGain.gain.value = settings.muted ? 0 : settings.sfx;
        sfxGain.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value = settings.muted ? 0 : settings.music * 0.25;
        musicGain.connect(ctx.destination);
    } catch (e) {
        ctx = null;
    }
    return ctx;
}

export function setAudioSettings(s) {
    settings = Object.assign({}, settings, s);
    if (sfxGain)   sfxGain.gain.value   = settings.muted ? 0 : settings.sfx;
    if (musicGain) musicGain.gain.value = settings.muted ? 0 : settings.music * 0.25;
}

// Browsers gate WebAudio behind a user gesture. Call this on the first key/click.
export function unlockAudio() {
    var c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
}

function envelopedTone(freq, dur, type, peakGain) {
    var c = ensureCtx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    var now = c.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain || 0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
}

export function sfxNavigate() { envelopedTone(660, 0.08, 'square', 0.18); }
export function sfxConfirm()  { envelopedTone(880, 0.05, 'square', 0.22); setTimeout(function () { envelopedTone(1320, 0.08, 'square', 0.22); }, 50); }
export function sfxBack()     { envelopedTone(440, 0.07, 'square', 0.18); setTimeout(function () { envelopedTone(330, 0.08, 'square', 0.16); }, 60); }
export function sfxToggle()   { envelopedTone(540, 0.05, 'sine',   0.18); }

export function startMusic() {
    var c = ensureCtx();
    if (!c || musicNodes) return;
    // Two detuned saws + a sub for a retro pad.
    var oA = c.createOscillator(); oA.type = 'sawtooth'; oA.frequency.value = 110;
    var oB = c.createOscillator(); oB.type = 'sawtooth'; oB.frequency.value = 110.6;
    var oC = c.createOscillator(); oC.type = 'sine';     oC.frequency.value = 55;
    var lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 800;
    lowpass.Q.value = 0.7;

    var lfo = c.createOscillator(); lfo.frequency.value = 0.18;
    var lfoGain = c.createGain(); lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(lowpass.frequency);

    [oA, oB, oC].forEach(function (o) { o.connect(lowpass); });
    lowpass.connect(musicGain);

    [oA, oB, oC, lfo].forEach(function (o) { o.start(); });
    musicNodes = { oA: oA, oB: oB, oC: oC, lfo: lfo, lowpass: lowpass };
}

export function stopMusic() {
    if (!musicNodes) return;
    try {
        musicNodes.oA.stop(); musicNodes.oB.stop(); musicNodes.oC.stop(); musicNodes.lfo.stop();
    } catch (e) { /* already stopped */ }
    musicNodes = null;
}
