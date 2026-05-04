import * as THREE from 'three';
import * as dat from 'lil-gui';

export var gui = null;
var gameContext = null;

export function initDebugGUI(context) {
    if (gui) return;

    gameContext = context;
    gui = new dat.GUI({ title: 'NEON DRIVE - Controlos' });

    // Estilo Synthwave/Neon personalizado para o GUI
    const style = document.createElement('style');
    style.innerHTML = `
        .lil-gui { 
            --background-color: rgba(5, 5, 15, 0.85);
            --text-color: #00eaff;
            --title-background-color: rgba(255, 0, 102, 0.8);
            --widget-color: rgba(0, 234, 255, 0.2);
            --hover-color: rgba(0, 234, 255, 0.4);
            --focus-color: #ff0066;
            --number-color: #fff;
            --string-color: #fff;
            --font-family: 'Consolas', 'Courier New', monospace;
            border: 1px solid #ff0066;
            box-shadow: 0 0 10px rgba(255, 0, 102, 0.5);
            border-radius: 4px;
        }
        .lil-gui .title { border-bottom: 1px solid #ff0066; font-weight: bold; text-shadow: 0 0 5px #000; }
        .lil-gui .folder > .title { background: rgba(15, 15, 30, 0.8); border-top: 1px solid rgba(0, 234, 255, 0.3); }
    `;
    document.head.appendChild(style);

    // Move the GUI slightly if we want, but top-right is default and fine
    gui.domElement.style.position = 'absolute';
    gui.domElement.style.top = '15px';
    gui.domElement.style.right = '15px';
    gui.domElement.style.zIndex = '1000';

    // Luzes Folder
    const luzesFolder = gui.addFolder('Iluminação');
    luzesFolder.add(gameContext, 'ambientIntensity', 0, 3).name('Ambiente Int.').onChange(v => {
        if (gameContext.luzes && gameContext.luzes.ambiente) {
            gameContext.luzes.ambiente.intensity = v;
        }
    });
    luzesFolder.addColor(gameContext, 'ambientColor').name('Cor Ambiente').onChange(c => {
        if (gameContext.luzes && gameContext.luzes.ambiente) {
            gameContext.luzes.ambiente.color.setHex(c);
        }
    });
    
    luzesFolder.add(gameContext, 'dirIntensity', 0, 5).name('Direcional Int.').onChange(v => {
        if (gameContext.luzes && gameContext.luzes.direcional) {
            gameContext.luzes.direcional.intensity = v;
        }
    });
    luzesFolder.add(gameContext, 'toggleShadows').name('Sombra (Ativar/Desat)').onChange(v => {
        if (gameContext.luzes && gameContext.luzes.direcional) {
            gameContext.luzes.direcional.castShadow = v;
        }
    });

    // Áudio Folder
    const audioFolder = gui.addFolder('Áudio e Som');
    audioFolder.add(gameContext, 'musicVolume', 0, 1).name('Música de Fundo').onChange(v => {
        gameContext.updateAudio({ music: v });
    });
    audioFolder.add(gameContext, 'sfxVolume', 0, 1).name('Efeitos (SFX)').onChange(v => {
        gameContext.updateAudio({ sfx: v });
    });

    // Visuals Folder
    const visualFolder = gui.addFolder('Ambiente (Cena)');
    visualFolder.addColor(gameContext, 'sceneBgColor').name('Cor Fundo').onChange(c => {
        if (gameContext.cena) {
            gameContext.cena.background.setHex(c);
            if (gameContext.cena.fog) gameContext.cena.fog.color.setHex(c);
        }
    });
    visualFolder.add(gameContext, 'wireframeMode').name('Wireframe (Arena)').onChange(v => {
        if (gameContext.grupoArena) {
            gameContext.grupoArena.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.wireframe = v);
                    } else {
                        child.material.wireframe = v;
                    }
                }
            });
        }
    });
    visualFolder.add(gameContext, 'temFog').name('Nevoeiro (Ativo)').onChange(v => {
        if (gameContext.cena) {
            if (v && !gameContext.cena.fog) {
                gameContext.cena.fog = new THREE.Fog(gameContext.sceneBgColor, 20, 100);
            } else if (!v) {
                gameContext.cena.fog = null;
            }
        }
    });

    // Câmara Folder
    const camFolder = gui.addFolder('Câmara');
    camFolder.add(gameContext, 'cameraMode', ['livre', 'terceiraPessoa', 'topo']).name('Modo').onChange(v => {
        gameContext.setCameraMode(v);
    });

    // Start closed to not clutter the screen by default
    gui.close();
}

export function updateDebugContext(luzes, cena, grupoArena) {
    if (!gameContext) return;
    
    gameContext.luzes = luzes;
    gameContext.cena = cena;
    gameContext.grupoArena = grupoArena;
    
    if (luzes && luzes.ambiente) {
        gameContext.ambientIntensity = luzes.ambiente.intensity;
        gameContext.ambientColor = luzes.ambiente.color.getHex();
    }
    if (luzes && luzes.direcional) {
        gameContext.dirIntensity = luzes.direcional.intensity;
    }
    if (cena && cena.background) {
        gameContext.sceneBgColor = cena.background.getHex();
    }

    // Refresh GUI controllers to show new values when map changes
    gui.controllersRecursive().forEach(c => c.updateDisplay());
}
