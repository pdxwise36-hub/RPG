// One-off dev script: renders pixel-art battle sprites (hero + monsters) to
// transparent PNGs. Pure Node, no image library — see png-lib.js.
const fs = require('fs');
const path = require('path');
const { encodePNG } = require('./png-lib');

function makeGrid(w, h) {
  return Array.from({ length: h }, () => Array(w).fill('.'));
}

function fillRect(grid, x, y, w, h, ch) {
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) {
      if (grid[r] && grid[r][c] !== undefined) grid[r][c] = ch;
    }
  }
}

function setPx(grid, x, y, ch) {
  if (grid[y] && grid[y][x] !== undefined) grid[y][x] = ch;
}

// Recolors fillChar cells that touch a transparent neighbor into rimChar,
// giving flat blob shapes (slime, wolf, etc.) a readable silhouette edge.
function addRim(grid, fillChar, rimChar) {
  const h = grid.length, w = grid[0].length;
  const edges = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] !== fillChar) continue;
      const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      const touchesBg = neighbors.some(([nx, ny]) => {
        const cell = grid[ny] === undefined ? '.' : (grid[ny][nx] === undefined ? '.' : grid[ny][nx]);
        return cell === '.';
      });
      if (touchesBg) edges.push([x, y]);
    }
  }
  edges.forEach(([x, y]) => { grid[y][x] = rimChar; });
}

function rasterize(grid, palette, scale) {
  const gh = grid.length, gw = grid[0].length;
  const w = gw * scale, h = gh * scale;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const gy = Math.min(gh - 1, Math.floor(y / scale));
    for (let x = 0; x < w; x++) {
      const gx = Math.min(gw - 1, Math.floor(x / scale));
      const color = palette[grid[gy][gx]] || [0, 0, 0, 0];
      const idx = (y * w + x) * 4;
      rgba[idx] = color[0];
      rgba[idx + 1] = color[1];
      rgba[idx + 2] = color[2];
      rgba[idx + 3] = color[3];
    }
  }
  return encodePNG(w, h, rgba);
}

const SCALE = 7;

// ---------- Hero (Kael) — 16x20, facing forward, sword at right hand ----------
function buildHero() {
  const g = makeGrid(16, 20);
  fillRect(g, 5, 2, 6, 5, 'f');   // head (skin)
  fillRect(g, 5, 2, 6, 2, 'h');   // hair cap
  setPx(g, 6, 5, 'o'); setPx(g, 9, 5, 'o'); // eyes
  fillRect(g, 7, 7, 2, 1, 'f');   // neck
  fillRect(g, 4, 8, 8, 6, 'b');   // tunic
  fillRect(g, 4, 12, 8, 1, 'g');  // belt
  fillRect(g, 2, 8, 2, 5, 'b');   // left arm (sleeve)
  fillRect(g, 2, 13, 2, 1, 'f');  // left hand
  fillRect(g, 12, 8, 2, 5, 'b');  // right arm (sleeve)
  fillRect(g, 12, 13, 2, 1, 'f'); // right hand
  fillRect(g, 14, 3, 1, 10, 's'); // sword blade
  fillRect(g, 13, 13, 3, 1, 'g'); // crossguard
  fillRect(g, 14, 14, 1, 2, 'g'); // hilt
  fillRect(g, 4, 14, 3, 4, 'p');  // left leg
  fillRect(g, 9, 14, 3, 4, 'p');  // right leg
  fillRect(g, 4, 18, 3, 2, 'o');  // left boot
  fillRect(g, 9, 18, 3, 2, 'o');  // right boot
  const palette = {
    'h': [107, 68, 35, 255],
    'f': [240, 192, 144, 255],
    'o': [36, 26, 18, 255],
    'b': [47, 95, 168, 255],
    'g': [212, 168, 64, 255],
    'p': [74, 59, 42, 255],
    's': [216, 216, 224, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Slime — 16x14, teardrop blob ----------
function buildSlime() {
  const g = makeGrid(16, 14);
  const rows = {
    2: [6, 9], 3: [5, 10], 4: [4, 11], 5: [3, 12], 6: [3, 12],
    7: [2, 13], 8: [2, 13], 9: [2, 13], 10: [2, 13], 11: [3, 12], 12: [4, 11],
  };
  Object.entries(rows).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'm'));
  fillRect(g, 4, 4, 2, 2, 'l'); // highlight
  setPx(g, 6, 7, 'o'); setPx(g, 11, 7, 'o'); // eyes
  addRim(g, 'm', 'd');
  const palette = {
    'm': [63, 174, 74, 255],
    'l': [143, 224, 143, 255],
    'o': [22, 50, 26, 255],
    'd': [34, 110, 46, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Goblin — 16x18 ----------
function buildGoblin() {
  const g = makeGrid(16, 18);
  fillRect(g, 5, 1, 6, 5, 'k');   // head
  setPx(g, 4, 2, 'k'); setPx(g, 11, 2, 'k'); // ear tips
  setPx(g, 6, 4, 'r'); setPx(g, 9, 4, 'r');  // eyes
  fillRect(g, 5, 6, 6, 1, 'k');   // neck
  fillRect(g, 5, 7, 6, 4, 'v');   // vest
  fillRect(g, 5, 11, 6, 1, 'r');  // loincloth
  fillRect(g, 3, 7, 2, 4, 'k');   // left arm
  fillRect(g, 11, 7, 2, 4, 'k');  // right arm
  fillRect(g, 12, 4, 3, 2, 'w');  // club head
  fillRect(g, 13, 6, 1, 5, 'w');  // club handle
  fillRect(g, 5, 12, 3, 4, 'k');  // left leg
  fillRect(g, 8, 12, 3, 4, 'k');  // right leg
  fillRect(g, 5, 16, 3, 2, 'o');  // left foot
  fillRect(g, 8, 16, 3, 2, 'o');  // right foot
  addRim(g, 'k', 'd');
  const palette = {
    'k': [90, 138, 58, 255],
    'd': [53, 85, 31, 255],
    'v': [107, 74, 42, 255],
    'r': [201, 48, 48, 255],
    'w': [138, 106, 58, 255],
    'o': [26, 26, 26, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Wolf — 20x14, side profile facing left ----------
function buildWolf() {
  const g = makeGrid(20, 14);
  fillRect(g, 0, 3, 6, 6, 'w');   // head
  fillRect(g, 2, 1, 2, 2, 'w');   // ear
  fillRect(g, 5, 5, 11, 5, 'w');  // body
  fillRect(g, 16, 3, 4, 4, 'w');  // tail
  setPx(g, 2, 5, 'r');            // eye
  fillRect(g, 3, 10, 2, 3, 'w');  // front-left leg
  fillRect(g, 7, 10, 2, 3, 'w');  // front-right leg
  fillRect(g, 11, 10, 2, 3, 'w'); // back-left leg
  fillRect(g, 14, 10, 2, 3, 'w'); // back-right leg
  addRim(g, 'w', 'd');
  const palette = {
    'w': [107, 107, 117, 255],
    'd': [63, 63, 71, 255],
    'r': [201, 48, 48, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Dark Knight (boss) — 18x22 ----------
function buildDarkKnight() {
  const g = makeGrid(18, 22);
  fillRect(g, 5, 1, 8, 6, 'a');   // helmet
  setPx(g, 4, 1, 'a'); setPx(g, 4, 0, 'a'); // left horn
  setPx(g, 13, 1, 'a'); setPx(g, 13, 0, 'a'); // right horn
  setPx(g, 7, 4, 'r'); setPx(g, 10, 4, 'r'); // visor glow
  fillRect(g, 2, 7, 3, 3, 'a');   // left pauldron
  fillRect(g, 13, 7, 3, 3, 'a');  // right pauldron
  fillRect(g, 5, 7, 8, 8, 'a');   // chestplate
  setPx(g, 8, 10, 'r'); setPx(g, 9, 10, 'r'); // chest emblem
  fillRect(g, 2, 10, 3, 5, 'a');  // left arm
  fillRect(g, 13, 10, 3, 5, 'a'); // right arm
  fillRect(g, 16, 3, 1, 12, 's'); // sword blade
  fillRect(g, 15, 14, 3, 1, 'g'); // crossguard
  fillRect(g, 16, 15, 1, 2, 'g'); // hilt
  fillRect(g, 5, 15, 4, 5, 'a');  // left leg
  fillRect(g, 9, 15, 4, 5, 'a');  // right leg
  fillRect(g, 5, 20, 4, 2, 'o');  // left boot
  fillRect(g, 9, 20, 4, 2, 'o');  // right boot
  addRim(g, 'a', 'd');
  const palette = {
    'a': [58, 58, 68, 255],
    'd': [31, 31, 38, 255],
    'r': [224, 48, 63, 255],
    's': [216, 216, 224, 255],
    'g': [176, 138, 62, 255],
    'o': [15, 15, 18, 255],
  };
  return rasterize(g, palette, SCALE);
}

const outDir = path.join(__dirname, '..', 'icons', 'sprites');
fs.mkdirSync(outDir, { recursive: true });

const sprites = {
  'hero.png': buildHero,
  'slime.png': buildSlime,
  'goblin.png': buildGoblin,
  'wolf.png': buildWolf,
  'darkknight.png': buildDarkKnight,
};

for (const [filename, build] of Object.entries(sprites)) {
  const png = build();
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`wrote ${filename} (${png.length} bytes)`);
}
