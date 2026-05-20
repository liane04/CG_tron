# Perfis de Veículo Equilibrados

**Data:** 21 de Maio de 2026
**Contexto:** Sprint final do trabalho prático de CG.

## Objetivo

Dar a cada veículo um perfil de características distinto — para que os
jogadores possam escolher o veículo de acordo com o seu estilo de jogo — mas
**equilibrado**, de modo a que nenhum veículo tenha vantagem a mais.

Esta feature unificou três tarefas que estavam separadas (velocidade,
tamanho do trail e barra de nitro) numa só.

## Design

Cada veículo tem 3 stats em níveis de 1 a 3 que **somam sempre 6 pontos**.
Cada coluna tem exatamente um nível 1, um 2 e um 3 — o roster fica equilibrado.

| Veículo            | Velocidade | Trail        | Nitro      |
|--------------------|------------|--------------|------------|
| Light Cycle (mota) | Média (2)  | Comprido (3) | Curto (1)  |
| Hover Skate (skate)| Alta (3)   | Curto (1)    | Médio (2)  |
| Speeder X1 (speeder)| Baixa (1) | Médio (2)    | Grande (3) |

Identidades:

- **Light Cycle** — equilibrada; deixa o muro mais comprido (bom para
  encurralar adversários), mas tem pouca reserva de nitro.
- **Hover Skate** — rápido e ágil, mas o trail curto trapa menos e é mais
  frágil.
- **Speeder X1** — lento, mas com uma reserva de nitro enorme para fugas e
  recuperações.

## Valores de jogo

Os níveis 1-3 são convertidos nestes valores concretos:

| Stat       | Nível 1 | Nível 2 | Nível 3 | Unidade            |
|------------|---------|---------|---------|--------------------|
| Velocidade | 9       | 10      | 11.5    | unidades/s         |
| Trail      | 200     | 300     | 420     | nº de segmentos    |
| Nitro      | 2.0     | 3.0     | 4.5     | segundos de boost  |

## Ficheiros alterados

| Ficheiro                      | Alteração                                                       |
|-------------------------------|-----------------------------------------------------------------|
| `js/menu/garageVehicles.js`   | Stats passam a níveis `{velocidade, trail, nitro}` + `obterTuning()` que converte nível → valor de jogo. |
| `js/menu/screens/garage.js`   | As barras de stats da garagem passam a mostrar SPEED / TRAIL / NITRO. |
| `js/input.js`                 | `estado.velocidade` e `estado.boostMax` passam a depender do veículo; sincroniza `userData.velocidade` para a IA. |
| `js/hudBoost.js`              | A barra de nitro do HUD usa o máximo de cada jogador.           |
| `js/main.js`                  | Obtém o tuning de cada veículo e passa-o ao `inicializarInput` e o `trailMax` ao `criarTrail`. |

## Como funciona

1. Ao escolher um veículo na garagem, as barras SPEED/TRAIL/NITRO mostram o
   perfil desse veículo (preenchimento = nível / 3).
2. No arranque da partida (`main.js`), `obterTuning()` devolve os valores de
   jogo de cada veículo escolhido.
3. O `input.js` aplica a velocidade e a capacidade de nitro próprias de cada
   veículo; o `main.js` cria o trail com o comprimento correspondente.
4. A IA lê a velocidade real do seu veículo via `userData.velocidade`, para a
   previsão de viragens continuar afinada.

## Verificação

Testado no browser (servidor de preview):

- O jogo arranca sem erros relacionados com esta alteração.
- `obterTuning` devolve os valores corretos para os 3 veículos.
- A garagem mostra as barras SPEED / TRAIL / NITRO.
- Em jogo, o nitro por veículo foi confirmado: mota = 2.0 s, skate = 3.0 s.
