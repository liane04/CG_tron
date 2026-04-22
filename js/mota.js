import * as THREE from 'three';

// ---------------------------------------------------------------
// Light Cycle — estilo Tron: Legacy
// Corpo extrudido com perfil bezier, linhas neon em TubeGeometry,
// garfo realista com triple clamp e piloto com capacete+visor.
// ---------------------------------------------------------------

export function criarMota(tema, corNeon) {
    var grupo = new THREE.Group();
    grupo.userData.tipo = 'mota';

    var grupoCorpo  = new THREE.Group();
    var grupoRodas  = new THREE.Group();
    var grupoPiloto = new THREE.Group();
    grupo.add(grupoCorpo);
    grupo.add(grupoRodas);
    grupo.add(grupoPiloto);

    var corBase  = (corNeon instanceof THREE.Color) ? corNeon.clone() : new THREE.Color(corNeon);
    var corClara = corBase.clone().lerp(new THREE.Color(0xffffff), 0.35);
    var perfil   = perfilDoTema(tema);

    // ── Materiais ─────────────────────────────────────────────────
    var matCorpo = new THREE.MeshStandardMaterial({
        color: 0x06060f, emissive: corBase,
        emissiveIntensity: perfil.emissivCorpo * 0.12,
        roughness: 0.10, metalness: 0.95
    });
    var matCanopy = new THREE.MeshStandardMaterial({
        color: 0x001020, emissive: corBase, emissiveIntensity: 0.45,
        roughness: 0.08, metalness: 0.25,
        transparent: true, opacity: 0.50, depthWrite: false
    });
    var matNeon = new THREE.MeshStandardMaterial({
        color: corBase, emissive: corBase,
        emissiveIntensity: 2.8, roughness: 0.25, metalness: 0.30
    });
    var matRoda = new THREE.MeshStandardMaterial({
        color: 0x050508, roughness: 0.08, metalness: 0.98
    });
    var matAro = new THREE.MeshStandardMaterial({
        color: corBase, emissive: corBase,
        emissiveIntensity: perfil.emissivAros, roughness: 0.18, metalness: 0.75
    });
    var matHub = new THREE.MeshStandardMaterial({
        color: corClara, emissive: corClara,
        emissiveIntensity: perfil.emissivAros * 0.85,
        roughness: 0.18, metalness: 0.80
    });
    var matEmitter = new THREE.MeshStandardMaterial({
        color: corBase, emissive: corBase,
        emissiveIntensity: 3.0, roughness: 0.30, metalness: 0.25
    });
    var matPiloto = new THREE.MeshStandardMaterial({
        color: 0x080814, emissive: corBase,
        emissiveIntensity: 0.08, roughness: 0.25, metalness: 0.65
    });
    var matVisor = new THREE.MeshStandardMaterial({
        color: 0x001830, emissive: corBase, emissiveIntensity: 1.0,
        roughness: 0.05, metalness: 0.20,
        transparent: true, opacity: 0.65, depthWrite: false
    });

    // ── Dimensões base ────────────────────────────────────────────
    var WR = 0.52;   // raio da roda
    var WT = 0.09;   // largura do pneu
    var WY = WR;     // centro da roda em Y
    var ZF = -1.18;  // posição Z roda dianteira
    var ZR =  1.12;  // posição Z roda traseira

    // ── Rodas ─────────────────────────────────────────────────────
    var rodaF = criarRoda(WR, WT, matRoda, matAro, matHub);
    rodaF.position.set(0, WY, ZF);
    grupoRodas.add(rodaF);

    var rodaR = criarRoda(WR, WT, matRoda, matAro, matHub);
    rodaR.position.set(0, WY, ZR);
    grupoRodas.add(rodaR);

    // ── Corpo principal — ExtrudeGeometry do perfil lateral ───────
    //
    // O Shape é definido em XY onde:
    //   x = posição Z no mundo (frente → trás)
    //   y = altura (Y no mundo)
    //
    // Extrudido 0.22 unidades ao longo do eixo Z local.
    // Após rotation.y = π/2  →  eixo X local vira eixo Z do mundo
    //                          extrução Z local vira eixo -X do mundo
    // position.x = +0.11 centra a peça.
    //
    var bodyShape = new THREE.Shape();
    bodyShape.moveTo(-0.92, 0.28);                                          // nariz frente-baixo
    bodyShape.bezierCurveTo(-1.06, 0.42, -1.00, 0.80, -0.70, 0.93);       // carenagem sobe
    bodyShape.bezierCurveTo(-0.50, 1.02, -0.20, 1.07,  0.10, 1.05);       // para-brisas / topo
    bodyShape.bezierCurveTo( 0.32, 1.03,  0.55, 0.98,  0.72, 0.88);       // assento
    bodyShape.bezierCurveTo( 0.90, 0.80,  1.08, 0.60,  1.10, 0.40);       // cauda desce
    bodyShape.bezierCurveTo( 1.10, 0.24,  0.95, 0.16,  0.75, 0.15);       // canto traseiro-inferior
    bodyShape.bezierCurveTo( 0.20, 0.13, -0.50, 0.14, -0.82, 0.18);       // ventre
    bodyShape.bezierCurveTo(-0.88, 0.20, -0.92, 0.24, -0.92, 0.28);       // fechar no nariz

    var bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
        depth: 0.22,
        bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.022,
        bevelSegments: 4, curveSegments: 20
    });
    var bodyMesh = new THREE.Mesh(bodyGeo, matCorpo);
    bodyMesh.rotation.y = Math.PI / 2;
    bodyMesh.position.x = 0.11;
    aplicarSombras(bodyMesh);
    grupoCorpo.add(bodyMesh);

    // ── Para-brisas transparente ──────────────────────────────────
    var windShape = new THREE.Shape();
    windShape.moveTo(-0.70, 0.91);
    windShape.bezierCurveTo(-0.60, 0.98, -0.46, 1.06, -0.28, 1.10);
    windShape.bezierCurveTo(-0.12, 1.14,  0.06, 1.12,  0.18, 1.08);
    windShape.lineTo(0.14, 0.99);
    windShape.bezierCurveTo( 0.02, 1.02, -0.24, 1.01, -0.42, 0.97);
    windShape.bezierCurveTo(-0.54, 0.93, -0.62, 0.87, -0.65, 0.84);
    windShape.lineTo(-0.70, 0.91);

    var windGeo = new THREE.ExtrudeGeometry(windShape, {
        depth: 0.15, bevelEnabled: false, curveSegments: 12
    });
    var windMesh = new THREE.Mesh(windGeo, matCanopy);
    windMesh.rotation.y = Math.PI / 2;
    windMesh.position.x = 0.075;
    windMesh.position.y += 0.002;
    aplicarSombras(windMesh);
    grupoCorpo.add(windMesh);

    // ── Linhas neon do corpo (TubeGeometry) ───────────────────────
    // Pontos do arco superior e do ventre, em coordenadas [Z, Y] do mundo.
    var topPts = [
        [-0.70, 0.93], [-0.50, 1.02], [-0.20, 1.07],
        [ 0.10, 1.05], [ 0.50, 0.98], [ 0.72, 0.88],
        [ 1.00, 0.62], [ 1.10, 0.40]
    ];
    var botPts = [
        [-0.92, 0.28], [-0.82, 0.18], [-0.50, 0.14],
        [ 0.20, 0.13], [ 0.75, 0.15], [ 1.10, 0.40]
    ];

    [-0.125, 0.125].forEach(function (xSide) {
        tuboNeon(
            new THREE.CatmullRomCurve3(topPts.map(function (p) { return new THREE.Vector3(xSide, p[1], p[0]); })),
            0.016, matNeon, grupoCorpo
        );
        tuboNeon(
            new THREE.CatmullRomCurve3(botPts.map(function (p) { return new THREE.Vector3(xSide, p[1], p[0]); })),
            0.016, matNeon, grupoCorpo
        );
    });

    // ── Garfo dianteiro ───────────────────────────────────────────
    // Triple clamp superior
    var tc = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.055, 0.095), matCorpo);
    tc.position.set(0, WY + 0.52, ZF + 0.46);
    aplicarSombras(tc); grupoCorpo.add(tc);

    // Tubos do garfo + linha neon em cada um
    var geoFork = new THREE.CylinderGeometry(0.032, 0.030, 0.70, 10);
    [-0.088, 0.088].forEach(function (x) {
        var f = new THREE.Mesh(geoFork, matCorpo);
        f.position.set(x, WY + 0.27, ZF + 0.24);
        f.rotation.x = -0.80;
        aplicarSombras(f); grupoCorpo.add(f);

        tuboNeon(new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, WY + 0.52, ZF + 0.44),
            new THREE.Vector3(x, WY + 0.27, ZF + 0.24),
            new THREE.Vector3(x, WY + 0.05, ZF + 0.07),
        ]), 0.013, matNeon, grupoCorpo);
    });

    // Lower clamp + guiador
    var lc = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.048, 0.082), matCorpo);
    lc.position.set(0, WY + 0.07, ZF + 0.09);
    aplicarSombras(lc); grupoCorpo.add(lc);

    tuboNeon(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.16, WY + 0.60, ZF + 0.47),
        new THREE.Vector3(-0.05, WY + 0.64, ZF + 0.49),
        new THREE.Vector3( 0.05, WY + 0.64, ZF + 0.49),
        new THREE.Vector3( 0.16, WY + 0.60, ZF + 0.47),
    ]), 0.022, matNeon, grupoCorpo);

    // ── Saia emissiva (borda inferior de cada lado) ───────────────
    [-0.145, 0.145].forEach(function (x) {
        tuboNeon(new THREE.CatmullRomCurve3([
            new THREE.Vector3(x, WY - 0.16, -0.80),
            new THREE.Vector3(x, WY - 0.18, -0.20),
            new THREE.Vector3(x, WY - 0.18,  0.35),
            new THREE.Vector3(x, WY - 0.16,  0.82),
            new THREE.Vector3(x, WY - 0.10,  1.08),
        ]), 0.015, matNeon, grupoCorpo);
    });

    // ── Faróis ────────────────────────────────────────────────────
    [-0.07, 0.07].forEach(function (x) {
        var fl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.026, 0.038, 8), matEmitter);
        fl.rotation.x = Math.PI / 2;
        fl.position.set(x, WY + 0.10, ZF + 0.04);
        aplicarSombras(fl); grupoCorpo.add(fl);
    });
    var spotF = new THREE.SpotLight(corBase, 0.7, 7, Math.PI * 0.16, 0.5);
    spotF.position.set(0, WY + 0.10, ZF);
    spotF.target.position.set(0, 0, ZF - 3);
    grupo.add(spotF); grupo.add(spotF.target);

    // ── Emitter traseiro ──────────────────────────────────────────
    var emitter = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.27, 0.14), matEmitter);
    emitter.position.set(0, WY + 0.14, ZR + 0.07);
    aplicarSombras(emitter); grupoCorpo.add(emitter);

    var ptL = new THREE.PointLight(corBase, 0.9, 2.8);
    ptL.position.set(0, WY + 0.14, ZR + 0.07);
    grupo.add(ptL);

    // ── Piloto ────────────────────────────────────────────────────
    criarPiloto(grupoPiloto, matPiloto, matVisor, matNeon, WY);

    // Luz por tema
    if (perfil.luz) {
        var lT = new THREE.PointLight(corBase, perfil.luz.intensidade, perfil.luz.distancia, perfil.luz.decay);
        lT.position.set(0, WY + 0.5, 0);
        grupo.add(lT);
    }

    return grupo;
}

// ─── Roda ─────────────────────────────────────────────────────────────────────
function criarRoda(WR, WT, matDisc, matAro, matHub) {
    var roda = new THREE.Group();

    // Pneu (torus arredondado)
    var tire = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.05, 0.075, 18, 52), matDisc);
    tire.rotation.y = Math.PI / 2;
    aplicarSombras(tire); roda.add(tire);

    // Disco central (face da jante)
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(WR * 0.52, WR * 0.52, WT * 0.65, 28), matDisc);
    disc.rotation.z = Math.PI / 2;
    aplicarSombras(disc); roda.add(disc);

    // Aro emissivo (anel interior do pneu)
    var rim = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.05, 0.018, 6, 52), matAro);
    rim.rotation.y = Math.PI / 2;
    roda.add(rim);

    // Hub central emissivo
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, WT + 0.06, 16), matHub);
    hub.rotation.z = Math.PI / 2;
    aplicarSombras(hub); roda.add(hub);

    // 6 raios emissivos
    var spokeR = WR - 0.20;
    for (var i = 0; i < 6; i++) {
        var a = (i * Math.PI) / 3;
        var spk = new THREE.Mesh(
            new THREE.BoxGeometry(WT * 0.55, spokeR, 0.022),
            matAro
        );
        spk.position.set(0, Math.cos(a) * (0.095 + spokeR * 0.5), Math.sin(a) * (0.095 + spokeR * 0.5));
        spk.rotation.x = a;
        aplicarSombras(spk); roda.add(spk);
    }

    return roda;
}

// ─── Piloto ───────────────────────────────────────────────────────────────────
function criarPiloto(grupo, matCorpo, matVisor, matNeon, WY) {
    // Piloto em posição de condução: levemente inclinado para a frente
    var SZ = 0.15; // Z do assento
    var SY = 1.06; // Y do assento (topo do corpo)

    // ANCA
    var hip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.21, 10), matCorpo);
    hip.position.set(0, SY + 0.01, SZ + 0.05);
    hip.rotation.x = 0.14;
    aplicarSombras(hip); grupo.add(hip);

    // TORSO
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.115, 0.47, 10), matCorpo);
    torso.position.set(0, SY + 0.29, SZ - 0.10);
    torso.rotation.x = -0.42;
    aplicarSombras(torso); grupo.add(torso);

    // CAPACETE
    var helmet = new THREE.Mesh(new THREE.SphereGeometry(0.158, 18, 14), matCorpo);
    helmet.scale.set(1.0, 1.10, 1.20);
    helmet.position.set(0, SY + 0.57, SZ - 0.28);
    aplicarSombras(helmet); grupo.add(helmet);

    // VISOR
    var visor = new THREE.Mesh(new THREE.SphereGeometry(0.118, 14, 10), matVisor);
    visor.scale.set(0.82, 0.50, 0.52);
    visor.position.set(0, SY + 0.53, SZ - 0.39);
    grupo.add(visor);

    // BRAÇOS (esticados para o guiador)
    [-0.112, 0.112].forEach(function (x) {
        var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.034, 0.50, 8), matCorpo);
        arm.position.set(x, SY + 0.27, SZ - 0.33);
        arm.rotation.x = -0.70;
        arm.rotation.z = x > 0 ? 0.12 : -0.12;
        aplicarSombras(arm); grupo.add(arm);
    });

    // COXAS
    [-0.092, 0.092].forEach(function (x) {
        var thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.42, 8), matCorpo);
        thigh.position.set(x, SY - 0.06, SZ + 0.15);
        thigh.rotation.x = 0.64;
        aplicarSombras(thigh); grupo.add(thigh);
    });

    // CANELAS
    [-0.092, 0.092].forEach(function (x) {
        var shin = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.37, 8), matCorpo);
        shin.position.set(x, SY - 0.18, SZ + 0.50);
        shin.rotation.x = -0.22;
        aplicarSombras(shin); grupo.add(shin);
    });

    // Linha neon nos ombros
    tuboNeon(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, SY + 0.35, SZ - 0.10),
        new THREE.Vector3( 0.00, SY + 0.39, SZ - 0.12),
        new THREE.Vector3( 0.14, SY + 0.35, SZ - 0.10),
    ]), 0.011, matNeon, grupo);

    // Linha neon no capacete (arco frontal)
    tuboNeon(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.13, SY + 0.57, SZ - 0.25),
        new THREE.Vector3( 0.00, SY + 0.66, SZ - 0.27),
        new THREE.Vector3( 0.13, SY + 0.57, SZ - 0.25),
    ]), 0.009, matNeon, grupo);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// TubeGeometry ao longo de uma curva 3D com material emissivo.
function tuboNeon(curve, radius, mat, parent) {
    var geo  = new THREE.TubeGeometry(curve, 24, radius, 8, false);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
}

function perfilDoTema(tema) {
    if (tema === 'space')   return { emissivCorpo: 0.9, emissivAros: 1.2, luz: { intensidade: 0.6, distancia: 4, decay: 2 } };
    if (tema === 'deserto') return { emissivCorpo: 0.5, emissivAros: 0.7, luz: null };
    if (tema === 'jungle')  return { emissivCorpo: 0.7, emissivAros: 1.0, luz: { intensidade: 0.4, distancia: 3, decay: 2 } };
    return { emissivCorpo: 0.7, emissivAros: 0.9, luz: null };
}

function aplicarSombras(mesh) {
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
}
