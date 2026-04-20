# Plano de Desenvolvimento — Tron Light Cycles
**Computação Gráfica · UTAD · 2025/2026**
Grupo: Filipe Silva (82239) · Liane Duarte (79012) · Pedro Braz (81311)

---

## 1. Visão Geral do Projeto

Aplicação gráfica 3D em Three.js inspirada no **Tron Light Cycles (1982, Disney)**. Dois jogadores controlam motas numa arena fechada, deixando paredes de luz atrás de si. O objetivo é forçar o adversário a colidir com uma parede.

**Entrega:** 25 de maio de 2026 (última aula do semestre)
**Repositório:** `CG_tron/` — módulos em `js/`, texturas em `textures/`, docs em `docs/`

---

## 2. Mapeamento de Requisitos do Protocolo

| # | Requisito | Como é satisfeito no projeto | Ficheiro principal |
|---|-----------|-----------------------------|--------------------|
| R1 | Objetos 3D complexos com primitivas + texturas nativas e importadas | Motas (BoxGeometry + CylinderGeometry), arena (PlaneGeometry + EdgesGeometry), paredes de luz (BoxGeometry), obstáculos. Materiais MeshStandardMaterial emissivos + texturas polyhaven | `arena.js`, `mota.js` (a criar) |
| R2 | Câmara perspetiva e ortográfica alternáveis | Implementado: tecla **C** alterna entre `PerspectiveCamera` e `OrthographicCamera` | `main.js` |
| R3 | Múltiplos tipos de luz com toggle individual | AmbientLight, DirectionalLight, PointLight (nas motas/arena). Toggle com teclas **1/2/3** | `luzes.js` (a criar) |
| R4 | Interação via teclado | Setas / WASD para direção das motas, Espaço para saltar, C para câmara, 1/2/3 para luzes, R para reiniciar | `input.js` (a criar) |
| R5 | Animação contínua com possibilidade de reinício | Movimento das motas, crescimento das paredes de luz, salto parabólico, explosão de partículas, reinício com **R** | `jogo.js` (a criar) |

---

## 3. Arquitetura de Ficheiros

```
CG_tron/
├── index.html
├── js/
│   ├── main.js          ✅ Cena, renderer, câmaras, loop
│   ├── arena.js         ✅ Construção da arena + temas de mapa
│   ├── menu.js          ✅ Menu inicial + seleção de mapa
│   ├── mapas.js         ✅ Configurações visuais por mapa
│   ├── mota.js          🔧 T2 — Modelo 3D da mota + materiais neon
│   ├── input.js         🔧 T3 — Gestão de inputs de teclado (jogo)
│   ├── luzes.js         🔧 T4 — Luzes cena + sistema de toggles
│   ├── trail.js         🔧 T5 — Paredes de luz dinâmicas
│   ├── colisoes.js      🔧 T5 — Deteção de colisões
│   └── jogo.js          🔧 T5/T6 — Lógica central do jogo
├── textures/
│   ├── textures_areia/  ✅ Diffuse + normal + roughness
│   └── [outros mapas]   🔧 T6 — ICE, LAVA, SPACE, etc.
└── docs/
    ├── plano_desenvolvimento.md  ← este ficheiro
    └── topicos_semanais/
```

**Legenda:** ✅ Concluído · 🔧 A implementar

---

## 4. Calendarização Detalhada

### T1 — Configuração Three.js + Arena 3D · ✅ CONCLUÍDO (14–20 Abr)

**Entregável do marco:** Início de desenvolvimento (14 Abr) ✅

O que foi feito:
- Setup Three.js com importmap, WebGLRenderer, loop de animação
- Arena 3D: chão (PlaneGeometry), grelha neon (GridHelper), 4 paredes (EdgesGeometry)
- Câmaras perspetiva e ortográfica com alternância por tecla C
- Menu inicial com animação neon + ecrã de seleção de mapa
- Sistema de mapas (mapas.js): temas TRON e DESERT
- Texturas PBR no mapa DESERT (diffuse, normal map, roughness via polyhaven)
- Iluminação base: AmbientLight + DirectionalLight por tema

---

### T2 — Objetos 3D das Motas + Materiais Neon · 🔧 EM CURSO (21–27 Abr)

**Entregável do marco:** Veículos prontos (27 Abr)

**Objetivo:** Criar `mota.js` com um modelo 3D composto por primitivas Three.js e materiais emissivos adaptados ao tema do mapa.

#### Estrutura da mota (hierarquia de objetos):
```
Group (mota)
├── corpo        — BoxGeometry (comprido, baixo)
├── carenagem    — BoxGeometry (estreito, aerodinâmico, inclinado)
├── cockpit      — BoxGeometry (pequeno, em cima)
├── rodaFrente   — CylinderGeometry (rotação 90° no eixo Z)
├── rodaTras     — CylinderGeometry (rotação 90° no eixo Z)
├── luzFrente    — PointLight (fraca, cor do tema)
└── linhasNeon   — EdgesGeometry sobre corpo (MeshBasicMaterial emissivo)
```

#### Materiais por tema:
| Parte | Mapa TRON | Mapa DESERT |
|-------|-----------|-------------|
| Corpo | MeshStandardMaterial #0a0a1a + emissive #00ffff 0.3 | MeshStandardMaterial #1a0a00 + emissive #ff8800 0.3 |
| Neon | MeshBasicMaterial #00ffff | MeshBasicMaterial #ff8800 |
| Rodas | MeshStandardMaterial #111111 metalness 0.8 | MeshStandardMaterial #222222 metalness 0.6 |

#### Posicionamento inicial:
- Mota 1 (Jogador 1): `(-ARENA/4, 0.5, 0)`, direção `+Z`
- Mota 2 (Jogador 2): `(+ARENA/4, 0.5, 0)`, direção `-Z`

#### Tarefas da semana:
- [ ] Criar `js/mota.js` com função `criarMota(tema, corNeon)`
- [ ] Montar hierarquia de Group com corpo + carenagem + cockpit
- [ ] Adicionar rodas com CylinderGeometry rotacionadas corretamente
- [ ] Aplicar MeshStandardMaterial emissivo ao corpo
- [ ] Adicionar EdgesGeometry com MeshBasicMaterial para linhas neon
- [ ] Instanciar as duas motas em `main.js` ao iniciar o jogo
- [ ] Testar render das motas nos dois temas (TRON e DESERT)

---

### T3 — Câmaras Avançadas + Controlo por Teclado · 🔧 (28 Abr – 4 Mai)

**Entregável do marco:** Câmaras funcionais (4 Mai)

**Objetivo:** Implementar controlo das motas por teclado e câmara em 3ª pessoa que segue a mota ativa.

#### Modos de câmara:
| Tecla | Modo | Descrição |
|-------|------|-----------|
| C | Alterna | Perspetiva ↔ Ortográfica (já implementado) |
| V | 3ª Pessoa | Câmara segue a mota do jogador 1 por trás |
| B | Topo | OrthographicCamera vista de cima (sem OrbitControls) |

#### Câmara 3ª pessoa (a implementar em `main.js`):
```javascript
// No loop de animação, após mover a mota:
var offset = new THREE.Vector3(0, 4, -8); // atrás e acima
offset.applyQuaternion(mota1.quaternion);
camaraPerspetiva.position.copy(mota1.position).add(offset);
camaraPerspetiva.lookAt(mota1.position);
```

#### Controlo das motas (`input.js`):
```
Jogador 1 (Setas):    ArrowUp/Down/Left/Right + Shift (salto)
Jogador 2 (WASD):     W/A/S/D + Espaço (salto)
```

> **Nota:** As motas no Tron movem-se sempre para a frente. As teclas Esquerda/Direita apenas **rodam** a mota 90° — não a travam. Implementar como `mota.rotation.y += Math.PI/2` no keydown.

#### Animação de salto (trajetória parabólica):
```javascript
// Estado da mota tem: saltando=false, tSalto=0
if (saltando) {
    tSalto += delta;
    mota.position.y = alturaBase + alturaMaxSalto * Math.sin(Math.PI * tSalto / duracaoSalto);
    if (tSalto >= duracaoSalto) { saltando = false; mota.position.y = alturaBase; }
}
```

#### Tarefas da semana:
- [ ] Criar `js/input.js` com estado de teclas pressionadas para cada jogador
- [ ] Implementar movimento contínuo das motas no loop (velocidade × delta)
- [ ] Implementar rotação 90° à esquerda/direita no keydown
- [ ] Implementar salto com trajetória parabólica
- [ ] Implementar câmara 3ª pessoa que segue mota1
- [ ] Desativar OrbitControls quando câmara está em modo 3ª pessoa

---

### T4 — Sistema de Luzes com Toggle · 🔧 (5–11 Mai)

**Entregável do marco:** Luzes implementadas (11 Mai)

**Objetivo:** Criar `luzes.js` com pelo menos 3 tipos de luz, cada uma com toggle independente via teclado.

#### Luzes a implementar:

| Tipo | Posição / Config | Toggle | Cor (TRON) |
|------|-----------------|--------|------------|
| `AmbientLight` | Intensidade 1.2 | Tecla **1** | #222244 |
| `DirectionalLight` | position(20,40,15), intensity 0.4 | Tecla **2** | #ffffff |
| `PointLight` (arena) | Centro da arena, y=15, intensity 1 | Tecla **3** | #0066ff |
| `PointLight` (mota1) | Segue a mota1, y+1 | Tecla **4** | cor do neon da mota1 |
| `PointLight` (mota2) | Segue a mota2, y+1 | Tecla **5** | cor do neon da mota2 |

#### Estrutura de `luzes.js`:
```javascript
export function criarLuzes(cena, mapa) {
    const luzes = {
        ambiente: new THREE.AmbientLight(mapa.luzAmbiente, 1.2),
        direcional: new THREE.DirectionalLight(0xffffff, 0.4),
        pontoArena: new THREE.PointLight(0x0066ff, 1, 60),
        pontoMota1: new THREE.PointLight(0x00ffff, 0.8, 15),
        pontoMota2: new THREE.PointLight(0xff8800, 0.8, 15),
    };
    Object.values(luzes).forEach(l => cena.add(l));
    return luzes;
}

export function toggleLuz(luzes, tipo) {
    luzes[tipo].visible = !luzes[tipo].visible;
}
```

#### HUD de estado das luzes:
Mostrar no ecrã (HTML overlay) quais as luzes ativas:
```
[1] Ambiente: ON   [2] Direcional: ON   [3] Arena: ON
```

#### Tarefas da semana:
- [ ] Criar `js/luzes.js` com todas as luzes
- [ ] Refactorizar `main.js` para usar `criarLuzes()`
- [ ] Implementar toggles 1–5 em `input.js`
- [ ] Atualizar posição das PointLights das motas no loop
- [ ] Criar HUD HTML simples que reflita estado das luzes
- [ ] Ajustar intensidades por tema de mapa (TRON vs DESERT vs futuros)

---

### T5 — Trail de Luz + Colisões + Lógica do Jogo · 🔧 (12–18 Mai)

**Entregável do marco:** Jogo jogável (18 Mai)

**Objetivo:** Implementar a mecânica central: paredes de luz crescentes e deteção de colisões.

#### Sistema de Trail (`trail.js`):

Estratégia: a cada frame, se a mota avançou, criar um segmento de parede (`BoxGeometry` fino e alto).

```javascript
// Estrutura de dados para o trail de cada mota
const trail = {
    segmentos: [],          // array de THREE.Mesh
    ultimaPosicao: null,    // THREE.Vector3
    grupo: new THREE.Group()
};

// No loop, ao mover a mota:
function atualizarTrail(trail, motaPos, motaDir, cena) {
    if (!trail.ultimaPosicao) { trail.ultimaPosicao = motaPos.clone(); return; }
    
    const distancia = motaPos.distanceTo(trail.ultimaPosicao);
    if (distancia < 0.1) return; // sem movimento suficiente
    
    const meio = trail.ultimaPosicao.clone().lerp(motaPos, 0.5);
    const geo = new THREE.BoxGeometry(0.3, 2, distancia);
    const mat = new THREE.MeshBasicMaterial({ color: corNeon, transparent: true, opacity: 0.8 });
    const segmento = new THREE.Mesh(geo, mat);
    segmento.position.copy(meio);
    segmento.rotation.y = Math.atan2(motaDir.x, motaDir.z);
    
    cena.add(segmento);
    trail.segmentos.push(segmento);
    trail.ultimaPosicao = motaPos.clone();
}
```

#### Deteção de Colisões (`colisoes.js`):

Usar `Box3` (AABB — Axis-Aligned Bounding Box) para eficiência:

```javascript
export function verificarColisoes(mota, trailProprio, trailAdversario, paredesArena, ARENA) {
    const boxMota = new THREE.Box3().setFromObject(mota);
    
    // 1. Colisão com paredes da arena
    if (Math.abs(mota.position.x) > ARENA/2 || Math.abs(mota.position.z) > ARENA/2) {
        return true; // colidiu
    }
    
    // 2. Colisão com trail do adversário
    for (const seg of trailAdversario.segmentos) {
        const boxSeg = new THREE.Box3().setFromObject(seg);
        if (boxMota.intersectsBox(boxSeg)) return true;
    }
    
    // 3. Colisão com trail próprio (exceto segmentos mais recentes)
    const segmentosAVerificar = trailProprio.segmentos.slice(0, -5); // ignorar os 5 mais recentes
    for (const seg of segmentosAVerificar) {
        const boxSeg = new THREE.Box3().setFromObject(seg);
        if (boxMota.intersectsBox(boxSeg)) return true;
    }
    
    return false;
}
```

#### Explosão de Partículas (colisão):

```javascript
export function criarExplosao(cena, posicao, cor) {
    const particulas = [];
    for (let i = 0; i < 40; i++) {
        const geo = new THREE.SphereGeometry(0.15);
        const mat = new THREE.MeshBasicMaterial({ color: cor });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(posicao);
        p.userData.vel = new THREE.Vector3(
            (Math.random()-0.5)*0.3,
            Math.random()*0.3,
            (Math.random()-0.5)*0.3
        );
        p.userData.vida = 1.0;
        cena.add(p);
        particulas.push(p);
    }
    return particulas;
}

// No loop, atualizar partículas:
// p.position.addScaledVector(p.userData.vel, delta*60);
// p.userData.vida -= delta;
// p.material.opacity = p.userData.vida;
// if (p.userData.vida <= 0) cena.remove(p);
```

#### Lógica do Jogo (`jogo.js`):

Estados: `MENU → EM_JOGO → EXPLOSAO → FIM_RONDA → MENU`

```javascript
const ESTADO = { MENU: 0, EM_JOGO: 1, EXPLOSAO: 2, FIM: 3 };
let estadoAtual = ESTADO.MENU;
let pontuacao = { j1: 0, j2: 0 };
```

- Ao colidir: transitar para `EXPLOSAO`, criar partículas, aguardar 2s, mostrar ecrã de resultado
- Reiniciar (**R**): limpar trails, repor posições, `estadoAtual = EM_JOGO`

#### Tarefas da semana:
- [ ] Criar `js/trail.js` com sistema de segmentos dinâmicos
- [ ] Criar `js/colisoes.js` com AABB para trail e paredes
- [ ] Criar `js/jogo.js` com máquina de estados
- [ ] Implementar explosão de partículas na colisão
- [ ] Implementar ecrã de fim de ronda com pontuação
- [ ] Implementar reinício com tecla R
- [ ] Testar múltiplas rondas seguidas sem memory leaks (remover meshes da cena)

---

### T6 — Polimento, Animações e Efeitos · 🔧 (19–25 Mai)

**Entregável do marco:** Entrega final (25 Mai) ⭐

**Objetivo:** Melhorar qualidade visual, adicionar obstáculos e garantir estabilidade.

#### Obstáculos Volumétricos:
- Surgem aleatoriamente na arena após X segundos de jogo
- Geometria: `BoxGeometry` ou `CylinderGeometry` com animação de crescimento vertical
- Material: emissivo semi-transparente da cor do mapa
- Colisão: verificada com o mesmo sistema AABB do T5

```javascript
// Animação de crescimento:
obstaculo.scale.y = Math.min(1, obstaculo.scale.y + delta * velocidadeCrescimento);
obstaculo.position.y = (alturaFinal * obstaculo.scale.y) / 2;
```

#### Efeitos Visuais Adicionais:
- **Bloom simulado:** Aumentar emissiveIntensity dos materiais neon ao longo do trail
- **Glow da mota:** PointLight de baixa intensidade que segue cada mota
- **Animação de câmara no fim de ronda:** câmara faz zoom in na explosão

#### Mapas Adicionais (se tempo permitir):
Conforme `docs/ideias_mapas.md`:
- 🧊 ICE — chão branco/azul, fog azul claro, paredes translúcidas
- 🌋 LAVA — chão escuro com emissivo laranja, fog denso
- 🌌 SPACE — skybox estrelado, sem fog, plataforma metálica

#### Tarefas da semana:
- [ ] Implementar obstáculos com animação de crescimento
- [ ] Adicionar colisão dos obstáculos ao sistema existente
- [ ] Aumentar qualidade visual dos trails (emissiveIntensity progressivo)
- [ ] Adicionar animação de câmara no fim de ronda
- [ ] Implementar 1–2 mapas adicionais (ICE e/ou LAVA)
- [ ] Testes finais de estabilidade e performance
- [ ] Preparar ZIP para entrega no Moodle

---

### T7 — Relatório · 🔧 (28 Abr – 25 Mai, contínuo)

O relatório deve ser escrito **gradualmente** ao longo do projeto.

#### Estrutura sugerida:

1. **Introdução** — Tema, objetivos, referências (GLtron, Armagetron, etc.)
2. **Requisito 1 — Objetos 3D**
   - Primitivas usadas (BoxGeometry, CylinderGeometry, etc.)
   - Hierarquia de Group para a mota
   - Materiais MeshStandardMaterial + MeshBasicMaterial emissivo
   - Texturas PBR importadas (diffuse, normal, roughness)
3. **Requisito 2 — Câmaras**
   - PerspectiveCamera vs OrthographicCamera
   - Câmara de 3ª pessoa que segue a mota
4. **Requisito 3 — Luzes**
   - AmbientLight, DirectionalLight, PointLight
   - Sistema de toggles individuais
5. **Requisito 4 — Interação**
   - Controlo por teclado (dois jogadores)
   - Toggle de câmara e luzes
6. **Requisito 5 — Animação**
   - Movimento contínuo e trails
   - Salto parabólico
   - Explosão de partículas
   - Obstáculos com crescimento vertical
7. **Conclusão** — Dificuldades, aprendizagens, trabalho futuro

> ✍️ Sugestão: cada membro escreve a secção dos requisitos que implementou.

---

## 5. Distribuição de Trabalho por Elemento

| Tarefa | Liane | Filipe | Pedro |
|--------|-------|--------|-------|
| T1 — Setup + Arena | ✅ Lider | | |
| T2 — Motas 3D | | 🔧 | 🔧 |
| T3 — Câmaras + Input | 🔧 Câmaras | 🔧 Input J1 | 🔧 Input J2 |
| T4 — Luzes + Toggle | | 🔧 | 🔧 |
| T5 — Trail + Colisões | 🔧 Trail | 🔧 Colisões | 🔧 Jogo |
| T6 — Polimento | 🔧 | 🔧 | 🔧 |
| T7 — Relatório | R2+R3 | R4+R5 | R1+Intro |

> ⚠️ Distribuição a confirmar pelo grupo — adaptar conforme disponibilidade de cada um.

---

## 6. Checklist Final de Requisitos

Antes da entrega verificar:

- [ ] Pelo menos 2 objetos 3D complexos com primitivas (mota, obstáculos)
- [ ] Materiais nativos (MeshStandardMaterial) em pelo menos 1 objeto
- [ ] Texturas importadas em pelo menos 1 objeto (feito: mapa DESERT)
- [ ] Câmara perspetiva funcional
- [ ] Câmara ortográfica funcional
- [ ] Alternância entre câmaras (tecla C)
- [ ] AmbientLight presente e com toggle
- [ ] DirectionalLight presente e com toggle
- [ ] PointLight presente e com toggle
- [ ] Interação por teclado (controlo das motas)
- [ ] Animação contínua (movimento das motas)
- [ ] Possibilidade de reiniciar animação/jogo (tecla R)
- [ ] Ficheiro ZIP com tudo necessário para abrir no browser
- [ ] Relatório entregue com secção por requisito

---

## 7. Notas Técnicas

### Performance
- Reutilizar geometrias quando possível (`BufferGeometry` partilhada entre segmentos do trail)
- Remover meshes da cena com `cena.remove(mesh)` + `mesh.geometry.dispose()` + `mesh.material.dispose()` ao reiniciar
- Usar `THREE.Clock` para `delta` consistente independente do framerate

### Compatibilidade
- Testar em Chrome e Firefox antes da entrega
- Verificar que o `index.html` abre sem servidor HTTP (importmap funciona em file://)
- Se necessário, usar um servidor local simples: `python -m http.server 8000`

### Recursos Úteis
- Texturas gratuitas: https://polyhaven.com
- Documentação Three.js: https://threejs.org/docs/
- Exemplos Three.js: https://threejs.org/examples/
- Referência GLtron: http://www.gltron.org/

---

*Documento criado em 20/04/2026 — atualizar conforme o projeto avança*
