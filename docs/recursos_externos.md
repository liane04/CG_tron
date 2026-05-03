# Recursos Externos

Referência rápida de sites, bibliotecas e ferramentas úteis para o projeto.

---

## 1. Modelos 3D Gratuitos (GLTF / OBJ / FBX)

| Site                  | URL                                                                                             | Notas                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Sketchfab**   | [sketchfab.com](https://sketchfab.com/search?features=downloadable&sort_by=-relevance&type=models) | ⭐ Melhor opção. Filtrar por**Downloadable** → **Free**. Download direto em GLTF/GLB. Licenças CC-BY e CC0 |
| **Poly Pizza**  | [poly.pizza](https://poly.pizza)                                                                   | Modelos low-poly em GLTF. Estilo ideal para jogos                                                                          |
| **Free3D**      | [free3d.com](https://free3d.com)                                                                   | OBJ, FBX, GLTF. Boa variedade de veículos                                                                                 |
| **Kenney**      | [kenney.nl/assets](https://kenney.nl/assets)                                                       | Assets de gaming gratuitos em GLTF. Licença CC0                                                                           |
| **CGTrader**    | [cgtrader.com](https://www.cgtrader.com/free-3d-models)                                            | Filtrar por Free. Formatos variados                                                                                        |
| **TurboSquid**  | [turbosquid.com](https://www.turbosquid.com/Search/3D-Models/free)                                 | Filtrar por Free. Qualidade geralmente alta                                                                                |
| **Open3DModel** | [open3dmodel.com](https://open3dmodel.com)                                                         | Modelos gratuitos variados                                                                                                 |

### Pesquisas sugeridas para o projeto

- `sci-fi speeder`, `hover car`, `cyberpunk vehicle`
- `sci-fi glider`, `hover pod`, `flying vehicle`
- `tron light cycle`, `neon vehicle`
- `futuristic motorcycle`, `hover bike`

### Dicas de download

- Preferir formato **GLTF/GLB** (compatível direto com `GLTFLoader`)
- Se só houver OBJ/FBX, usar o [gltf.report](https://gltf.report/) para converter/otimizar
- Verificar a licença — **CC-BY** (citar autor) ou **CC0** (uso livre)
- Citar sempre o autor e o site no relatório

---

## 2. Texturas Gratuitas (PBR)

| Site                   | URL                                                   | Notas                                                                               |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Poly Haven**   | [polyhaven.com/textures](https://polyhaven.com/textures) | ⭐ Texturas PBR completas (diffuse, normal, roughness, metalness, AO). Licença CC0 |
| **ambientCG**    | [ambientcg.com](https://ambientcg.com)                   | PBR gratuito, resolução até 8K. Licença CC0                                     |
| **3D Textures**  | [3dtextures.me](https://3dtextures.me)                   | PBR gratuito. Boa seleção de metais e superfícies                                |
| **Textures.com** | [textures.com](https://www.textures.com)                 | Créditos diários gratuitos                                                        |

---

## 3. Música e Efeitos Sonoros Gratuitos

| Site | URL | Notas |
|------|-----|-------|
| **Pixabay Music** | [pixabay.com/music](https://pixabay.com/music/search/synthwave/) | ⭐ Gratuito, sem atribuição. Pesquisar "synthwave", "retrowave" |
| **Freesound** | [freesound.org](https://freesound.org) | CC0 e CC-BY. Ideal para SFX (explosões, colisões, motores) |
| **Mixkit** | [mixkit.co/free-music](https://mixkit.co/free-music/) | Gratuito, sem licença restritiva |
| **Incompetech** | [incompetech.com](https://incompetech.com/music/) | Kevin MacLeod. CC-BY (citar autor). Grande variedade |
| **Free Music Archive** | [freemusicarchive.org](https://freemusicarchive.org) | Licenças CC variadas. Filtrar por género |
| **Uppbeat** | [uppbeat.io](https://uppbeat.io) | Gratuito com conta. Boa qualidade |

### Pesquisas sugeridas
- `synthwave`, `retrowave`, `80s retro`, `cyberpunk`
- `neon`, `outrun`, `electronic ambient`
- Para SFX: `engine loop`, `explosion`, `collision`, `laser`, `neon hum`

### Dicas
- Usar **MP3 128kbps** para manter ficheiros leves (3-5MB por track de 3 min)
- Manter volume de música de fundo baixo (0.2-0.3) para não abafar SFX
- Citar sempre o autor e licença no relatório
- Browsers bloqueiam autoplay — iniciar música após primeira interação do utilizador

---

## 4. Criar os Próprios Modelos 3D

### Online (sem instalar nada)

| Ferramenta          | URL                                                              | Notas                                                  |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| **SculptGL**  | [stephaneginier.com/sculptgl](https://stephaneginier.com/sculptgl/) | Escultura 3D no browser. Exporta OBJ/STL               |
| **3DC.io**    | [3dc.io](https://3dc.io)                                            | Modelação simples no browser. Exporta GLTF           |
| **Tinkercad** | [tinkercad.com](https://www.tinkercad.com)                          | Modelação com primitivas (Autodesk). Exporta OBJ/STL |
| **Clara.io**  | [clara.io](https://clara.io)                                        | Editor 3D completo no browser. Exporta GLTF/OBJ/FBX    |

### Desktop (instalação necessária)

| Ferramenta           | URL                                       | Notas                                                                                                |
| -------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Blender**    | [blender.org](https://www.blender.org)       | ⭐ Gratuito e profissional. Exporta GLTF/GLB nativo. Curva de aprendizagem alta mas muitos tutoriais |
| **Blockbench** | [blockbench.net](https://www.blockbench.net) | Modelação com cubos/blocos (estilo voxel). Exporta GLTF. Ideal para estética retro/low-poly       |

### Dicas para criar modelos

- **Blender** é o mais versátil mas demora a aprender — ver tutoriais "Blender to Three.js GLTF" no YouTube
- **Blockbench** é mais rápido para modelos simples estilo retro (combina bem com o tema Tron)
- Exportar sempre em **GLTF 2.0** (.glb) — formato nativo do Three.js
- Manter os modelos leves (<1MB) para não afetar performance

---

## 5. Bibliotecas JavaScript Extra

### Recomendadas

| Biblioteca         | CDN                                                                              | Para quê                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **lil-gui**  | `https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.esm.min.js`            | Painel de controlo interativo. Permite ajustar luzes, materiais, câmara em tempo real.**Excelente para a defesa** |
| **stats.js** | `https://cdn.jsdelivr.net/npm/three@0.173.0/examples/jsm/libs/stats.module.js` | Contador de FPS. Já incluído no Three.js                                                                               |

### Opcionais

| Biblioteca          | CDN                                                                 | Para quê                                         |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| **howler.js** | `https://cdn.jsdelivr.net/npm/howler@2.2.4/dist/howler.min.js`    | Áudio e efeitos sonoros                          |
| **cannon-es** | `https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js` | Motor de física (colisões realistas, gravidade) |

### Como adicionar ao projeto

Adicionar ao `importmap` no `index.html`:

```html
<script type="importmap">
    {
        "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.173.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.173.0/examples/jsm/",
            "lil-gui": "https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.esm.min.js"
        }
    }
</script>
```

---

## 6. Ferramentas Úteis

| Ferramenta                  | URL                                                                          | Para quê                                             |
| --------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **gltf.report**       | [gltf.report](https://gltf.report/)                                             | Visualizar, comprimir e otimizar modelos GLTF         |
| **glTF Viewer**       | [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)               | Preview rápido de modelos GLTF no browser            |
| **Normal Map Online** | [cpetry.github.io/NormalMap-Online](https://cpetry.github.io/NormalMap-Online/) | Gerar normal maps a partir de imagens                 |
| **Three.js Editor**   | [threejs.org/editor](https://threejs.org/editor/)                               | Editor visual do Three.js — testar cenas rapidamente |

---

*Última atualização: 3 de maio de 2026*
