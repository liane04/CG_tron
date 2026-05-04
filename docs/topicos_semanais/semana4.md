# Semana 4 — 28 de Abril a 4 de Maio

---

## Progresso realizado na semana

### Novo sistema de menu 3D (`js/menu/`)

O antigo menu em HTML/CSS (overlays sobre o canvas) foi totalmente substituído por um menu desenhado em 3D dentro da própria cena Three.js, partilhando o mesmo `WebGLRenderer` do jogo. A pasta `js/menu/` contém o sistema completo.

- **`menuApp.js`** — orquestrador de topo. Cria a cena e câmara do menu, monta os ecrãs, regista os callbacks de áudio/qualidade e expõe um API com `update`, `resize` e `getSettings` para o `main.js` consumir.
- **`menuState.js`** — máquina de estados com 6 estados: `SPLASH`, `MAIN`, `GARAGE`, `SETTINGS`, `TRACK_SELECT`, `GAME`. Cada transição esconde o ecrã anterior, mostra o seguinte e pede à câmara para se mover para o ponto de ancoragem desse ecrã.
- **`cameraRig.js`** — define posições/alvos fixos por ecrã (anchors) e move a câmara entre eles com tweening suave (sem cortes).
- **`postFX.js`** — composição com `EffectComposer`, `RenderPass` e `UnrealBloomPass` para o efeito neon. Liga/desliga passes consoante o nível de qualidade escolhido nas definições.
- **`inputManager.js`** — input genérico do menu: rato (clique/hover sobre objetos 3D via `Raycaster`) e teclado (Esc para voltar). Permite a cada ecrã registar o seu handler ativo e a sua lista de elementos "hoveráveis".
- **`audioManager.js`** — aplica volumes de música/SFX vindos das definições ao motor de áudio.
- **`settingsStore.js`** — guarda e carrega as preferências do utilizador em `localStorage` (modo de câmara, qualidade, áudio, veículo escolhido, mapa).
- **`textSprite.js`** — renderiza texto como `Sprite` (textura desenhada num `<canvas>` 2D), permitindo títulos e labels neon dentro da cena 3D.
- **`tween.js`** — pequeno motor de animação com easing para fades e movimentos da câmara.
- **`environment.js`** — ambiente decorativo do menu (grelha, partículas, fundo) para que o menu tenha presença visual.
- **`garageVehicles.js`** — instancia os modelos dos veículos para pré-visualização na garagem.

### Ecrãs do menu (`js/menu/screens/`)

- **`splashScreen.js`** — ecrã inicial "NEON DRIVE / GRAND PRIX 2087" com pulsar neon. Avança para o menu principal a qualquer tecla.
- **`mainMenu.js`** — botões 3D: PLAY, GARAGE, SETTINGS, RECORDS. Hover muda emissive; clique encaminha para o estado correspondente.
- **`garage.js`** — escolha de veículo (mota / skate / speeder / glider) e cor neon, com pré-visualização rotativa do modelo selecionado.
- **`settings.js`** — definições persistentes: modo de câmara (perspetiva / ortográfica), qualidade visual, volume de música e SFX.
- **`trackSelect.js`** — escolha do mapa (Space / Deserto / Gelo / Jungle), apresentado em cards 3D.

### Novos veículos

- **`glider.js`** — hovercraft com pod (esfera achatada), canopy semi-transparente, anel emissivo inferior pulsante, fins laterais com wobble e farol frontal. Animação `atualizarGlider(delta)` faz o pod oscilar verticalmente, modular a opacidade do anel e balançar os fins.
- **`speeder.js`** — carro baixo e alongado com casco neon, cabine, nariz em cunha (`ConeGeometry`), faixa underglow pulsante, escape traseiro com flicker e 4 rodas. Animação `atualizarSpeeder(delta)` modula a opacidade do underglow e a `emissiveIntensity` do escape.

Ambos seguem a convenção dos veículos existentes: grupo raiz escalado, frente alinhada a `-Z`, registando-se em arrays internos para serem animados a cada frame.

### Sistema de iluminação extraído (`js/luzes.js`)

A iluminação por mapa, antes espalhada pelo `main.js`, foi consolidada num único módulo:

- **`criarLuzes(cena, mapa)`** — cria luz ambiente, direcional, point lights da arena e das duas motas; depois ajusta cor, intensidade, posição e parâmetros de sombra (`shadow.camera.left/right/top/bottom/near/far`, `shadow.mapSize`) consoante o mapa (deserto / jungle / gelo / default).
- **`toggleLuz(luzes, tipo)`** — permite ligar/desligar uma luz pelo nome (usado pelo HUD `#hud-luzes` no `index.html`).

### Sistema de input e física dos veículos (`js/input.js`)

Novo módulo dedicado a input de jogo + movimento + colisão, separando esta responsabilidade do `main.js`:

- **Teclas** — Setas + Shift para o Jogador 1 (mota); WASD + Espaço para o Jogador 2 (skate). Listeners registados uma única vez via flag `listenersRegistados`.
- **Estado físico** por jogador: velocidade, vetor direção, flag `saltando`, `tSalto`, altura base, altura máxima do salto, duração.
- **Movimento contínuo** — rotação por delta time (`VELOCIDADE_ROTACAO = 2.5 rad/s`), atualização da direção a partir do `rotation.y` do veículo, avanço por `addScaledVector`.
- **Limites da arena** — clamping em X e Z dentro de `±LIMITE_ARENA` com margem.
- **Colisão com obstáculos** — `definirObstaculos(grupoArena)` percorre a árvore da arena e recolhe `Box3` em espaço-mundo de todos os objetos marcados com `userData.isObstacle`. O teste de colisão é círculo-vs-AABB no plano XZ, com **sliding**: ao bater, tenta primeiro reverter só X (deslizar em Z), depois só Z (deslizar em X), e só bloqueia se ambas as opções colidem.
- **Saltos parabólicos** — `y = alturaBase + alturaMax · sin(π · t / duração)`, disparo único no keydown, retorna à altura base ao aterrar.
- **Raio de colisão** — calculado dinamicamente a partir da `Box3` do próprio veículo (40% do lado maior), permitindo colisão um pouco mais permissiva que a AABB visual para evitar encravar em cantos.

### Refatorização do `main.js`

O ponto de entrada foi reescrito para integrar o menu:

- Arranca em **modo `menu`**, instanciando o `menuApi` via `initMenu(renderer, ...)`.
- Quando o menu dispara `onStartGame(settings)`, lança `initGame()` que cria a cena de jogo, câmaras (perspetiva + ortográfica) e veículos. As preferências do utilizador (modo de câmara, mapa, veículo, cor) são lidas a partir de `menuSettings`.
- O renderer é **partilhado**: `main.js` decide a cada frame se renderiza a cena do menu ou a do jogo, conforme `appMode`.
- A iluminação passa a ser delegada a `criarLuzes(cena, mapa)`.
- Os 4 atualizadores de arena (`atualizarSpace`, `atualizarDeserto`, `atualizarGelo`, `atualizarJungle`) e os atualizadores de veículos continuam a ser chamados no loop principal.

### `index.html` simplificado

Todos os ecrãs do menu antigo (CSS de centenas de linhas com grelhas animadas, cards de mapa, sliders) foram removidos — agora vivem na cena 3D. O HTML mantém apenas:

- Título da página alterado para **"NEON DRIVE"**
- HUD `#info` (já existente) e novo `#hud-luzes` para mostrar o estado das luzes
- Loader `#boot` exibido até o módulo principal arrancar

---

## Desvios face à planificação anterior

A planificação da Semana 3 previa apenas "controlos de teclado para as motas" e "câmara em 3ª pessoa a seguir a mota ativa". Fomos bastante mais longe:

- **Menu totalmente em 3D** — antecipa muito do trabalho visual e de interação que estaria distribuído por semanas finais.
- **Dois novos veículos** (glider e speeder) — não estavam previstos para esta semana.
- **Sistema de colisão círculo-vs-AABB com sliding** — vai além de um simples controlo de teclado.
- **Persistência de definições em `localStorage`** — não estava planeado.

A câmara em 3ª pessoa a seguir a mota ainda não foi implementada — manteve-se a alternância perspetiva / ortográfica controlada pelo menu.

---

## Auto-avaliação do progresso semanal por aluno

**Liane Duarte** - 20

**Filipe Silva** - 20

**Pedro Braz** - 20

---

## Evidências dos progressos

[IMAGEM: ecrã splash "NEON DRIVE / GRAND PRIX 2087" com pulsar neon]

[IMAGEM: menu principal 3D com botões PLAY / GARAGE / SETTINGS / RECORDS]

[IMAGEM: ecrã de garagem com pré-visualização rotativa do veículo selecionado]

[IMAGEM: ecrã de definições com modo de câmara, qualidade e volumes]

[IMAGEM: ecrã de seleção de mapa com cards 3D Space / Deserto / Gelo / Jungle]

[IMAGEM: glider hovercraft em jogo com anel emissivo pulsante]

[IMAGEM: speeder em jogo com underglow e flicker do escape]

---

## Planificação para a Semana 5 (5 – 11 de Maio)

- Câmara em 3ª pessoa a seguir o veículo ativo (ficou pendente da Semana 4)
- HUD de jogo com velocidade, vidas e tempo de volta
- Rastos neon por trás das motas (estilo Tron clássico)
- Deteção de colisão entre veículos (não só veículo–obstáculo)
