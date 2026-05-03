// Tiny WebAudio-backed audio manager. We synthesize SFX inline so the menu
// has audio feedback without bundling sound files. Music is loaded from MP3
// files — one for the menu and one per game map. Crossfade between tracks.

var ctx = null;
var musicGain = null;
var sfxGain = null;
var settings = { music: 0.6, sfx: 0.8, muted: false };

// ─── Música de fundo ────────────────────────────────────────────────────────
var currentTrack = null;   // { audio: HTMLAudioElement, src: string }
var fadeInterval = null;

// Caminhos dos ficheiros de música — o utilizador coloca os MP3 nestas pastas
var MUSIC_PATHS = {
    menu:    './audio/audio_menu.mp3',
    space:   './audio/audio_space.mp3',
    deserto: './audio/audio_desert.mp3',
    jungle:  './audio/audio_jungle.mp3',
    gelo:    './audio/audio_ice.mp3',
};

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
    // Atualizar volume da música de fundo (HTMLAudioElement)
    if (currentTrack && currentTrack.audio) {
        currentTrack.audio.volume = settings.muted ? 0 : settings.music * 0.5;
    }
}

// Browsers gate WebAudio behind a user gesture. Call this on the first key/click.
export function unlockAudio() {
    var c = ensureCtx();
    if (c && c.state === 'suspended') c.resume();
}

// ─── SFX sintetizados ───────────────────────────────────────────────────────

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

// ─── Música de fundo (MP3) ──────────────────────────────────────────────────

/**
 * Toca uma faixa de música de fundo por ID (menu, space, deserto, jungle, gelo)
 * ou por caminho direto. Faz crossfade suave entre tracks.
 *
 * @param {string} idOuPath  ID do mapa (ex: 'menu', 'space') ou caminho direto para MP3
 * @param {number} fadeDuration  Duração do crossfade em ms (default: 1500)
 */
export function playMusic(idOuPath, fadeDuration) {
    var src = MUSIC_PATHS[idOuPath] || idOuPath;
    fadeDuration = fadeDuration || 1500;

    // Se já está a tocar a mesma track, não faz nada
    if (currentTrack && currentTrack.src === src) return;

    var targetVolume = settings.muted ? 0 : settings.music * 0.5;

    // Fade out da track anterior
    if (currentTrack && currentTrack.audio) {
        var oldAudio = currentTrack.audio;
        _fadeOut(oldAudio, fadeDuration, function () {
            oldAudio.pause();
            oldAudio.src = '';
        });
    }

    // Criar e tocar nova track
    var audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0;
    currentTrack = { audio: audio, src: src };

    audio.play().then(function () {
        _fadeIn(audio, targetVolume, fadeDuration);
    }).catch(function (err) {
        // Ficheiro não encontrado ou autoplay bloqueado — falha silenciosa
        console.warn('[Audio] Não foi possível tocar:', src, err.message);
    });
}

/**
 * Mantém a API antiga — inicia a música do menu.
 * Chamada pelo splashScreen.js ao primeiro input do utilizador.
 */
export function startMusic() {
    playMusic('menu');
}

/**
 * Para a música com fade out.
 * @param {number} fadeDuration  Duração do fade em ms (default: 800)
 */
export function stopMusic(fadeDuration) {
    fadeDuration = fadeDuration || 800;
    if (!currentTrack || !currentTrack.audio) return;
    var audio = currentTrack.audio;
    _fadeOut(audio, fadeDuration, function () {
        audio.pause();
        audio.src = '';
    });
    currentTrack = null;
}

/**
 * Troca para a música do mapa indicado. Usar ao iniciar o jogo.
 * @param {string} mapId  ID do mapa (space, deserto, jungle, gelo)
 */
export function playMapMusic(mapId) {
    if (MUSIC_PATHS[mapId]) {
        playMusic(mapId, 2000);
    } else {
        console.warn('[Audio] Sem música definida para o mapa:', mapId);
    }
}

/**
 * Volta a tocar a música do menu. Usar ao voltar ao menu.
 */
export function playMenuMusic() {
    playMusic('menu', 1500);
}

/**
 * Define ou atualiza os caminhos de música.
 * @param {Object} paths  Ex: { menu: './audio/menu.mp3', space: './audio/space.mp3' }
 */
export function setMusicPaths(paths) {
    Object.assign(MUSIC_PATHS, paths);
}

// ─── Utilitários de fade ────────────────────────────────────────────────────

function _fadeIn(audio, targetVolume, duration) {
    var steps = 20;
    var stepTime = duration / steps;
    var increment = targetVolume / steps;
    var step = 0;
    var interval = setInterval(function () {
        step++;
        audio.volume = Math.min(increment * step, targetVolume);
        if (step >= steps) clearInterval(interval);
    }, stepTime);
}

function _fadeOut(audio, duration, onComplete) {
    var startVol = audio.volume;
    if (startVol <= 0) { if (onComplete) onComplete(); return; }
    var steps = 20;
    var stepTime = duration / steps;
    var decrement = startVol / steps;
    var step = 0;
    var interval = setInterval(function () {
        step++;
        audio.volume = Math.max(startVol - decrement * step, 0);
        if (step >= steps) {
            clearInterval(interval);
            audio.volume = 0;
            if (onComplete) onComplete();
        }
    }, stepTime);
}
