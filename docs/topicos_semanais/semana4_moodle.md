# Semana 4 — 28 de Abril a 4 de Maio

---

## Progresso realizado na semana

### Sistema de Câmaras 3D

- Desenvolvimento de um sistema dinâmico de câmaras, destacando-se a introdução da aguardada **Câmara em 3.ª Pessoa** que persegue e atualiza a sua posição fluida com base na viatura ativa do jogador.
- Adição da mecânica de alternância tática de visão (via tecla "C"), passando a suportar câmara Livre (`OrbitControls`), câmara de Topo (visão ortográfica para visualização global da arena) e a nova câmara em terceira pessoa.

### Controlos de Teclado

- Integração e mapeamento avançado de controlos de teclado preparados para *multiplayer local*, isolando as teclas `WASD` exclusivamente para o Jogador 1 e as `Setas` de direção para o Jogador 2.
- Programação de um modelo de condução simulado, em que o input calcula a aceleração no eixo Z, converte as teclas laterais numa viragem contínua (eixo Y) e introduz ainda uma mecânica de salto (baseada em gravidade simulada) para transpor obstáculos.

### Melhorias no Menu Interativo e Inserção da Garagem

- Refatorização e expansão do sistema de menus (`js/menu/`) com uma máquina de estados robusta (`menuState.js`) e transições mais suaves.
- Adição de um ecrã totalmente novo, a "Garagem" (`garage.js`), permitindo pela primeira vez a seleção entre Mota ou Hover-Skate e a personalização dinâmica da cor dos veículos.
- Upgrade no ambiente de fundo do menu, tornando a grelha néon interativa e melhorando a estética *Synthwave*.

### Gestão de Áudio (Web Audio API)

- Criação de um gestor de áudio (`audioManager.js`) focado em performance.
- Efeitos sonoros de interface (SFX) gerados nativamente por código via matemática de osciladores, dispensando ficheiros estáticos de som.
- Suporte para reprodução assíncrona de ficheiros MP3, com capacidade de realizar *crossfade* suave entre a banda sonora do menu e os temas ambientes atribuídos a cada mapa durante o jogo.

### Outras alterações

- Integração da biblioteca `lil-gui` para expor o "NEON DRIVE - Controlos", um painel desenhado especificamente para alterar as camaras, ligar e desligar o nevoeiro, ligar e desligar o audio, entre outros.

---

## Desvios face à planificação anterior

A planificação previa para esta semana o desenvolvimento das Câmaras e Teclado. Esta meta foi concluída . Como desvio positivo, o grupo conseguiu adiantar outras tarefas como o adicionar o audio e a garagem.

## Evidências dos progressos

Menu principal alterado

Garagem

camara 3 pessoa

NEON DRIVE - Controlos

---

## Planificação para a Semana 5 (5 – 11 de Maio)

- Afinação do sistema de Luzes (`PointLight`, `DirectionalLight`, `AmbientLight`).
- Criação do sistema de *toggles* dinâmicos para ativar/desativar cada fonte de luz individualmente (via interface).
- Começar a desenhar os *Trails* de luz atrás dos veiculos e começar a ver como vamos fazer as colisões.
