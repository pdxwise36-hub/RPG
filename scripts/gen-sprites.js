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

// ---------- Dark Knight (boss) — 26x32, larger and more detailed ----------
function buildDarkKnight() {
  const g = makeGrid(26, 32);
  // flowing cape, drawn first so armor sits in front of it
  fillRect(g, 1, 9, 4, 19, 'c');
  fillRect(g, 21, 9, 4, 19, 'c');
  addRim(g, 'c', 'd');

  fillRect(g, 8, 1, 10, 8, 'a');  // helmet (taller, no visible neck gap)
  setPx(g, 12, 0, 'a'); setPx(g, 13, 0, 'a'); // small crest spike
  fillRect(g, 9, 2, 3, 2, 'a2');  // helmet highlight
  fillRect(g, 10, 5, 6, 1, 'r');  // horizontal visor slit
  fillRect(g, 12, 6, 2, 2, 'r');  // nose-guard glow

  fillRect(g, 5, 9, 4, 5, 'a');   // left pauldron
  fillRect(g, 18, 9, 4, 5, 'a');  // right pauldron
  fillRect(g, 9, 9, 9, 11, 'a');  // chestplate
  fillRect(g, 12, 10, 3, 3, 'a2'); // chest highlight
  fillRect(g, 12, 14, 2, 2, 'r');  // chest emblem gem
  setPx(g, 9, 17, 'd'); setPx(g, 12, 17, 'd'); setPx(g, 15, 17, 'd'); setPx(g, 17, 17, 'd'); // plate seams

  fillRect(g, 5, 14, 4, 10, 'a');  // left arm
  fillRect(g, 18, 14, 4, 10, 'a'); // right arm

  fillRect(g, 22, 3, 3, 18, 's');  // sword blade
  fillRect(g, 23, 3, 1, 17, 'gr'); // blade groove shine
  fillRect(g, 20, 21, 6, 1, 'g');  // crossguard
  fillRect(g, 22, 22, 2, 4, 'g');  // hilt

  fillRect(g, 9, 25, 4, 6, 'a');   // left leg
  fillRect(g, 14, 25, 4, 6, 'a');  // right leg
  fillRect(g, 9, 31, 4, 1, 'o');   // left boot
  fillRect(g, 14, 31, 4, 1, 'o');  // right boot
  addRim(g, 'a', 'd');
  const palette = {
    'a': [58, 58, 68, 255],
    'a2': [92, 92, 106, 255],
    'd': [27, 27, 33, 255],
    'r': [224, 48, 63, 255],
    's': [216, 216, 224, 255],
    'gr': [244, 244, 250, 255],
    'g': [176, 138, 62, 255],
    'o': [15, 15, 18, 255],
    'c': [70, 15, 25, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Bat — 16x14, small flier ----------
function buildBat() {
  const g = makeGrid(16, 14);
  const leftWing = { 4: [4, 5], 5: [2, 5], 6: [0, 5], 7: [1, 5], 8: [3, 5] };
  const rightWing = { 4: [10, 11], 5: [10, 13], 6: [10, 15], 7: [10, 14], 8: [10, 12] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  Object.entries(rightWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  fillRect(g, 6, 4, 4, 5, 'b'); // body
  setPx(g, 6, 3, 'b'); setPx(g, 9, 3, 'b'); // ears
  setPx(g, 6, 9, 'b'); setPx(g, 9, 9, 'b'); // feet
  setPx(g, 7, 6, 'r'); setPx(g, 8, 6, 'r'); // eyes
  addRim(g, 'b', 'd');
  const palette = {
    'b': [58, 38, 74, 255],
    'd': [31, 20, 42, 255],
    'r': [201, 48, 48, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Specter — 16x18, hazy floating robe ----------
function buildSpecter() {
  const g = makeGrid(16, 18);
  fillRect(g, 6, 2, 4, 5, 'g');   // hood/head
  setPx(g, 7, 4, 'e'); setPx(g, 8, 4, 'e'); // glowing eyes
  fillRect(g, 4, 7, 8, 8, 'g');  // robe body
  fillRect(g, 2, 8, 2, 5, 'g');  // left sleeve
  fillRect(g, 12, 8, 2, 5, 'g'); // right sleeve
  [4, 5, 7, 8, 10, 11].forEach((x) => setPx(g, x, 15, 'g')); // tattered hem
  const palette = {
    'g': [150, 205, 215, 175],
    'e': [230, 255, 255, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Lich (final boss) — 26x30, larger and more detailed ----------
function buildLich() {
  const g = makeGrid(26, 30);
  fillRect(g, 9, 1, 8, 7, 'k');    // skull
  setPx(g, 11, 3, 'e'); setPx(g, 14, 3, 'e'); // eye glow
  fillRect(g, 11, 6, 4, 1, 'j');   // jaw shadow

  fillRect(g, 6, 7, 14, 4, 'r');   // hood/collar
  fillRect(g, 8, 8, 10, 1, 'r2');  // collar highlight

  fillRect(g, 8, 10, 10, 14, 'r'); // robe body
  fillRect(g, 12, 12, 2, 9, 'r2'); // fabric fold shine
  fillRect(g, 12, 13, 2, 2, 'e');  // amulet glow

  fillRect(g, 4, 11, 4, 9, 'r');   // left sleeve
  fillRect(g, 18, 11, 4, 9, 'r');  // right sleeve
  fillRect(g, 4, 19, 3, 2, 'k');   // left bone hand
  fillRect(g, 19, 19, 3, 2, 'k');  // right bone hand

  [8, 9, 11, 12, 14, 15, 17].forEach((x) => setPx(g, x, 25, 'r')); // tattered hem
  [9, 12, 15].forEach((x) => setPx(g, x, 26, 'r')); // longer ragged tips

  fillRect(g, 23, 3, 2, 24, 'w');  // staff shaft
  fillRect(g, 20, 0, 5, 3, 'o');   // orb cage
  setPx(g, 19, 1, 'e'); setPx(g, 25, 1, 'e'); // orb glow ring
  addRim(g, 'r', 'd');
  const palette = {
    'k': [225, 220, 200, 255],
    'e': [80, 230, 120, 255],
    'j': [40, 35, 30, 255],
    'r': [58, 34, 84, 255],
    'r2': [92, 58, 130, 255],
    'd': [24, 14, 36, 255],
    'w': [107, 74, 42, 255],
    'o': [178, 88, 224, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Frost Golem — 16x18, blocky ice construct ----------
function buildFrostGolem() {
  const g = makeGrid(16, 18);
  fillRect(g, 5, 1, 6, 5, 'i');  // head
  setPx(g, 6, 3, 'g'); setPx(g, 9, 3, 'g'); // glow eyes
  fillRect(g, 4, 6, 8, 8, 'i');  // torso
  setPx(g, 7, 9, 'g'); setPx(g, 8, 9, 'g'); // core glow
  fillRect(g, 2, 7, 2, 5, 'i');  // left arm
  fillRect(g, 12, 7, 2, 5, 'i'); // right arm
  fillRect(g, 5, 14, 3, 4, 'i'); // left leg
  fillRect(g, 8, 14, 3, 4, 'i'); // right leg
  addRim(g, 'i', 'd');
  const palette = {
    'i': [176, 224, 240, 255],
    'd': [110, 170, 200, 255],
    'g': [120, 220, 255, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Ice Sprite — 14x14, tiny flying wisp ----------
function buildIceSprite() {
  const g = makeGrid(14, 14);
  const leftWing = { 4: [3, 4], 5: [1, 4], 6: [0, 4], 7: [1, 4], 8: [3, 4] };
  const rightWing = { 4: [9, 10], 5: [9, 12], 6: [9, 13], 7: [9, 12], 8: [9, 10] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  Object.entries(rightWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  fillRect(g, 5, 5, 4, 5, 'b'); // body
  setPx(g, 6, 7, 'e'); setPx(g, 7, 7, 'e'); // eyes
  setPx(g, 8, 4, 's'); // sparkle
  const palette = {
    'b': [210, 240, 250, 255],
    'w': [180, 230, 250, 150],
    'e': [40, 60, 90, 255],
    's': [255, 255, 255, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Glacial Titan (boss) — 26x34, larger and more detailed ----------
function buildGlacialTitan() {
  const g = makeGrid(26, 34);
  fillRect(g, 9, 1, 8, 7, 'i');   // head
  setPx(g, 9, 0, 'i'); setPx(g, 12, 0, 'i'); setPx(g, 13, 0, 'i'); setPx(g, 16, 0, 'i'); // icicle crown
  setPx(g, 11, 3, 'g'); setPx(g, 14, 3, 'g'); // glow eyes
  setPx(g, 10, 5, 'cr'); // face crack

  fillRect(g, 4, 8, 5, 5, 'i');   // left shoulder
  fillRect(g, 17, 8, 5, 5, 'i');  // right shoulder
  fillRect(g, 8, 8, 10, 13, 'i'); // torso
  fillRect(g, 11, 13, 4, 2, 'g'); // core glow
  setPx(g, 10, 12, 'i2'); setPx(g, 15, 12, 'i2'); setPx(g, 10, 16, 'i2'); setPx(g, 15, 16, 'i2'); // glow halo
  setPx(g, 9, 10, 'cr'); setPx(g, 16, 17, 'cr'); setPx(g, 12, 18, 'cr'); // torso cracks

  fillRect(g, 2, 11, 4, 10, 'i');   // left arm
  fillRect(g, 20, 11, 4, 10, 'i');  // right arm (fist)
  setPx(g, 24, 10, 'i'); setPx(g, 25, 11, 'i'); setPx(g, 24, 12, 'i'); // icicle spikes, right fist
  setPx(g, 1, 10, 'i'); setPx(g, 0, 11, 'i'); setPx(g, 1, 12, 'i');    // icicle spikes, left fist

  fillRect(g, 7, 22, 4, 9, 'i');  // left leg
  fillRect(g, 15, 22, 4, 9, 'i'); // right leg
  fillRect(g, 7, 31, 4, 3, 'd');  // left foot
  fillRect(g, 15, 31, 4, 3, 'd'); // right foot
  addRim(g, 'i', 'd');
  const palette = {
    'i': [190, 225, 240, 255],
    'i2': [220, 240, 250, 255],
    'd': [110, 165, 195, 255],
    'g': [140, 230, 255, 255],
    'cr': [90, 150, 180, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Wyrmling — 16x14, small dragon, side profile ----------
function buildWyrmling() {
  const g = makeGrid(16, 14);
  fillRect(g, 0, 3, 6, 6, 'b');  // head
  fillRect(g, 5, 5, 9, 5, 'b');  // body
  setPx(g, 3, 2, 'h');           // horn
  setPx(g, 2, 5, 'e');           // eye
  const leftWing = { 1: [7, 8], 2: [6, 9], 3: [6, 9] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  fillRect(g, 14, 6, 2, 3, 'b'); // tail
  fillRect(g, 3, 10, 2, 3, 'b'); // front-left leg
  fillRect(g, 7, 10, 2, 3, 'b'); // front-right leg
  fillRect(g, 11, 10, 2, 3, 'b'); // back-left leg
  fillRect(g, 14, 10, 2, 3, 'b'); // back-right leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [180, 74, 54, 255],
    'd': [90, 35, 28, 255],
    'w': [130, 50, 38, 255],
    'h': [212, 168, 64, 255],
    'e': [230, 200, 60, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Drake — 18x16, bigger cousin of the Wyrmling ----------
function buildDrake() {
  const g = makeGrid(18, 16);
  fillRect(g, 0, 3, 7, 7, 'b');  // head
  fillRect(g, 6, 5, 10, 6, 'b'); // body
  setPx(g, 3, 2, 'h');           // horn
  setPx(g, 2, 6, 'e');           // eye
  const leftWing = { 1: [8, 10], 2: [7, 12], 3: [7, 12] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  setPx(g, 8, 4, 'h'); setPx(g, 11, 4, 'h'); setPx(g, 14, 4, 'h'); // back spikes
  fillRect(g, 16, 7, 2, 3, 'b'); // tail
  fillRect(g, 4, 11, 2, 4, 'b'); // front-left leg
  fillRect(g, 8, 11, 2, 4, 'b'); // front-right leg
  fillRect(g, 12, 11, 2, 4, 'b'); // back-left leg
  fillRect(g, 15, 11, 2, 4, 'b'); // back-right leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [110, 60, 140, 255],
    'd': [55, 28, 68, 255],
    'w': [70, 35, 90, 255],
    'h': [212, 168, 64, 255],
    'e': [230, 110, 40, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Ancient Dragon (final boss) — 32x28, wings spread, front-facing ----------
function buildAncientDragon() {
  const g = makeGrid(32, 28);
  fillRect(g, 13, 1, 7, 7, 'b');   // head
  setPx(g, 11, 0, 'h'); setPx(g, 12, 1, 'h'); // left horn
  setPx(g, 20, 0, 'h'); setPx(g, 19, 1, 'h'); // right horn
  setPx(g, 14, 3, 'e'); setPx(g, 18, 3, 'e'); // eyes
  fillRect(g, 14, 7, 5, 1, 'j');   // jaw shadow

  fillRect(g, 14, 8, 5, 3, 'b');   // neck
  const leftWing = { 6: [3, 11], 7: [0, 12], 8: [0, 12], 9: [1, 12], 10: [3, 11] };
  const rightWing = { 6: [20, 28], 7: [19, 31], 8: [19, 31], 9: [19, 30], 10: [20, 28] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  Object.entries(rightWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  setPx(g, 6, 8, 'b'); setPx(g, 25, 8, 'b'); // wing vein accents

  fillRect(g, 11, 11, 10, 9, 'b'); // body
  fillRect(g, 15, 14, 2, 2, 'e');  // power core glow
  setPx(g, 12, 12, 'd'); setPx(g, 19, 13, 'd'); setPx(g, 13, 17, 'd'); setPx(g, 18, 18, 'd'); // scale texture

  fillRect(g, 7, 13, 4, 7, 'b');   // left arm
  fillRect(g, 21, 13, 4, 7, 'b');  // right arm
  setPx(g, 7, 20, 'h'); setPx(g, 6, 21, 'h');   // left claws
  setPx(g, 24, 20, 'h'); setPx(g, 25, 21, 'h'); // right claws

  fillRect(g, 12, 20, 4, 7, 'b');  // left leg
  fillRect(g, 16, 20, 4, 7, 'b');  // right leg
  fillRect(g, 25, 21, 5, 2, 'b');  // tail
  fillRect(g, 28, 23, 3, 2, 'b');  // tail curl
  setPx(g, 30, 22, 'h');           // tail spade tip
  addRim(g, 'b', 'd');
  const palette = {
    'b': [140, 20, 20, 255],
    'd': [60, 8, 8, 255],
    'w': [90, 15, 15, 255],
    'h': [212, 168, 64, 255],
    'e': [255, 140, 40, 255],
    'j': [40, 10, 10, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Treasure Chest — 16x14, open with gold spilling out ----------
function buildChest() {
  const g = makeGrid(16, 14);
  fillRect(g, 2, 3, 12, 3, 'w2'); // open lid (tilted back)
  fillRect(g, 1, 7, 14, 6, 'w');  // base
  fillRect(g, 1, 7, 14, 1, 'g');  // gold trim on rim
  setPx(g, 7, 7, 'g'); setPx(g, 8, 7, 'g'); // lock/clasp
  setPx(g, 3, 6, 'g'); setPx(g, 5, 5, 'g'); setPx(g, 9, 5, 'g'); setPx(g, 11, 6, 'g'); setPx(g, 7, 4, 'g'); // coin sparkle
  addRim(g, 'w', 'd');
  const palette = {
    'w': [107, 74, 42, 255],
    'w2': [138, 98, 58, 255],
    'd': [70, 48, 26, 255],
    'g': [212, 168, 64, 255],
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
  'bat.png': buildBat,
  'specter.png': buildSpecter,
  'lich.png': buildLich,
  'frostgolem.png': buildFrostGolem,
  'icesprite.png': buildIceSprite,
  'glacialtitan.png': buildGlacialTitan,
  'wyrmling.png': buildWyrmling,
  'drake.png': buildDrake,
  'ancientdragon.png': buildAncientDragon,
  'chest.png': buildChest,
};

for (const [filename, build] of Object.entries(sprites)) {
  const png = build();
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`wrote ${filename} (${png.length} bytes)`);
}
