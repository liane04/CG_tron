# Semana 2

## Progresso realizado na semana por aluno

**Liane Duarte (al79012)**

* Configuração do projeto Three.js (importmap, renderer, loop de animação)
* Construção da arena 3D: chão, grelha neon (GridHelper) e 4 paredes com EdgesGeometry
* Implementação das câmaras perspetiva e ortográfica com alternância por teclado
* Menu inicial com animação neon e ecrã de seleção de mapa
* Sistema de mapas configurável (mapas.js) com temas SPACE, DESERT e JUNGLE
* Integração de texturas reais no mapa DESERT (diffuse, normal map, roughness - polyhaven.com)
* Mapa SPACE com campo de 1500 estrelas geradas procedimentalmente (THREE.Points)

**Filipe Silva (al82239)**

* Melhorias visuais aprofundadas no mapa DESERT: falésias de arenito em camadas (BoxGeometry), dunas, monólitos e céu de deserto
* Partículas de areia animadas no mapa DESERT (sopram com o vento, atualizadas por delta time)
* Mapa JUNGLE: chão com deformação de vértices para terreno irregular, árvores, rochas e lianas
* Ativação de sombras no renderer (PCFSoftShadowMap) com castShadow/receiveShadow nos objetos
* Iluminação melhorada por mapa (DirectionalLight com sombras no DESERT e JUNGLE)

**Pedro Braz (al81311)**

* Desenvolvimento do mapa ICE: arena com estética de gelo, texturas e iluminação fria
* Organização do código em módulos: main.js, arena.js, menu.js, mapas.js
* Introdução de THREE.Clock para delta time consistente no loop de animação
* Partículas de folhas animadas no mapa JUNGLE (cair em espiral)
* Configuração do .gitignore do repositório

---

## Desvios face à planificação anterior

A planificação da Semana 1 previa para esta semana a conclusão do T1 (configuração Three.js + arena 3D). O T1 foi concluído conforme planeado. Adicionalmente, o grupo foi além do previsto:

- Sistema de menus e seleção de mapas (antecipa T6)
- Mapa JUNGLE com ambiente 3D completo (árvores, partículas) - antecipa T6
- Mapa DESERT com falésias, dunas e partículas animadas - antecipa T6
- Mapa SPACE com campo de estrelas procedimentalmente gerado
- Sombras implementadas (previstas apenas em T4/T5)

---

## Auto-avaliação do progresso semanal por aluno

**Liane Duarte** - 20.

**Filipe Silva** - 20.

**Pedro Braz** - 20.

---

## Evidências dos progressos

[IMAGEM: menu principal com título animado e grelha de fundo]

[IMAGEM: ecrã de seleção de mapa com os cards SPACE, DESERT e JUNGLE]

[IMAGEM: arena SPACE com campo de estrelas e grelha neon azul]

[IMAGEM: arena DESERT com textura de areia, falésias de arenito e partículas de vento]

[IMAGEM: arena JUNGLE com chão irregular, árvores, rochas e partículas de folhas]

---

## Planificação para a Semana 3 (21–27 de Abril)

- Criação de mota.js: modelo 3D das motas com BoxGeometry + CylinderGeometry
- Materiais neon emissivos adaptados ao tema de cada mapa
- Posicionamento inicial das duas motas na arena
