# Semana 6 - 12 a 18 de Maio

---

## Progresso realizado na semana

### Veículos e Customização

- **Reformulação do Carro Speeder:**  O `speeder` foi alvo de uma reescrita profunda, passando a atuar como um carro complexo, com aumento da sua dimensão e melhoria na iluminação associada. Sendo um dos objetos complexos definidos.
- **Novos Rastros (Trails):** Implementação de variações e modelos diferentes para os rastros de luz, aumentando a diversidade visual das partidas.
- **Menus e Customização de 2 Jogadores:** Expansão substancial da interface, com novos menus dedicados à seleção de modos (`modeSelect.js`) e à personalização individual para dois jogadores simultâneos (`customize.js`). A garagem foi adaptada para permitir a escolha não só do veículo e cor, mas também do tipo de *trail*.

### Modos de Jogo e Perspetivas

- **Modo 1vs1 (Vista de Cima):** Adição de um modo competitivo *multiplayer* para dois jogadores, suportado por uma nova perspetiva de câmara "top-down" (vista superior). Esta câmara altera a dinâmica de jogo, focando-se mais no controlo de área e interceção do adversário do que numa visão em 3ª pessoa.

### Arenas, Ambientes e Iluminação

- **Remoções e Limpezas Visuais:** A Arena de Gelo foi permanentemente removida do projeto. O antigo HUD informativo (textos informativos sobre o estado das luzes) também foi retirado para limpar o ecrã e manter a imersão.
- **Melhorias na Floresta e Espaço:** Na Arena Jungle, os objetos foram colocados em posições fixas, acompanhados de correções definitivas nas *hitboxes* das árvores. Na Arena do Espaço, foi corrigido um erro no comportamento de salto e adicionou-se uma animação de movimento ao drone presente no cenário.
- **Polimento Geral:** Correções na iluminação geral e na mensagem final/mensagem de vitória.

### Otimização e Correções de Bugs (Polimento)

- **Otimização de Performance e Rastos (Object Pooling):** O ficheiro `trail.js` sofreu uma refatoração profunda para resolver a lentidão no jogo. Em vez de instanciar milhares de novos objetos por partida, foi implementada uma **Geometria Única Partilhada** escalada dinamicamente. Criou-se também um sistema de **Object Pooling** (pré-alocando as instâncias no arranque), mitigando totalmente os soluços (*stutters*) de alocação de memória e evitando o recálculo pesado do mapa de sombras (especialmente na arena do Deserto).
- **Otimização das Explosões e Shaders:** A lógica do efeito de morte (`gameLogic.js`) foi reestruturada. Para evitar o congelamento de ecrã provocado pela recompilação de *shaders* (*Shader Compilation Stutter*) na GPU, as luzes dinâmicas da explosão e as partículas dos destroços passaram a ser pré-alocadas em cache no início do jogo, sendo apenas reposicionadas e ativadas (*visible = true*) no exato momento e local da colisão.
- **Hitboxes:** Novas revisões iterativas nas *hitboxes* dos obstáculos, cumprindo o objetivo delineado na semana anterior para tornar as colisões mais justas.
- **Navegação de Menus:** Correção de um erro que causava um atraso (*delay*) desnecessário durante as transições no menu.

### Elaboração do Relatório

- **Rascunho Inicial:** Início do trabalho de redação do relatório final do projeto. A estrutura do documento já foi elaborada e já dispomos de um rascunho inicial em progresso com o progresso do desenvolvimento.

---

## Desvios face à planificação anterior

A planificação previa para esta semana o refinamento de *hitboxes*, melhoria das explosões, afinação de colisões e elaboração do relatório (sendo a semana clássica de polimento). Estas metas foram cumpridas, os *bugs* visuais foram debelados e o processo de escrita do relatório foi iniciado com sucesso (havendo já um rascunho).
Como desvio expressivo (e não planeado originalmente), o grupo desenvolveu um novo **Modo 1vs1 com câmara superior**, além de refatorar por completo o ecossistema de menus (novos ecrãs de customização e de escolha de modo) para acomodar a seleção independente de 2 jogadores (veículos, cores, rastros). O redesenho do *Speeder* também constituem desvios da arquitetura inicial, em prol de uma melhor experiência de jogo.

## Evidências dos progressos

- Menus de seleção de modo de jogo.
- Vários tipos selecionáveis de *Trails* (rastros de luz).
- Modo 1vs1 com perspetiva fixa de Vista de Cima (*Top-down*).

## Planificação para a Semana 7 (19 - 25 de Maio)

- Ajustes finos finais de balanceamento.
- Conclusão do Relatório Final do projeto.
- temos de colocar tudo o que fakta aqui
