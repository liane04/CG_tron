export const mapas = [
    {
        id: 'tron',
        nome: 'TRON',
        descricao: 'Arena clássica de luz',
        corCSS: '#00ffff',
        corFundo: 0x000008,
        corGrid1: 0x00ffff,
        corGrid2: 0x004488,
        corChao: 0x000011,
        corParede: 0x00ffff,
        emissividadeParede: 1.2,
        opacidadeParede: 0.20,
        mostrarGrid: true,
        luzAmbiente: 0x222244,
    },
    {
        id: 'deserto',
        nome: 'DESERT',
        descricao: 'Arena nas areias do deserto',
        corCSS: '#c8a060',
        corFundo: 0x1a0f00,
        corGrid1: 0x8b6914,
        corGrid2: 0x3d2a00,
        corChao: 0x8b6914,
        corParede: 0xc8a060,
        emissividadeParede: 0.0,
        opacidadeParede: 1.0,
        mostrarGrid: false,
        luzAmbiente: 0x4a3010,
        texturas: {
            diffuse: './textures/textures_areia/sandy_gravel_diff_2k.jpg',
            normal:  './textures/textures_areia/sandy_gravel_nor_gl_2k.jpg',
            rough:   './textures/textures_areia/sandy_gravel_rough_2k.jpg',
        }
    }
];
