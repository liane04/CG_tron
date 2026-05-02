# Semana 3 — 21 a 27 de Abril

---

## Progresso realizado na semana

### Reorganização da estrutura do projeto

A arquitetura do código foi reorganizada para separar a lógica base da decoração específica de cada mapa:

- **`js/`** — lógica central: `main.js`, `arena.js`, `menu.js`, `mapas.js`, `mota.js`, `skate.js`
- **`js/objetos/`** — nova subpasta com os ambientes temáticos: `arenaDeserto.js`, `arenaGelo.js`, `arenaJungle.js`, `arenaSpace.js`
- Cada ficheiro de ambiente exporta duas funções: `adicionarObjetosX()` (construção) e `atualizarX(delta)` (animação)
- Modelos 3D externos organizados em `js/objetos/odish/` e `js/objetos/arvoreDeserto/` (ficheiros `.obj`, `.mtl`, `.gltf`)

---

### Objetos 3D criados por mapa

**🏜️ Arena Deserto**

- **Torres de Glifos:** `BoxGeometry` com textura hieroglífica, moldura em `EdgesGeometry` amarelo neon e "núcleo de dados" com cubos flutuantes animados (efeito Matrix)
- **Torres de Cristal:** pirâmides formadas por `CylinderGeometry` com raio de topo a 0 e 4 lados, agrupadas em octaedros; cápsulas de vidro posicionadas em espiral ascendente via matemática polar (cos/sin)
- **Grande Pirâmide Voxel:** escultura massiva no fundo usando `InstancedMesh` para desenhar apenas os blocos da superfície exterior, máxima performance com uma única chamada à GPU
- **Formações Rochosas:** aglomerados de 5 a 7 formas misturando `BoxGeometry` e `CylinderGeometry` hexagonais, inclinadas aleatoriamente e semienterradas
- **Árvores (Quiver Trees):** modelo importado via `GLTFLoader` (`quiver_tree_01_4k.gltf`), instanciado com escala 3×

**🧊 Arena Gelo**

- **Glaciares Hexagonais:** pilares de `CylinderGeometry` com exatos 6 lados em grupos de 3 alturas diferentes, com "tampa energética" no topo

**🌿 Arena Jungle**

- **Criatura no Fundo (Oddish):** modelo 3D em formato OBJ/MTL importado com `OBJLoader`/`MTLLoader`, colocado fora da pista a escala 80× a olhar para o centro

**🌌 Arena Space**

- **Torres ADN:** cilindro central fino + tubo de vidro transparente; centenas de `BoxGeometry` magenta e ciano posicionadas matematicamente criando dupla-hélice rotativa
- **Drone Vigia:** octaedro construído via `BufferGeometry` com posicionamento numérico dos 6 vértices; emite laser vertical com sobreposição de cilindros + partículas; escolta de `OctahedronGeometry` rotativos
- **Painéis Holográficos HUD:** `CylinderGeometry` achatada e rodada simulando vidro curvo ciano com efeito de refração
- **Monólitos Matrix:** grandes blocos com 800 pequenos cubos iterados por todas as faces, cada cubo com velocidade própria subindo/descendo para simular energia cibernética

---

### Sistema de iluminação por mapa

- **Deserto:** `HemisphereLight` (azul-céu/areia), `PointLight` amarelas nas torres de glifos e cristal, iluminação individual por cápsula em espiral
- **Gelo:** `HemisphereLight` aurora boreal, `PointLight` carmesim lateral, luzes de chão ciano em ~10% dos pilares aleatórios, luzes nos glaciares e cristais com núcleo ativo
- **Jungle:** `SpotLight` em cone do topo a apontar ao centro (clareira), `PointLight` central suave, mega `PointLight` verde frontal no Oddish (intensidade 200)
- **Space:** `PointLight` ciano na base e magenta no topo das torres ADN, luzes de backlighting nos HUDs, `PointLight` intensidade 50 no impacto do laser do drone, luzes nos monólitos (intensidade 30)

---

### Sistema de animação

- Loop principal no `main.js` com `THREE.Clock` e `delta` para framerate independente
- `main.js` chama `atualizarDeserto(delta)`, `atualizarGelo(delta)`, `atualizarJungle(delta)`, `atualizarSpace(delta)` em todos os frames
- Cada função começa com `if (!_estado) return`, inativa se o mapa não estiver carregado
- Animações via `geometry.attributes.position.needsUpdate = true` para partículas (areia, neve, folhas)
- Rotações contínuas com `Math.sin()`/`Math.cos()` e `delta` para objetos orbitais (hélice ADN, drone, monólitos)

---

## Desvios face à planificação anterior

A Semana 3 esteve desvios pois ja fizemos iluminaçoes e animaçoes de alguns objetos, e alem da mota um skate como veiculo.

## Auto-avaliação do progresso semanal por aluno

**Liane Duarte** - 20

**Filipe Silva** - 20

**Pedro Braz** - 20

---

## Evidências dos progressos

[IMAGEM: arena Deserto com falésias, torres de glifos e pirâmide voxel ao fundo]

[IMAGEM: arena Gelo com cristais spikes, glaciares hexagonais e neve digital]

[IMAGEM: arena Jungle com árvores, rochas e criatura Oddish ao fundo]

[IMAGEM: arena Space com torres ADN, drone vigia e painéis holográficos]

---

## Planificação para a Semana 4 (28 Abr – 4 Mai)

- Implementar controlos de teclado para as motas (WASD / setas)
- Câmara em 3ª pessoa a seguir a mota ativa
- E outras melhorias
