# Plano de Implementação — Funcionalidades 3.1 e 3.2

> Baseado no documento PLANO_MELHORIAS.pdf (Análise Técnica NEON DRIVE, Maio 2026)

## Contexto

O jogo já tem `gameLogic.js` como controlador central de rondas. O overlay HTML de
resultado (`resultado-ronda`) já existe com o estilo neon Orbitron. Os jogadores são
pausados via `pausarTodos()` e `pausarJogador()` de `input.js`. O fluxo de settings
passa por `menuState.js → onStartGame(settings) → main.js → configurarGameLogic(opts)`.
O `audioManager.js` já tem síntese de SFX via WebAudio API com o padrão
`envelopedTone(freq, duracao, tipo)` e funções como `sfxConfirm()` e `sfxNavigate()`.

---

## 3.1 — Feedback de Início de Ronda: COUNTDOWN 3 – 2 – 1 – GO!

### Objetivo
Antes de cada ronda, os jogadores ficam posicionados mas imóveis enquanto aparece
uma contagem decrescente centrada no ecrã: **3 → 2 → 1 → GO!**
Só após "GO!" os veículos são libertados. Estimativa do plano original: ~60 linhas.

---

### Ficheiro: `js/gameLogic.js`

**Novos campos no objeto `estado`:**
- `emContagem` — booleano, `false` por defeito
- `valorContagem` — inteiro (3, 2, 1, 0); 0 representa "GO!"
- `timerContagem` — float com o tempo restante até à próxima transição

**Modificar `iniciarRonda()`:**
1. Manter toda a lógica existente de reset (trails, explosões, decals, posições).
2. Chamar `pausarTodos(true)` — jogadores ficam imóveis.
3. Definir `emContagem = true`, `valorContagem = 3`, `timerContagem = 1.0`.
4. Chamar `mostrarContagem(3)` para exibir o "3" no ecrã.
5. **Não** chamar `pausarTodos(false)` aqui — isso só acontece no fim do countdown.

**Modificar `atualizarGameLogic(delta)`:**
Adicionar no início da função, antes de qualquer outra lógica:

```
se emContagem:
    timerContagem -= delta
    se timerContagem <= 0:
        valorContagem -= 1
        se valorContagem < 0:                    ← passou o GO!
            emContagem = false
            esconderContagem()
            pausarTodos(false)                   ← aqui o jogo começa de facto
        senão:
            timerContagem = se valorContagem > 0 então 1.0 senão 0.65
            mostrarContagem(valorContagem)
    retornar cedo (return) — não processar mais nada este frame
```

**Garantias de robustez:**
- `accionarMorte()`: adicionar `if (estado.emContagem) return;` no topo
- `limparGameLogic()`: chamar `esconderContagem()` e repor `emContagem = false`

---

### Overlay HTML do Countdown

**Função interna `obterOverlayContagem()`** — cria o elemento uma vez e reutiliza-o.

Estrutura do elemento:
- `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- `font-family: Orbitron, "Courier New", monospace; font-weight: 900`
- `font-size: 160px` — número a ocupar ~80% do ecrã
- `z-index: 1600` — acima do overlay de resultado (1500)
- `pointer-events: none`
- `display: none` por defeito

**Cores por valor** (conforme o plano original):
- `3` → vermelho `#ff2244` com glow triplo em vermelho
- `2` → amarelo `#ffc83a` com glow triplo em amarelo
- `1` → verde `#59ff7c` com glow triplo em verde
- `GO!` → branco `#ffffff` com glow triplo branco (font-size menor: 96px)

**Animação CSS por número:**
Ao mostrar cada número, aplicar uma `@keyframes countdown-pop` que faz
`transform: scale(1.5)` → `transform: scale(0.8)` em 0.8s com `ease-out`.
Relançar a animação a cada número via `void element.offsetWidth` antes de
re-adicionar a classe CSS.

**Funções:**
- `mostrarContagem(valor)` — actualiza texto, cor, glow e relança a animação
- `esconderContagem()` — `display: none`

---

### Ficheiro: `js/audioManager.js`

Adicionar a função exportada `sfxCountdown(tipo)`:
- `'beep'` (para 3/2/1): tom a **880Hz, duração 0.06s** — igual a `sfxConfirm()`
  mas com freq e duração ajustadas
- `'go'` (para GO!): sweep ascendente **1320Hz → 1760Hz, duração 0.15s**

Chamar `sfxCountdown('beep')` em `mostrarContagem()` quando `valorContagem > 0`
e `sfxCountdown('go')` quando `valorContagem === 0`.

---

## 3.2 — Sistema de Vidas

### Objetivo
Cada jogador começa com **3 vidas**, representadas por corações no topo do ecrã.
A cada morte, perde um coração. Quando um jogador fica sem vidas, a partida termina.
As rondas continuam automaticamente (com countdown) enquanto ambos têm vidas.

```
♥ ♥ ♥   P1       P2   ♥ ♥ ♥
```

---

### 3.2.A — Estado de Vidas

**Ficheiro: `js/gameLogic.js`**

**Novos campos em `estado`:**
- `vidas` — objecto `{ 1: 3, 2: 3 }`, inicializado em `configurarGameLogic`
- `vidasIniciais` — inteiro com o número de vidas por jogador (default `3`,
  configurável pelo menu)
- `numRonda` — inteiro que conta a ronda atual (começa em 1)
- `tempoRonda` — float acumulado em `delta` enquanto a ronda decorre
- `tempoSobrevivencia` — objecto `{ 1: 0, 2: 0 }` com o instante de morte de cada jogador
- `recordeSobrevivencia` — float lido/guardado em `localStorage`
- `partidaTerminada` — booleano, `false` por defeito
- `onMatchEnd` — callback opcional chamado ao fim da partida

**Modificar `configurarGameLogic(opts)`:**
- Aceitar `opts.vidasIniciais` (default `3`) e `opts.onMatchEnd` (default `null`)
- Resetar `vidas = { 1: vidasIniciais, 2: vidasIniciais }`, `numRonda = 0`,
  `partidaTerminada = false` a cada novo jogo
- Ler `recordeSobrevivencia` de `localStorage.getItem('neonDrive_record')`

**Modificar `iniciarRonda()`:**
- Verificar `if (estado.partidaTerminada) return;` — bloqueia novas rondas após o fim
- Resetar `tempoRonda = 0` e `tempoSobrevivencia = { 1: 0, 2: 0 }`
- Incrementar `numRonda`
- Chamar `atualizarHUD()` para reflectir o novo número de ronda

**Modificar `atualizarGameLogic(delta)`:**
- Quando `!rondaTerminada && !emContagem`, incrementar `tempoRonda += delta`

**Modificar `accionarMorte(jogadorId)`:**
1. Registar `tempoSobrevivencia[jogadorId] = tempoRonda`
2. Decrementar `vidas[jogadorId]` — o jogador que morreu perde uma vida
3. Chamar `atualizarHUD()` para actualizar os corações imediatamente
4. Se modo single-player (`gameMode === 'ai'`) e o humano sobreviveu a esta ronda:
   se `tempoRonda > recordeSobrevivencia`, guardar novo recorde em `localStorage`
5. **Verificar fim de partida** (ver 3.2.C):
   se `vidas[jogadorId] <= 0` → `partidaTerminada = true`

---

### 3.2.B — HUD de Vidas com Corações

**Ficheiro: `js/gameLogic.js`**

Criar um elemento HTML fixo com id `hud-vidas`. Layout:

```
♥ ♥ ♥  P1        ROUND 1        P2  ♥ ♥ ♥
```

- `position: fixed; top: 0; left: 0; width: 100%`
- `display: flex; justify-content: space-between; align-items: center; padding: 10px 20px`
- `font-family: Orbitron, monospace; font-size: 13px; pointer-events: none; z-index: 1400`

**Painel do P1 (esquerda):**
- Corações à esquerda do nome: `♥ ♥ ♥  P1`
- Corações cheios `♥` = vidas restantes, corações vazios `♡` = vidas perdidas
- Cor = `estado.cores[1]` em hex com `text-shadow` de glow suave
- Exemplo com 2 vidas: `♥ ♥ ♡  P1`

**Centro:**
- `ROUND  {numRonda}` em branco, font-size 11px, letter-spacing 4px

**Painel do P2 (direita):**
- Nome seguido de corações: `P2  ♥ ♥ ♥`
- Mesma lógica de cheios/vazios
- Cor = `estado.cores[2]` em hex com glow

**Animação ao perder um coração:**
Quando `vidas[x]` diminui, o coração que "desaparece" deve ter uma animação CSS
`@keyframes heart-break` que faz o coração piscar 3 vezes em 0.4s antes de se
tornar `♡`. Implementado adicionando uma classe CSS temporária ao elemento do
coração correspondente, removida via `setTimeout` após a animação.

**Visibilidade:**
- `display: flex` ao chamar `configurarGameLogic` (início de jogo)
- `display: none` ao chamar `limparGameLogic` (regresso ao menu)

**Função `atualizarHUD()`:**
- Obtém ou cria `hud-vidas`
- Constrói os corações como `span` individuais para permitir a animação por coração
- Reconstrói o innerHTML com os valores actuais de `vidas` e `numRonda`

---

### 3.2.C — Fim de Partida

**Modificar `accionarMorte(jogadorId)` em `js/gameLogic.js`**

Após decrementar `vidas[jogadorId]`, verificar:

```
se vidas[jogadorId] <= 0:
    partidaTerminada = true
    vencedorPartida = (jogadorId === 1 ? 2 : 1)
```

Quando `partidaTerminada = true`:
- O overlay de resultado mostra `"GAME OVER"` em fonte maior (86px)
- Por baixo, em fonte menor: `"PLAYER X WINS THE MATCH"` (ou `"AI WINS"` em single-player)
  com a cor do vencedor
- Linha seguinte: score final `"♥ {vidas[vencedor]}  vs  ♡ 0"` mostrando as vidas
  restantes do vencedor
- Linha de instrução: `"RETURNING TO MENU IN 6s"` (sem [ENTER])
- `timerNovaRonda` = 6 segundos
- Ao expirar, chamar `limparGameLogic()` seguido de `estado.onMatchEnd()`
  se o callback estiver definido

Para rondas normais (o jogador ainda tem vidas), o overlay existente mantém-se
com as seguintes adições:
- Linha de corações actuais: `"P1  ♥♥♥   P2  ♥♥○"` com as cores dos jogadores
- Linha de tempo de sobrevivência: `"SURVIVED  {X.X}s"` e `"★ NEW RECORD"` se
  aplicável

---

### 3.2.D — Integração no Menu (número de vidas)

**Ficheiro: `js/menu/screens/modeSelect.js`**

Após o utilizador confirmar o modo de jogo (VS AI ou 1V1), mostrar um segundo nível
de seleção no mesmo ecrã — uma linha de cartões menores com o número de vidas:

`1 ♥   3 ♥   5 ♥`

Cartões com o mesmo estilo visual dos cartões de modo mas com ~50% da altura.
O `3 ♥` fica pré-selecionado por defeito.
O utilizador navega com as setas e confirma com Enter.

O `callbacks.onConfirm` passa a emitir `{ modeId, vidasIniciais }`.

**Ficheiro: `js/menu/menuState.js`**

No handler `modeSelectHandler.onConfirm`:
- `settings.gameMode = selection.modeId`
- `settings.vidasIniciais = selection.vidasIniciais || 3`

**Ficheiro: `js/main.js`**

Em `startWithMap`, na chamada a `configurarGameLogic`:
- Adicionar `vidasIniciais: menuSettings.vidasIniciais || 3`
- Adicionar `onMatchEnd: function() { backToMenu(); }`

---

## Ordem de implementação sugerida

1. **3.1 — Countdown** (`gameLogic.js` + `audioManager.js`):
   campos em `estado` → overlay HTML com `@keyframes` → `mostrarContagem` /
   `esconderContagem` → modificar `iniciarRonda` → bloco no início de
   `atualizarGameLogic` → `sfxCountdown` em `audioManager.js`

2. **3.2.A — Estado de vidas** (`gameLogic.js`):
   campos em `estado` → lógica em `accionarMorte` (decrementar vidas, detectar
   fim de partida) → `tempoRonda` no loop → localStorage para recorde

3. **3.2.B — HUD de corações** (`gameLogic.js`):
   elemento `hud-vidas` com `span` por coração → `@keyframes heart-break` →
   função `atualizarHUD()` → mostrar/esconder em `configurarGameLogic` /
   `limparGameLogic`

4. **3.2.C — Overlay de fim de partida e overlay de ronda melhorado** (`gameLogic.js`):
   `"GAME OVER"` quando `partidaTerminada` → linha de corações no overlay de ronda →
   tempo de sobrevivência e recorde

5. **3.2.D — Menu de vidas** (`modeSelect.js` + `menuState.js` + `main.js`):
   cartões `1♥ / 3♥ / 5♥` → propagação até `configurarGameLogic`

---

## Notas de estilo visual

- Todos os overlays HTML usam `font-family: Orbitron, "Courier New", monospace`
- Glow é sempre `text-shadow` triplo (12px, 24px, 48px), como em `mostrarResultado`
- **Cores da contagem**: `3` vermelho, `2` amarelo, `1` verde, `GO!` branco
- Corações usam caracteres Unicode: `♥` (U+2665) cheio, `♡` (U+2661) vazio
- As cores dos corações seguem `estado.cores[x]` do respectivo jogador
- Todos os overlays têm `pointer-events: none` e `z-index` ≥ 1400
- Os `@keyframes` são injectados no `<head>` uma única vez (verificar duplicatas)
