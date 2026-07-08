// One-off dev script: renders simple pixel-art app icons to PNG without any
// image library, since none is available in this environment.
const fs = require('fs');
const path = require('path');
const { encodePNG } = require('./png-lib');

// Simple pixel-art: a gold sword crossed over a shield, on a dark blue-purple
// background, drawn on a 16x16 grid then upscaled with nearest-neighbor.
function buildGrid() {
  const BG = '.';
  const SHIELD = 'S';
  const SHIELD_RIM = 's';
  const BLADE = 'B';
  const HILT = 'H';
  const g = Array.from({ length: 16 }, () => Array(16).fill(BG));

  // shield body (rounded-ish diamond ~ ellipse ish ~ rows 4-13, cols 3-12)
  const shieldRows = [
    [5, 10], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11],
    [4, 11], [5, 10], [5, 10], [6, 9], [7, 8],
  ];
  shieldRows.forEach((range, i) => {
    const row = 3 + i;
    for (let c = range[0]; c <= range[1]; c++) g[row][c] = SHIELD;
  });
  // shield rim (outline) - recolor edge cells
  for (let row = 3; row <= 13; row++) {
    for (let c = 0; c < 16; c++) {
      if (g[row][c] === SHIELD) {
        const leftEdge = g[row][c - 1] !== SHIELD;
        const rightEdge = g[row][c + 1] !== SHIELD;
        if (leftEdge || rightEdge) g[row][c] = SHIELD_RIM;
      }
    }
  }

  // sword: diagonal blade from top-left to bottom-right through center, with hilt
  const bladeCells = [
    [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 11],
  ];
  bladeCells.forEach(([r, c]) => { g[r][c] = BLADE; });
  // crossguard + hilt
  g[9][10] = HILT; g[10][12] = HILT; g[10][10] = HILT;
  g[11][13] = HILT; g[12][14] = HILT;

  return g;
}

const PALETTE = {
  '.': [26, 20, 46, 255],    // dark indigo background
  'S': [58, 46, 122, 255],   // shield body, muted violet
  's': [122, 98, 200, 255],  // shield rim, lighter violet
  'B': [226, 226, 235, 255], // blade, near-white steel
  'H': [212, 168, 64, 255],  // hilt/gold
};

function render(size) {
  const grid = buildGrid();
  const cell = size / 16;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const gy = Math.min(15, Math.floor(y / cell));
    for (let x = 0; x < size; x++) {
      const gx = Math.min(15, Math.floor(x / cell));
      const color = PALETTE[grid[gy][gx]];
      const idx = (y * size + x) * 4;
      rgba[idx] = color[0];
      rgba[idx + 1] = color[1];
      rgba[idx + 2] = color[2];
      rgba[idx + 3] = color[3];
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const png = render(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
