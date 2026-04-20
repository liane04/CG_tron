import { mapas } from './mapas.js';

var menu = document.getElementById('menu');
var selecaoMapa = document.getElementById('selecaoMapa');
var hud = document.getElementById('info');
var btnIniciar = document.getElementById('btnIniciar');
var btnVoltar = document.getElementById('btnVoltar');
var grelhaMapas = document.getElementById('grelhaMapas');

var callbackInicio = null;

export function aoIniciarJogo(fn) {
    callbackInicio = fn;
}

export function mostrarMenu() {
    menu.classList.remove('oculto');
    selecaoMapa.classList.add('oculto');
    hud.style.display = 'none';
}

function mostrarSelecaoMapa() {
    menu.classList.add('oculto');
    selecaoMapa.classList.remove('oculto');
}

function iniciarComMapa(mapa) {
    selecaoMapa.classList.add('oculto');
    hud.style.display = 'block';
    if (callbackInicio) callbackInicio(mapa);
}

// Gerar cards dinamicamente a partir de mapas.js
mapas.forEach(function (mapa) {
    var card = document.createElement('div');
    card.className = 'cardMapa';
    card.style.borderColor = mapa.corCSS;
    card.style.setProperty('--cor', mapa.corCSS);
    card.innerHTML =
        '<div class="nomeCard" style="color:' + mapa.corCSS + '; text-shadow: 0 0 10px ' + mapa.corCSS + '">' + mapa.nome + '</div>' +
        '<div class="descCard">' + mapa.descricao + '</div>' +
        '<div class="previewCard" style="background:' + mapa.corCSS + '; box-shadow: 0 0 12px ' + mapa.corCSS + '"></div>';
    card.addEventListener('click', function () { iniciarComMapa(mapa); });
    grelhaMapas.appendChild(card);
});

btnIniciar.addEventListener('click', mostrarSelecaoMapa);
btnVoltar.addEventListener('click', mostrarMenu);
