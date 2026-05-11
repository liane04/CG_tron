# Semana 5 - 5 a 11 de Maio

---

## Progresso realizado na semana

### Sistema de Iluminação

- Criação de um módulo dedicado (`js/luzes.js`) que centraliza a configuração das três fontes de luz do jogo: `AmbientLight`, `DirectionalLight` e `PointLight`.
- Calibração específica por mapa (deserto, jungle, gelo) — cada cenário ajusta cor, intensidade e posição das luzes para reforçar a atmosfera temática (ex.: tom alaranjado no deserto, aurora boreal no gelo, luz verde-jungle na floresta). O mapa espaço usa a configuração padrão.
- Configuração de sombras dinâmicas no `DirectionalLight` (`castShadow`, `shadow.camera`, `shadow.mapSize`) afinada por mapa para garantir que os obstáculos projetam sombras corretas sem custos excessivos de performance.
- `PointLights` adicionais associadas a cada veículo (mota e skate), produzindo um halo de luz que acompanha o jogador e realça a estética neon.
- Sistema de *toggles* via teclado (teclas `1` a `5`) para ativar/desativar individualmente cada fonte de luz (Ambiente, Direcional, Ponto Arena, Luz Mota, Luz Skate), com HUD visual a indicar o estado *on/off* de cada uma.

### Trails de Luz

- Implementação dos rastos de luz característicos do Tron (`js/trail.js`) — fila FIFO de pontos com tamanho máximo, desenhada como uma *ribbon* de quads no plano XZ.
- Geometria construída uma única vez com `BufferGeometry` e `setDrawRange()` dinâmico: apenas as posições são reescritas e o intervalo desenhado cresce com o trail, evitando recriação de geometria a cada frame.
- Largura, altura e distância mínima entre pontos definidas como constantes ajustáveis no módulo, com cor sincronizada à cor do veículo correspondente.

### Lógica de Jogo e Colisões

- Criação do controlador de rondas (`js/gameLogic.js`) que orquestra início de ronda, deteção de morte, atribuição de vitória, ecrã de resultado e reinício via tecla *Enter*.
- Sistema de colisão em duas vertentes: paredes da arena (via callbacks de `input.js`) e segmentos de trail (verificação geométrica frame-a-frame, com *culling* por raio de busca e zona de segurança nos últimos segmentos do próprio rasto).
- Efeito de explosão de partículas no ponto de colisão, com remoção temporizada do veículo abatido.

### Implementação e Melhoria de Hitboxes nos Objetos

- Adicionadas hitboxes invisíveis (`Mesh` com material transparente e `userData.isObstacle = true`) a vários objetos das arenas para que possam interagir com o sistema de colisão dos veículos.
- **Arena Deserto:** hitboxes nas paredes internas (4 caixas) e nas formações rochosas, com escala reduzida a 75% para manter um sentimento justo de colisão.
- **Arena Espaço:** hitboxes adicionadas aos pilares, torres ADN e painéis holográficos HUD.
- Refinamento iterativo das dimensões (commits `ajuste nas hit box` e `correçao erro`) para corrigir casos em que as motas embatiam visualmente "ao lado" do obstáculo.

### Inteligência Artificial do Adversário

- Desenvolvimento de uma IA simples para o Jogador 2 (`js/ai.js`), que decide a cada frame se vira para a esquerda, direita ou segue em frente.
- Estratégia baseada em **3 raios virtuais** (frente + 30° para cada lado), amostrando o terreno à procura de paredes e segmentos de trail.
- Sistema de prioridades: recuperação de canto (se aponta para uma parede próxima força viragem para o interior), evitamento de bloqueios laterais e viragens probabilísticas (5% por frame) para tornar o comportamento menos previsível.
- Não duplica a física do veículo — em vez disso escreve flags de teclas virtuais em `input.js` (`escreverTeclasIA`), reutilizando o mesmo *pipeline* do jogador humano.

### Outras melhorias

- A luz da mota passa a alterar a cor de acordo com a cor escolhida na garagem (commit `luz na mota alterar cor`).
- Correção de um *bug* na troca de câmara entre modos (commit `coorecao na troca de camara`).

---

## Desvios face à planificação anterior

A planificação previa para esta semana a afinação das luzes e o início dos trails e colisões. Estas metas foram totalmente cumpridas. Como desvio positivo, o grupo conseguiu ainda implementar uma **IA funcional para o adversário** e introduzir hitboxes em vários objetos decorativos das arenas, antecipando tarefas previstas para a semana de polimento.

## Evidências dos progressos

Iluminação por mapa com sombras dinâmicas

Trails de luz a seguir as motas

Colisão e explosão no fim de ronda

Hitboxes invisíveis nos obstáculos das arenas

---

## Planificação para a Semana 6 (12 – 18 de Maio)

- Melhorar mais hitboxes.
- Refinamento das animações de explosão e dos efeitos de partículas em colisão.
- Afinação da IA e do balanceamento das rondas.
- Relatório.
