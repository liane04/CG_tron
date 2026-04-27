import * as THREE from 'three';

export function criarLuzes(cena, mapa) {
    var luzes = {};

    luzes.ambiente = new THREE.AmbientLight(mapa.luzAmbiente, 1.2);
    cena.add(luzes.ambiente);

    luzes.direcional = new THREE.DirectionalLight(0xffffff, 0.4);
    luzes.direcional.position.set(20, 40, 15);
    cena.add(luzes.direcional);

    luzes.pontoArena = new THREE.PointLight(0x0066ff, 1, 60);
    luzes.pontoArena.position.set(0, 15, 0);
    cena.add(luzes.pontoArena);

    luzes.pontoMota1 = new THREE.PointLight(0x00ffff, 0.8, 15);
    cena.add(luzes.pontoMota1);

    luzes.pontoMota2 = new THREE.PointLight(0xff0066, 0.8, 15);
    cena.add(luzes.pontoMota2);

    if (mapa.id === 'deserto') {
        luzes.direcional.color.set(0xFFB347);
        luzes.direcional.intensity = 1.5;
        luzes.direcional.position.set(60, 20, 40);
        luzes.direcional.castShadow = true;
        luzes.direcional.shadow.mapSize.set(1024, 1024);
        luzes.direcional.shadow.camera.left   = -40;
        luzes.direcional.shadow.camera.right  =  40;
        luzes.direcional.shadow.camera.top    =  40;
        luzes.direcional.shadow.camera.bottom = -40;
        luzes.direcional.shadow.camera.near   = 1;
        luzes.direcional.shadow.camera.far    = 150;
        luzes.direcional.shadow.camera.updateProjectionMatrix();

        luzes.ambiente.intensity = 1.2;
        luzes.pontoArena.color.set(0xff8800);
        luzes.pontoMota1.color.set(0x00ffff);
        luzes.pontoMota2.color.set(0xff0066);
    } else if (mapa.id === 'jungle') {
        luzes.direcional.color.set(0xa8d870);
        luzes.direcional.intensity = 0.6;
        luzes.direcional.position.set(-20, 30, 15);
        luzes.direcional.castShadow = true;
        luzes.direcional.shadow.mapSize.set(1024, 1024);
        luzes.direcional.shadow.camera.left   = -25;
        luzes.direcional.shadow.camera.right  =  25;
        luzes.direcional.shadow.camera.top    =  25;
        luzes.direcional.shadow.camera.bottom = -25;
        luzes.direcional.shadow.camera.near   = 1;
        luzes.direcional.shadow.camera.far    = 120;
        luzes.direcional.shadow.camera.updateProjectionMatrix();

        luzes.ambiente.intensity = 0.8;
        luzes.pontoArena.color.set(0x00ff44);
    } else {
        luzes.direcional.color.set(0xffffff);
        luzes.direcional.intensity = 0.4;
        luzes.direcional.position.set(20, 40, 15);
        luzes.direcional.castShadow = false;
    }

    return luzes;
}

export function toggleLuz(luzes, tipo) {
    luzes[tipo].visible = !luzes[tipo].visible;
}
