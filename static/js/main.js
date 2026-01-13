import jscad from "@jscad/modeling";
import stlSerializer from "@jscad/stl-serializer";

const { cuboid } = jscad.primitives;
const { subtract, union } = jscad.booleans;



// ==========================================
// CONFIGURACIÓN
// ==========================================

const CONFIG = {
    POSTIT_WIDTH: 77,
    POSTIT_PADDING: 1,
    HOLE_BASE: 5,
    HOLE_GUTTER: 3,
    NUM_HOLES: 8,
    PIECE_HEIGHT: 2,
    WALL_HEIGHT: 1,
    SEED: getSeedFromUrl()
};

// Tamaño de la rejilla y márgenes
const GRID_SIZE_MM = CONFIG.HOLE_BASE + (CONFIG.NUM_HOLES - 1) * (CONFIG.HOLE_BASE + CONFIG.HOLE_GUTTER);
const MARGIN = (CONFIG.POSTIT_WIDTH - GRID_SIZE_MM) / 2;



// ==========================================
// UTILS
// ==========================================

// Función para obtener la semilla de la URL
function getSeedFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("SEED");

    if (seedParam !== null) {
        const seedValue = parseInt(seedParam, 10);
        if (!isNaN(seedValue) && seedValue >= 0) {
            return seedValue;
        }
    }
    return 1971; // Valor por defecto
};

// Descarga un Blob como archivo en el navegador.
function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// Generador de números aleatorios con semilla (Mulberry32)
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}



// ==========================================
// LÓGICA DE CARDANO
// ==========================================

class CardanoGrid {

    //El objeto inicial parte de una semilla, un array de NUM_HOLES x NUM_HOLES (rejilla final) y otro de NUM_HOLES/2 x NUM_HOLES/2 (rotaciones)
    constructor(seed = CONFIG.SEED) {
        this.rng = mulberry32(seed);

        this.rotGridSize = CONFIG.NUM_HOLES / 2;
        this.rotationsGrid = [];

        this.holes = Array.from({ length: CONFIG.NUM_HOLES }, function () { return Array(CONFIG.NUM_HOLES).fill(0); });


        this._initRotations();
    }

    // Inicializa el cuadrante con valores de rotación aleatorios (0-3), 
    _initRotations() {
        for (let i = 0; i < this.rotGridSize; i++) {
            const row = [];
            for (let j = 0; j < this.rotGridSize; j++) {
                row.push(Math.floor(this.rng() * 4));
            }
            this.rotationsGrid.push(row);
        }
    }

    // Rota las coordenadas 90 grados en sentido horario dentro de la sub-rejilla
    rotate(x, y) {
        return [y, (CONFIG.NUM_HOLES / 2) - 1 - x];
    }

    // Calcula las posiciones finales de los agujeros basándose en las rotaciones
    generateCardanoGrid() {
        console.log("--- Generando Agujeros ---");

        for (let y = 0; y < this.rotGridSize; y++) {
            for (let x = 0; x < this.rotGridSize; x++) {
                const numRotations = this.rotationsGrid[x][y];

                console.log(`*** Casilla ${x}, ${y} | Rotaciones: ${numRotations}`);

                let [rx, ry] = [x, y];

                // 1. Simular rotaciones
                for (let r = 0; r < numRotations; r++) {
                    [rx, ry] = this.rotate(rx, ry);
                    console.log(`   Posición parcial: ${rx}, ${ry}`);
                }

                // 2. Transladar al cuadrante correcto
                if (numRotations === 3 || numRotations === 2) {
                    rx += CONFIG.NUM_HOLES / 2;
                }
                if (numRotations === 1 || numRotations === 2) {
                    ry += CONFIG.NUM_HOLES / 2;
                }

                console.log(`   Posición final: ${rx}, ${ry}`);
                this.holes[rx][ry] = 1;
            }
        }
        return this.holes;
    }
}



// ==========================================
// GEOMETRÍA CON JSCAD 
// ==========================================

// Genera los agujeros en la rejilla, a partir de un array
function createHoles(holesMask) {

    const cutters = [];

    for (let y = 0; y < CONFIG.NUM_HOLES; y++) {
        for (let x = 0; x < CONFIG.NUM_HOLES; x++) {

            if (holesMask && holesMask[x][y] !== 1) continue;

            const centerX = -CONFIG.POSTIT_WIDTH / 2 + MARGIN + CONFIG.HOLE_BASE / 2 + x * (CONFIG.HOLE_BASE + CONFIG.HOLE_GUTTER);
            const centerY = -CONFIG.POSTIT_WIDTH / 2 + MARGIN + CONFIG.HOLE_BASE / 2 + y * (CONFIG.HOLE_BASE + CONFIG.HOLE_GUTTER);

            let cutter = cuboid({
                size: [CONFIG.HOLE_BASE, CONFIG.HOLE_BASE, CONFIG.PIECE_HEIGHT * 5],
                center: [centerX, centerY, 0]
            });
            cutters.push(cutter);
        }
    }
    return cutters;
}

// Geometría final: la base menos los agujeros
function buildGeometry(holesMask) {

    // Base inicial 
    const base = cuboid({
        size: [CONFIG.POSTIT_WIDTH + CONFIG.POSTIT_PADDING * 2,
        CONFIG.POSTIT_WIDTH + CONFIG.POSTIT_PADDING * 2, CONFIG.PIECE_HEIGHT]
    });

    // Cutters de los agujeros, unidos para evitar vértices abiertos
    const holeCutters = createHoles(holesMask);
    const allCutters = union(holeCutters);

    // Cutter del marco 
    const frameCutter = cuboid({
        size: [CONFIG.POSTIT_WIDTH, CONFIG.POSTIT_WIDTH, CONFIG.PIECE_HEIGHT + 1],
        center: [0, 0, 1.5]
    });

    // Esto tiene que ser así o... ¡vértices abiertos!
    return subtract(subtract(base, allCutters), frameCutter);
}



// ==========================================
// FUNCIÓN PARA EL BOTÓN
// ==========================================

const generateButton = document.getElementById("btn");

generateButton.addEventListener("click", function () {

    const cardano = new CardanoGrid(CONFIG.SEED);
    cardano.generateCardanoGrid();

    const geometry = buildGeometry(cardano.holes);
    const raw = stlSerializer.serialize({ binary: true }, geometry);
    const blob = new Blob(raw, { type: "application/octet-stream" });

    downloadBlob(blob, `cardano_seed_${CONFIG.SEED}.stl`);
});