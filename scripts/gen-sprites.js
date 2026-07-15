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

// ---------- Armored boss template — 26x32, larger and more detailed.
// Reused (recolored) across zones for their "knight" archetype boss. ----------
function buildArmoredBossTemplate(palette) {
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
  return rasterize(g, palette, SCALE);
}

function buildDarkKnight() {
  return buildArmoredBossTemplate({
    'a': [58, 58, 68, 255],
    'a2': [92, 92, 106, 255],
    'd': [27, 27, 33, 255],
    'r': [224, 48, 63, 255],
    's': [216, 216, 224, 255],
    'gr': [244, 244, 250, 255],
    'g': [176, 138, 62, 255],
    'o': [15, 15, 18, 255],
    'c': [70, 15, 25, 255],
  });
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

// ---------- Robed caster boss template — 26x30, larger and more detailed.
// Reused (recolored) across zones for their "caster" archetype boss. ----------
function buildRobedBossTemplate(palette) {
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
  return rasterize(g, palette, SCALE);
}

function buildLich() {
  return buildRobedBossTemplate({
    'k': [225, 220, 200, 255],
    'e': [80, 230, 120, 255],
    'j': [40, 35, 30, 255],
    'r': [58, 34, 84, 255],
    'r2': [92, 58, 130, 255],
    'd': [24, 14, 36, 255],
    'w': [107, 74, 42, 255],
    'o': [178, 88, 224, 255],
  });
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

// ---------- Golem boss template — 26x34, larger and more detailed. Reused
// (recolored) across zones for their "golem/elemental" archetype boss. ----------
function buildGolemBossTemplate(palette) {
  const g = makeGrid(26, 34);
  fillRect(g, 9, 1, 8, 7, 'i');   // head
  setPx(g, 9, 0, 'i'); setPx(g, 12, 0, 'i'); setPx(g, 13, 0, 'i'); setPx(g, 16, 0, 'i'); // crest spikes
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
  setPx(g, 24, 10, 'i'); setPx(g, 25, 11, 'i'); setPx(g, 24, 12, 'i'); // spikes, right fist
  setPx(g, 1, 10, 'i'); setPx(g, 0, 11, 'i'); setPx(g, 1, 12, 'i');    // spikes, left fist

  fillRect(g, 7, 22, 4, 9, 'i');  // left leg
  fillRect(g, 15, 22, 4, 9, 'i'); // right leg
  fillRect(g, 7, 31, 4, 3, 'd');  // left foot
  fillRect(g, 15, 31, 4, 3, 'd'); // right foot
  addRim(g, 'i', 'd');
  return rasterize(g, palette, SCALE);
}

function buildGlacialTitan() {
  return buildGolemBossTemplate({
    'i': [190, 225, 240, 255],
    'i2': [220, 240, 250, 255],
    'd': [110, 165, 195, 255],
    'g': [140, 230, 255, 255],
    'cr': [90, 150, 180, 255],
  });
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

// ---------- Dragon boss template — 32x28, wings spread, front-facing.
// Reused (recolored) across zones for their "dragon" archetype boss. ----------
function buildDragonBossTemplate(palette) {
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
  return rasterize(g, palette, SCALE);
}

function buildAncientDragon() {
  return buildDragonBossTemplate({
    'b': [140, 20, 20, 255],
    'd': [60, 8, 8, 255],
    'w': [90, 15, 15, 255],
    'h': [212, 168, 64, 255],
    'e': [255, 140, 40, 255],
    'j': [40, 10, 10, 255],
  });
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

// ---------- Wolf Pup (pet) — 14x12, cute sitting companion ----------
function buildWolfPup() {
  const g = makeGrid(14, 12);
  fillRect(g, 1, 2, 7, 6, 'b');  // big head
  setPx(g, 2, 1, 'b'); setPx(g, 6, 1, 'b'); // ear tips
  setPx(g, 3, 5, 'e');            // eye
  setPx(g, 1, 6, 'l');            // muzzle highlight
  fillRect(g, 3, 5, 8, 6, 'b');   // body
  setPx(g, 11, 5, 'b'); setPx(g, 12, 4, 'b'); // curled tail
  fillRect(g, 3, 11, 2, 1, 'd');  // front leg
  fillRect(g, 8, 11, 2, 1, 'd');  // back leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [168, 120, 74, 255],
    'd': [110, 76, 46, 255],
    'e': [40, 30, 20, 255],
    'l': [224, 200, 170, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Hawk (pet) — 14x14, wings spread mid-perch ----------
function buildHawk() {
  // Compact flying-bird silhouette: wings swept up in a shallow V, short
  // body, small tail — no legs, so it doesn't read as a tiny person.
  const g = makeGrid(16, 10);
  fillRect(g, 6, 0, 3, 2, 'b');   // head
  setPx(g, 6, 1, 'e');            // eye
  setPx(g, 9, 1, 'y');            // beak
  const leftWing = { 1: [3, 4], 2: [1, 5] };
  const rightWing = { 1: [11, 12], 2: [10, 14] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  Object.entries(rightWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  fillRect(g, 6, 2, 4, 4, 'b');   // body
  fillRect(g, 6, 6, 4, 2, 'b');   // small tail
  addRim(g, 'b', 'd');
  const palette = {
    'b': [120, 80, 50, 255],
    'd': [76, 50, 30, 255],
    'y': [230, 180, 60, 255],
    'e': [40, 30, 20, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Salamander (pet) — 16x10, low quadruped with glowing spots ----------
function buildSalamander() {
  const g = makeGrid(16, 10);
  fillRect(g, 0, 2, 4, 5, 'b');   // head
  setPx(g, 1, 3, 'e');            // eye
  fillRect(g, 3, 3, 10, 4, 'b');  // body
  fillRect(g, 13, 4, 3, 2, 'b');  // tail
  setPx(g, 5, 3, 'f'); setPx(g, 8, 3, 'f'); setPx(g, 11, 3, 'f'); // glowing back spots
  fillRect(g, 2, 7, 2, 2, 'b'); fillRect(g, 6, 7, 2, 2, 'b'); // front/mid legs
  fillRect(g, 10, 7, 2, 2, 'b'); fillRect(g, 13, 7, 2, 2, 'b'); // back legs
  addRim(g, 'b', 'd');
  const palette = {
    'b': [200, 70, 40, 255],
    'd': [130, 40, 20, 255],
    'f': [255, 180, 60, 255],
    'e': [40, 20, 10, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Baby Golem (pet) — 14x16, small stone construct ----------
function buildBabyGolem() {
  const g = makeGrid(14, 16);
  fillRect(g, 4, 1, 6, 4, 'i');   // head
  setPx(g, 5, 2, 'g'); setPx(g, 8, 2, 'g'); // eyes
  fillRect(g, 3, 5, 8, 7, 'i');   // body
  setPx(g, 6, 8, 'g'); setPx(g, 7, 8, 'g'); // core glow
  fillRect(g, 1, 6, 2, 4, 'i');   // left arm
  fillRect(g, 11, 6, 2, 4, 'i');  // right arm
  fillRect(g, 4, 12, 3, 3, 'i');  // left leg
  fillRect(g, 7, 12, 3, 3, 'i');  // right leg
  addRim(g, 'i', 'd');
  const palette = {
    'i': [150, 140, 120, 255],
    'd': [96, 88, 72, 255],
    'g': [230, 180, 80, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Turtle (pet) — 14x10, low dome shell, head poking out ----------
function buildTurtle() {
  const g = makeGrid(14, 10);
  fillRect(g, 4, 1, 6, 1, 's');
  fillRect(g, 3, 2, 8, 1, 's');
  fillRect(g, 2, 3, 10, 3, 's');  // shell dome
  fillRect(g, 3, 6, 8, 1, 's');
  fillRect(g, 0, 4, 3, 3, 'h');   // head poking left
  setPx(g, 0, 5, 'e');
  fillRect(g, 3, 7, 2, 2, 'h');   // front leg
  fillRect(g, 9, 7, 2, 2, 'h');   // back leg
  setPx(g, 12, 6, 'h');           // tail nub
  addRim(g, 's', 'sd');
  const palette = {
    's': [70, 140, 60, 255],
    'sd': [40, 90, 40, 255],
    'h': [190, 160, 90, 255],
    'e': [30, 20, 10, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Fox (pet) — 16x12, pointy ears, bushy white-tipped tail ----------
function buildFox() {
  const g = makeGrid(16, 12);
  fillRect(g, 1, 2, 6, 5, 'b');   // head
  setPx(g, 1, 1, 'b'); setPx(g, 6, 1, 'b'); // pointy ear tips
  setPx(g, 3, 5, 'e');            // eye
  fillRect(g, 3, 5, 9, 5, 'b');   // body
  fillRect(g, 11, 3, 3, 4, 'b');  // bushy tail curled up
  setPx(g, 13, 2, 't');           // white tail tip
  fillRect(g, 3, 10, 2, 2, 'd');  // front leg
  fillRect(g, 8, 10, 2, 2, 'd');  // back leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [214, 110, 40, 255],
    'd': [140, 60, 20, 255],
    'e': [30, 20, 10, 255],
    't': [255, 255, 255, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Boar (pet) — 16x12, tusks and a bristly back ridge ----------
function buildBoar() {
  const g = makeGrid(16, 12);
  fillRect(g, 0, 3, 6, 5, 'b');   // head/snout
  setPx(g, 0, 6, 'w'); setPx(g, 1, 7, 'w'); // tusks
  setPx(g, 2, 4, 'e');            // eye
  fillRect(g, 5, 4, 9, 6, 'b');   // body
  setPx(g, 6, 3, 'br'); setPx(g, 8, 2, 'br'); setPx(g, 10, 3, 'br'); // bristle mane
  fillRect(g, 14, 6, 2, 2, 'b');  // tail
  fillRect(g, 2, 10, 2, 2, 'd');  // front leg
  fillRect(g, 11, 10, 2, 2, 'd'); // back leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [110, 90, 80, 255],
    'd': [70, 55, 50, 255],
    'e': [20, 15, 10, 255],
    'w': [255, 255, 240, 255],
    'br': [40, 30, 25, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Owl (pet) — 14x14, round head with big eye discs, perched ----------
function buildOwl() {
  const g = makeGrid(14, 14);
  fillRect(g, 3, 1, 8, 7, 'b');   // round head/upper body
  setPx(g, 3, 0, 'b'); setPx(g, 10, 0, 'b'); // ear tufts
  fillRect(g, 4, 3, 2, 2, 'w'); fillRect(g, 8, 3, 2, 2, 'w'); // eye discs
  setPx(g, 5, 4, 'e'); setPx(g, 9, 4, 'e'); // pupils
  setPx(g, 6, 6, 'y'); setPx(g, 7, 6, 'y'); // beak
  fillRect(g, 2, 7, 10, 5, 'b');  // body
  setPx(g, 4, 9, 'f'); setPx(g, 6, 10, 'f'); setPx(g, 9, 9, 'f'); // feather flecks
  fillRect(g, 4, 12, 2, 1, 'y');  // feet
  fillRect(g, 8, 12, 2, 1, 'y');
  addRim(g, 'b', 'd');
  const palette = {
    'b': [150, 110, 60, 255],
    'd': [100, 70, 35, 255],
    'w': [255, 255, 255, 255],
    'e': [20, 15, 10, 255],
    'y': [230, 180, 60, 255],
    'f': [110, 80, 40, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Panther (pet) — 20x12, sleek low quadruped, glowing eye ----------
function buildPanther() {
  const g = makeGrid(20, 12);
  fillRect(g, 0, 2, 6, 6, 'b');   // head
  fillRect(g, 2, 0, 2, 2, 'b');   // ear
  fillRect(g, 5, 4, 11, 5, 'b');  // sleek body
  fillRect(g, 16, 2, 4, 4, 'b');  // long tail
  setPx(g, 2, 4, 'e');            // glowing eye
  fillRect(g, 3, 9, 2, 3, 'b');   // front-left leg
  fillRect(g, 7, 9, 2, 3, 'b');   // front-right leg
  fillRect(g, 11, 9, 2, 3, 'b');  // back-left leg
  fillRect(g, 14, 9, 2, 3, 'b');  // back-right leg
  addRim(g, 'b', 'd');
  const palette = {
    'b': [35, 35, 42, 255],
    'd': [20, 20, 25, 255],
    'e': [80, 220, 90, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Dragonling (pet) — 16x14, friendly baby dragon, green/gold ----------
function buildDragonling() {
  const g = makeGrid(16, 14);
  fillRect(g, 0, 3, 6, 6, 'b');   // head
  fillRect(g, 5, 5, 9, 5, 'b');   // body
  setPx(g, 3, 2, 'h');            // horn
  setPx(g, 2, 5, 'e');            // eye
  const leftWing = { 1: [7, 8], 2: [6, 9], 3: [6, 9] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  fillRect(g, 14, 6, 2, 3, 'b');  // tail
  fillRect(g, 3, 10, 2, 3, 'b');  // front-left leg
  fillRect(g, 7, 10, 2, 3, 'b');  // front-right leg
  fillRect(g, 11, 10, 2, 3, 'b'); // back-left leg
  fillRect(g, 14, 10, 2, 3, 'b'); // back-right leg
  setPx(g, 7, 7, 'gem');          // chest gem — friendly companion marking
  addRim(g, 'b', 'd');
  const palette = {
    'b': [70, 160, 90, 255],
    'd': [35, 90, 50, 255],
    'w': [50, 120, 70, 255],
    'h': [212, 168, 64, 255],
    'e': [255, 210, 60, 255],
    'gem': [90, 200, 255, 255],
  };
  return rasterize(g, palette, SCALE);
}

// ---------- Generic enemy body-plan templates, reused (recolored) for the
// ten new zones' monsters instead of thirty bespoke pixel layouts — each
// zone still reads as visually distinct via its own palette + name + stats.
function buildQuadrupedTemplate(palette) {
  const g = makeGrid(20, 14);
  fillRect(g, 0, 3, 6, 6, 'b');
  fillRect(g, 2, 1, 2, 2, 'b');
  fillRect(g, 5, 5, 11, 5, 'b');
  fillRect(g, 16, 3, 4, 4, 'b');
  setPx(g, 2, 5, 'e');
  fillRect(g, 3, 10, 2, 3, 'b');
  fillRect(g, 7, 10, 2, 3, 'b');
  fillRect(g, 11, 10, 2, 3, 'b');
  fillRect(g, 14, 10, 2, 3, 'b');
  addRim(g, 'b', 'd');
  return rasterize(g, palette, SCALE);
}

function buildBipedTemplate(palette) {
  const g = makeGrid(16, 18);
  fillRect(g, 5, 1, 6, 5, 'k');
  setPx(g, 4, 2, 'k'); setPx(g, 11, 2, 'k');
  setPx(g, 6, 4, 'r'); setPx(g, 9, 4, 'r');
  fillRect(g, 5, 6, 6, 1, 'k');
  fillRect(g, 5, 7, 6, 4, 'v');
  fillRect(g, 5, 11, 6, 1, 'r');
  fillRect(g, 3, 7, 2, 4, 'k');
  fillRect(g, 11, 7, 2, 4, 'k');
  fillRect(g, 12, 4, 3, 2, 'w');
  fillRect(g, 13, 6, 1, 5, 'w');
  fillRect(g, 5, 12, 3, 4, 'k');
  fillRect(g, 8, 12, 3, 4, 'k');
  fillRect(g, 5, 16, 3, 2, 'o');
  fillRect(g, 8, 16, 3, 2, 'o');
  addRim(g, 'k', 'd');
  return rasterize(g, palette, SCALE);
}

function buildFlierTemplate(palette) {
  const g = makeGrid(16, 14);
  const leftWing = { 4: [4, 5], 5: [2, 5], 6: [0, 5], 7: [1, 5], 8: [3, 5] };
  const rightWing = { 4: [10, 11], 5: [10, 13], 6: [10, 15], 7: [10, 14], 8: [10, 12] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  Object.entries(rightWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'b'));
  fillRect(g, 6, 4, 4, 5, 'b');
  setPx(g, 6, 3, 'b'); setPx(g, 9, 3, 'b');
  setPx(g, 6, 9, 'b'); setPx(g, 9, 9, 'b');
  setPx(g, 7, 6, 'e'); setPx(g, 8, 6, 'e');
  addRim(g, 'b', 'd');
  return rasterize(g, palette, SCALE);
}

function buildBlobTemplate(palette) {
  const g = makeGrid(16, 14);
  const rows = {
    2: [6, 9], 3: [5, 10], 4: [4, 11], 5: [3, 12], 6: [3, 12],
    7: [2, 13], 8: [2, 13], 9: [2, 13], 10: [2, 13], 11: [3, 12], 12: [4, 11],
  };
  Object.entries(rows).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'm'));
  fillRect(g, 4, 4, 2, 2, 'l');
  setPx(g, 6, 7, 'o'); setPx(g, 11, 7, 'o');
  addRim(g, 'm', 'd');
  return rasterize(g, palette, SCALE);
}

function buildSerpentTemplate(palette) {
  const g = makeGrid(16, 14);
  fillRect(g, 0, 3, 6, 6, 'b');
  fillRect(g, 5, 5, 9, 5, 'b');
  setPx(g, 3, 2, 'h');
  setPx(g, 2, 5, 'e');
  const leftWing = { 1: [7, 8], 2: [6, 9], 3: [6, 9] };
  Object.entries(leftWing).forEach(([y, [x0, x1]]) => fillRect(g, x0, Number(y), x1 - x0 + 1, 1, 'w'));
  fillRect(g, 14, 6, 2, 3, 'b');
  fillRect(g, 3, 10, 2, 3, 'b');
  fillRect(g, 7, 10, 2, 3, 'b');
  fillRect(g, 11, 10, 2, 3, 'b');
  fillRect(g, 14, 10, 2, 3, 'b');
  addRim(g, 'b', 'd');
  return rasterize(g, palette, SCALE);
}

// ---------- Zone 5: The Sunken Ruins ----------
const buildMerfolkRaider = () => buildBipedTemplate({
  'k': [60, 140, 150, 255], 'd': [35, 90, 100, 255], 'v': [40, 80, 110, 255],
  'r': [200, 220, 60, 255], 'w': [180, 190, 200, 255], 'o': [20, 40, 50, 255],
});
const buildReefSerpent = () => buildSerpentTemplate({
  'b': [40, 150, 140, 255], 'd': [20, 90, 85, 255], 'w': [30, 110, 105, 255],
  'h': [210, 230, 80, 255], 'e': [255, 230, 90, 255],
});
const buildDrownedQueen = () => buildRobedBossTemplate({
  'k': [180, 220, 225, 255], 'e': [100, 230, 220, 255], 'j': [30, 50, 55, 255],
  'r': [20, 70, 80, 255], 'r2': [40, 110, 120, 255], 'd': [10, 35, 40, 255],
  'w': [70, 90, 95, 255], 'o': [80, 220, 210, 255],
});

// ---------- Zone 6: The Whispering Woods ----------
const buildThornling = () => buildBipedTemplate({
  'k': [90, 130, 60, 255], 'd': [50, 80, 30, 255], 'v': [100, 70, 40, 255],
  'r': [180, 60, 60, 255], 'w': [110, 80, 50, 255], 'o': [30, 25, 15, 255],
});
const buildWispMoth = () => buildFlierTemplate({
  'b': [200, 230, 190, 255], 'd': [150, 190, 150, 255], 'e': [120, 200, 120, 255],
});
const buildElderEnt = () => buildGolemBossTemplate({
  'i': [90, 110, 60, 255], 'i2': [130, 150, 90, 255], 'd': [55, 70, 35, 255],
  'g': [180, 220, 100, 255], 'cr': [60, 45, 25, 255],
});

// ---------- Zone 7: The Sandscar Wastes ----------
const buildDustJackal = () => buildQuadrupedTemplate({
  'b': [200, 170, 110, 255], 'd': [150, 120, 70, 255], 'e': [220, 90, 40, 255],
});
const buildSandViper = () => buildSerpentTemplate({
  'b': [210, 150, 80, 255], 'd': [150, 100, 50, 255], 'w': [180, 120, 60, 255],
  'h': [255, 220, 120, 255], 'e': [255, 120, 40, 255],
});
const buildSandReaver = () => buildArmoredBossTemplate({
  'a': [180, 150, 90, 255], 'a2': [220, 190, 130, 255], 'd': [110, 85, 45, 255],
  'r': [220, 70, 40, 255], 's': [230, 220, 180, 255], 'gr': [250, 245, 220, 255],
  'g': [140, 100, 50, 255], 'o': [50, 35, 20, 255], 'c': [120, 70, 30, 255],
});

// ---------- Zone 8: The Volcanic Depths ----------
const buildCinderImp = () => buildBipedTemplate({
  'k': [200, 60, 40, 255], 'd': [120, 30, 20, 255], 'v': [40, 30, 30, 255],
  'r': [255, 200, 60, 255], 'w': [80, 60, 50, 255], 'o': [20, 10, 10, 255],
});
const buildMagmaHound = () => buildQuadrupedTemplate({
  'b': [230, 90, 30, 255], 'd': [140, 40, 15, 255], 'e': [255, 230, 80, 255],
});
const buildMoltenWyrm = () => buildDragonBossTemplate({
  'b': [220, 80, 20, 255], 'd': [130, 40, 10, 255], 'w': [160, 50, 15, 255],
  'h': [255, 220, 80, 255], 'e': [255, 255, 150, 255], 'j': [80, 25, 8, 255],
});

// ---------- Zone 9: The Shattered Peaks ----------
const buildStormHarpy = () => buildFlierTemplate({
  'b': [150, 165, 180, 255], 'd': [100, 115, 130, 255], 'e': [230, 240, 255, 255],
});
const buildRockWyvern = () => buildSerpentTemplate({
  'b': [110, 100, 95, 255], 'd': [70, 62, 58, 255], 'w': [90, 82, 78, 255],
  'h': [200, 200, 210, 255], 'e': [255, 220, 100, 255],
});
const buildStormguardTitan = () => buildArmoredBossTemplate({
  'a': [130, 150, 170, 255], 'a2': [170, 190, 210, 255], 'd': [80, 95, 110, 255],
  'r': [90, 200, 255, 255], 's': [220, 230, 240, 255], 'gr': [245, 250, 255, 255],
  'g': [150, 160, 175, 255], 'o': [40, 50, 60, 255], 'c': [60, 80, 110, 255],
});

// ---------- Zone 10: The Blightmarsh ----------
const buildBogLeech = () => buildBlobTemplate({
  'm': [90, 110, 40, 255], 'l': [140, 160, 70, 255], 'o': [40, 20, 50, 255], 'd': [55, 70, 25, 255],
});
const buildPlagueRat = () => buildQuadrupedTemplate({
  'b': [70, 80, 55, 255], 'd': [40, 48, 30, 255], 'e': [180, 40, 160, 255],
});
const buildRotlord = () => buildRobedBossTemplate({
  'k': [150, 170, 110, 255], 'e': [200, 60, 180, 255], 'j': [40, 45, 20, 255],
  'r': [70, 60, 30, 255], 'r2': [100, 90, 50, 255], 'd': [30, 25, 10, 255],
  'w': [90, 70, 40, 255], 'o': [160, 60, 150, 255],
});

// ---------- Zone 11: The Crystal Caverns ----------
const buildCrystalStalker = () => buildQuadrupedTemplate({
  'b': [100, 110, 220, 255], 'd': [60, 68, 150, 255], 'e': [255, 120, 220, 255],
});
const buildGemOoze = () => buildBlobTemplate({
  'm': [230, 110, 200, 255], 'l': [255, 180, 230, 255], 'o': [80, 30, 90, 255], 'd': [160, 60, 140, 255],
});
const buildPrismColossus = () => buildGolemBossTemplate({
  'i': [180, 150, 220, 255], 'i2': [220, 190, 250, 255], 'd': [110, 90, 150, 255],
  'g': [255, 150, 220, 255], 'cr': [100, 200, 230, 255],
});

// ---------- Zone 12: The Shadowfen ----------
const buildShadeStalker = () => buildBipedTemplate({
  'k': [40, 20, 55, 255], 'd': [20, 10, 30, 255], 'v': [60, 20, 80, 255],
  'r': [200, 60, 220, 255], 'w': [50, 30, 60, 255], 'o': [10, 5, 15, 255],
});
const buildNightmareHound = () => buildQuadrupedTemplate({
  'b': [25, 15, 30, 255], 'd': [10, 5, 15, 255], 'e': [220, 30, 50, 255],
});
const buildNightmareDrake = () => buildDragonBossTemplate({
  'b': [35, 20, 45, 255], 'd': [15, 8, 20, 255], 'w': [25, 14, 32, 255],
  'h': [180, 60, 220, 255], 'e': [255, 40, 90, 255], 'j': [10, 5, 12, 255],
});

// ---------- Zone 13: The Celestial Spire ----------
const buildStarWisp = () => buildFlierTemplate({
  'b': [240, 235, 255, 255], 'd': [200, 195, 225, 255], 'e': [255, 215, 80, 255],
});
const buildCloudSerpent = () => buildSerpentTemplate({
  'b': [220, 225, 245, 255], 'd': [170, 180, 210, 255], 'w': [200, 210, 235, 255],
  'h': [255, 225, 110, 255], 'e': [130, 180, 255, 255],
});
const buildAstralGuardian = () => buildArmoredBossTemplate({
  'a': [220, 210, 180, 255], 'a2': [250, 245, 220, 255], 'd': [160, 150, 120, 255],
  'r': [255, 230, 100, 255], 's': [240, 240, 250, 255], 'gr': [255, 255, 255, 255],
  'g': [200, 180, 120, 255], 'o': [100, 90, 60, 255], 'c': [180, 160, 220, 255],
});

// ---------- Zone 14: The Void Rift (final) ----------
const buildVoidSpawn = () => buildBlobTemplate({
  'm': [20, 10, 25, 255], 'l': [60, 20, 70, 255], 'o': [220, 30, 60, 255], 'd': [10, 5, 15, 255],
});
const buildChaosHound = () => buildQuadrupedTemplate({
  'b': [15, 10, 18, 255], 'd': [5, 5, 8, 255], 'e': [255, 40, 60, 255],
});
const buildWorldSerpent = () => buildDragonBossTemplate({
  'b': [10, 8, 12, 255], 'd': [3, 2, 4, 255], 'w': [15, 10, 18, 255],
  'h': [200, 30, 60, 255], 'e': [255, 60, 90, 255], 'j': [5, 3, 6, 255],
});

// ---------- Zone 15: The Ashen Wastes ----------
const buildAshWraith = () => buildFlierTemplate({
  'b': [130, 120, 110, 255], 'd': [80, 72, 65, 255], 'e': [255, 140, 60, 255],
});
const buildCinderGolem = () => buildQuadrupedTemplate({
  'b': [70, 40, 35, 255], 'd': [35, 18, 15, 255], 'e': [255, 120, 40, 255],
});
const buildAshlord = () => buildGolemBossTemplate({
  'i': [100, 90, 85, 255], 'i2': [140, 128, 120, 255], 'd': [60, 52, 48, 255],
  'g': [255, 140, 60, 255], 'cr': [200, 80, 30, 255],
});

// ---------- Zone 16: The Storm Citadel ----------
const buildThunderHawk = () => buildFlierTemplate({
  'b': [90, 140, 220, 255], 'd': [50, 90, 160, 255], 'e': [255, 255, 200, 255],
});
const buildStormElemental = () => buildBlobTemplate({
  'm': [110, 160, 230, 255], 'l': [180, 210, 255, 255], 'o': [20, 40, 80, 255], 'd': [70, 110, 180, 255],
});
const buildTempestKing = () => buildArmoredBossTemplate({
  'a': [100, 140, 190, 255], 'a2': [150, 190, 230, 255], 'd': [60, 90, 130, 255],
  'r': [220, 240, 255, 255], 's': [230, 240, 250, 255], 'gr': [255, 255, 255, 255],
  'g': [180, 190, 210, 255], 'o': [30, 45, 70, 255], 'c': [70, 100, 150, 255],
});

// ---------- Zone 17: The Bone Wastes ----------
const buildBoneReaper = () => buildBipedTemplate({
  'k': [220, 215, 195, 255], 'd': [160, 155, 135, 255], 'v': [40, 30, 50, 255],
  'r': [140, 60, 200, 255], 'w': [100, 90, 80, 255], 'o': [20, 15, 20, 255],
});
const buildWraithSerpent = () => buildSerpentTemplate({
  'b': [150, 180, 220, 255], 'd': [100, 130, 170, 255], 'w': [120, 150, 190, 255],
  'h': [220, 220, 255, 255], 'e': [180, 220, 255, 255],
});
const buildBoneEmperor = () => buildRobedBossTemplate({
  'k': [220, 215, 195, 255], 'e': [180, 80, 220, 255], 'j': [60, 50, 55, 255],
  'r': [50, 30, 60, 255], 'r2': [90, 60, 100, 255], 'd': [25, 15, 30, 255],
  'w': [90, 80, 90, 255], 'o': [160, 70, 200, 255],
});

// ---------- Zone 18: The Chaos Rift ----------
const buildChaosSpawn = () => buildBlobTemplate({
  'm': [180, 20, 140, 255], 'l': [230, 80, 200, 255], 'o': [10, 5, 15, 255], 'd': [110, 10, 90, 255],
});
const buildVoidHound = () => buildQuadrupedTemplate({
  'b': [30, 10, 35, 255], 'd': [10, 3, 12, 255], 'e': [255, 30, 180, 255],
});
const buildChaosHarbinger = () => buildDragonBossTemplate({
  'b': [140, 10, 110, 255], 'd': [70, 5, 55, 255], 'w': [90, 8, 70, 255],
  'h': [255, 255, 255, 255], 'e': [255, 60, 220, 255], 'j': [40, 3, 30, 255],
});

// ---------- Zone 19: The Throne of Eternity (final) ----------
const buildEternalGuardian = () => buildBipedTemplate({
  'k': [240, 225, 170, 255], 'd': [190, 170, 110, 255], 'v': [255, 255, 255, 255],
  'r': [255, 220, 100, 255], 'w': [220, 200, 150, 255], 'o': [140, 120, 80, 255],
});
const buildTimelessWraith = () => buildSerpentTemplate({
  'b': [230, 220, 180, 255], 'd': [180, 165, 110, 255], 'w': [200, 190, 150, 255],
  'h': [255, 255, 255, 255], 'e': [100, 150, 255, 255],
});
const buildEternalSovereign = () => buildDragonBossTemplate({
  'b': [255, 235, 180, 255], 'd': [200, 180, 120, 255], 'w': [240, 220, 160, 255],
  'h': [255, 255, 255, 255], 'e': [120, 180, 255, 255], 'j': [180, 160, 100, 255],
});

// ---------- Zone 20: The Abyssal Depths (post-game, unlocked from Town
// only after the true ending) — a bone-pale biped, a near-black quadruped,
// and a void-purple robed boss, distinct in both shape and palette from
// anything earlier in the chain.
const buildMawOfTheDeep = () => buildBipedTemplate({
  'k': [75, 72, 85, 255], 'd': [38, 36, 45, 255], 'v': [55, 52, 65, 255],
  'r': [140, 225, 95, 255], 'w': [48, 46, 58, 255], 'o': [18, 17, 22, 255],
});
const buildGloomfang = () => buildQuadrupedTemplate({
  'b': [28, 22, 38, 255], 'd': [12, 9, 18, 255], 'e': [190, 255, 250, 255],
});
const buildFormlessKing = () => buildRobedBossTemplate({
  'k': [45, 22, 55, 255], 'e': [255, 60, 200, 255], 'j': [15, 8, 20, 255],
  'r': [12, 6, 22, 255], 'r2': [38, 16, 58, 255], 'd': [6, 3, 10, 255],
  'w': [62, 42, 82, 255], 'o': [225, 42, 182, 255],
});

// ---------- Zone 21: The Sunless Expanse (post-game, past the Abyss) ----------
const buildDuskcrawler = () => buildBipedTemplate({
  'k': [35, 20, 50, 255], 'd': [15, 8, 25, 255], 'v': [55, 30, 80, 255],
  'r': [90, 50, 130, 255], 'w': [25, 15, 40, 255], 'o': [10, 5, 18, 255],
});
const buildHollowRevenant = () => buildQuadrupedTemplate({
  'b': [70, 65, 90, 255], 'd': [30, 28, 42, 255], 'e': [180, 255, 240, 255],
});
const buildDuskboundTyrant = () => buildRobedBossTemplate({
  'k': [30, 15, 45, 255], 'e': [140, 60, 255, 255], 'j': [10, 5, 18, 255],
  'r': [18, 8, 30, 255], 'r2': [45, 20, 65, 255], 'd': [8, 4, 14, 255],
  'w': [55, 35, 75, 255], 'o': [120, 50, 235, 255],
});

// ---------- Zone 22: The First Flame (the chain's true end, for now) ----------
const buildEmberwraith = () => buildBipedTemplate({
  'k': [120, 40, 20, 255], 'd': [60, 18, 8, 255], 'v': [200, 90, 30, 255],
  'r': [255, 140, 40, 255], 'w': [70, 25, 12, 255], 'o': [30, 10, 5, 255],
});
const buildCinderfiend = () => buildQuadrupedTemplate({
  'b': [90, 30, 15, 255], 'd': [40, 12, 6, 255], 'e': [255, 200, 60, 255],
});
const buildProgenitorEmber = () => buildRobedBossTemplate({
  'k': [70, 25, 10, 255], 'e': [255, 210, 80, 255], 'j': [25, 8, 4, 255],
  'r': [110, 35, 10, 255], 'r2': [200, 90, 20, 255], 'd': [45, 15, 6, 255],
  'w': [130, 55, 15, 255], 'o': [255, 170, 30, 255],
});

// ---------- Zone 23: The Cinder Expanse ----------
const buildSmolderingWisp = () => buildBipedTemplate({
  'k': [90, 45, 30, 255], 'd': [45, 20, 12, 255], 'v': [220, 110, 40, 255],
  'r': [255, 160, 60, 255], 'w': [55, 25, 15, 255], 'o': [25, 12, 6, 255],
});
const buildAshbornStalker = () => buildQuadrupedTemplate({
  'b': [70, 35, 25, 255], 'd': [35, 15, 10, 255], 'e': [255, 190, 90, 255],
});
const buildCinderWarden = () => buildRobedBossTemplate({
  'k': [55, 25, 15, 255], 'e': [255, 150, 40, 255], 'j': [20, 8, 5, 255],
  'r': [95, 40, 15, 255], 'r2': [170, 75, 20, 255], 'd': [38, 16, 8, 255],
  'w': [110, 50, 18, 255], 'o': [255, 130, 20, 255],
});

// ---------- Zone 24: The Heart of Emberfall (the chain's new true end) ----------
const buildFlareling = () => buildBipedTemplate({
  'k': [140, 50, 15, 255], 'd': [70, 22, 8, 255], 'v': [255, 130, 30, 255],
  'r': [255, 200, 70, 255], 'w': [80, 30, 10, 255], 'o': [35, 12, 5, 255],
});
const buildEmberkin = () => buildQuadrupedTemplate({
  'b': [110, 40, 18, 255], 'd': [55, 18, 8, 255], 'e': [255, 215, 90, 255],
});
const buildUndyingEmber = () => buildRobedBossTemplate({
  'k': [80, 30, 10, 255], 'e': [255, 225, 100, 255], 'j': [30, 10, 4, 255],
  'r': [130, 45, 12, 255], 'r2': [220, 100, 20, 255], 'd': [55, 18, 6, 255],
  'w': [150, 65, 15, 255], 'o': [255, 190, 40, 255],
});

// ---------- The Feral Pastures (secret zone) ----------
const buildWoollyGrazer = () => buildQuadrupedTemplate({
  'b': [230, 225, 210, 255], 'd': [180, 172, 155, 255], 'e': [20, 20, 25, 255],
});
const buildStrayRam = () => buildQuadrupedTemplate({
  'b': [200, 190, 175, 255], 'd': [150, 138, 118, 255], 'e': [40, 30, 20, 255],
});
const buildTheShepherd = () => buildRobedBossTemplate({
  'k': [210, 195, 165, 255], 'e': [80, 200, 90, 255], 'j': [90, 75, 55, 255],
  'r': [95, 75, 50, 255], 'r2': [140, 115, 80, 255], 'd': [50, 38, 24, 255],
  'w': [110, 90, 65, 255], 'o': [90, 200, 90, 255],
});

// ---------- The hired Mercenary ----------
const buildMercenary = () => buildBipedTemplate({
  'k': [110, 115, 125, 255], 'd': [60, 64, 72, 255], 'v': [70, 60, 45, 255],
  'r': [150, 30, 30, 255], 'w': [140, 110, 60, 255], 'o': [40, 30, 15, 255],
});

// ---------- Inventory icons — small item art for the Armory/Enchant/
// Inventory grids. Same "one shared template, recolor per tier" approach
// as the monster/boss templates above.
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

// 14x14 blade + crossguard + hilt, shared by all ten weapon tiers.
function buildSwordIcon({ blade, edge, hilt, guard }) {
  const g = makeGrid(14, 14);
  fillRect(g, 6, 1, 2, 8, 'b');
  fillRect(g, 3, 9, 8, 1, 'g');
  fillRect(g, 6, 10, 2, 3, 'h');
  setPx(g, 6, 13, 'h'); setPx(g, 7, 13, 'h');
  addRim(g, 'b', 'e');
  const palette = { b: blade, e: edge, h: hilt, g: guard };
  return rasterize(g, palette, 6);
}

// 14x14 chest-plate silhouette, shared by all ten armor tiers.
function buildArmorIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 2, 1, 10, 3, 'm');
  fillRect(g, 3, 4, 8, 5, 'm');
  fillRect(g, 4, 9, 6, 3, 'm');
  fillRect(g, 5, 12, 4, 1, 'm');
  fillRect(g, 2, 1, 10, 1, 't');
  fillRect(g, 6, 4, 2, 6, 't');
  addRim(g, 'm', 'd');
  const palette = { m: main, t: trim, d: dark };
  return rasterize(g, palette, 6);
}

const buildRustySwordIcon = () => buildSwordIcon({ blade: hex('#8a7a6a'), edge: hex('#6b5f52'), hilt: hex('#5a3a22'), guard: hex('#6b5a4a') });
const buildIronSwordIcon = () => buildSwordIcon({ blade: hex('#b8bcc4'), edge: hex('#8f939c'), hilt: hex('#4a3a2a'), guard: hex('#8a8a92') });
const buildSteelBladeIcon = () => buildSwordIcon({ blade: hex('#d0d8e0'), edge: hex('#a4b0bc'), hilt: hex('#3a3a4a'), guard: hex('#6a7a8a') });
const buildMithrilBladeIcon = () => buildSwordIcon({ blade: hex('#e8eef8'), edge: hex('#b8c8ec'), hilt: hex('#4a4a6a'), guard: hex('#8a9ac0') });
const buildFlameSaberIcon = () => buildSwordIcon({ blade: hex('#ff8a3a'), edge: hex('#ffc080'), hilt: hex('#5a2a1a'), guard: hex('#c94020') });
const buildFrostFangIcon = () => buildSwordIcon({ blade: hex('#a8e8f8'), edge: hex('#e0f8ff'), hilt: hex('#2a4a5a'), guard: hex('#4fa8c9') });
const buildThunderAxeIcon = () => buildSwordIcon({ blade: hex('#f4e04d'), edge: hex('#fff8b0'), hilt: hex('#4a3a1a'), guard: hex('#d4a840') });
const buildVoidCleaverIcon = () => buildSwordIcon({ blade: hex('#7a3fae'), edge: hex('#b088e0'), hilt: hex('#1a0e2a'), guard: hex('#4a2a6a') });
const buildDragonfangIcon = () => buildSwordIcon({ blade: hex('#8a1a1a'), edge: hex('#c94040'), hilt: hex('#2a0a0a'), guard: hex('#5a1010') });
const buildCelestialEdgeIcon = () => buildSwordIcon({ blade: hex('#fff8e0'), edge: hex('#ffffff'), hilt: hex('#d4a840'), guard: hex('#f4e04d') });

const buildClothTunicIcon = () => buildArmorIcon({ main: hex('#8a7355'), trim: hex('#6b5a42'), dark: hex('#5a4a36') });
const buildLeatherArmorIcon = () => buildArmorIcon({ main: hex('#6b4a2e'), trim: hex('#4a3320'), dark: hex('#3a2818') });
const buildIronPlateIcon = () => buildArmorIcon({ main: hex('#8a8a92'), trim: hex('#5a5a62'), dark: hex('#454549') });
const buildSteelMailIcon = () => buildArmorIcon({ main: hex('#6a7a8a'), trim: hex('#4a5a68'), dark: hex('#374250') });
const buildMithrilVestIcon = () => buildArmorIcon({ main: hex('#8a9ac0'), trim: hex('#5a6a94'), dark: hex('#3f4a6b') });
const buildDragonhideArmorIcon = () => buildArmorIcon({ main: hex('#4a6b3a'), trim: hex('#2a4a1e'), dark: hex('#1c3314') });
const buildRunicPlateIcon = () => buildArmorIcon({ main: hex('#5a4a7a'), trim: hex('#3a2a5a'), dark: hex('#281c3f') });
const buildShadowweaveCloakIcon = () => buildArmorIcon({ main: hex('#2a2438'), trim: hex('#4a4260'), dark: hex('#181420') });
const buildStormguardArmorIcon = () => buildArmorIcon({ main: hex('#4a5a78'), trim: hex('#7ad4f4'), dark: hex('#333f52') });
const buildCelestialAegisIcon = () => buildArmorIcon({ main: hex('#f4e8c0'), trim: hex('#d4a840'), dark: hex('#c9a860') });

// 14x14 domed helm with a brim and eye-slit, shared by all ten helm tiers.
function buildHelmetIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 3, 2, 8, 5, 'm');
  fillRect(g, 2, 6, 10, 2, 'm');
  fillRect(g, 5, 4, 4, 1, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 fist with a wrist cuff, shared by all ten glove tiers.
function buildGlovesIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 4, 3, 6, 6, 'm');
  fillRect(g, 2, 4, 3, 3, 'm');
  fillRect(g, 4, 9, 6, 3, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 L-shaped boot with an ankle cuff, shared by all ten boot tiers.
function buildBootsIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 4, 2, 4, 7, 'm');
  fillRect(g, 3, 9, 8, 3, 'm');
  fillRect(g, 4, 2, 4, 2, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 gem-on-a-cord, shared by all ten Companion Charm tiers plus the
// neutral "No Charm" default.
function buildCharmIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 5, 1, 4, 2, 't');
  fillRect(g, 4, 3, 6, 7, 'm');
  fillRect(g, 6, 5, 2, 3, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 rounded pendant on a chain, shared by all Amulet tiers plus the
// neutral "No Amulet" default — a wider, rounder silhouette than the Charm
// icon above so the two read as distinct trinkets at a glance.
function buildAmuletIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 6, 0, 2, 3, 't');
  fillRect(g, 5, 2, 4, 2, 't');
  fillRect(g, 3, 4, 8, 7, 'm');
  fillRect(g, 5, 6, 4, 3, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 open ring band with a set gem, shared by all Ring tiers plus the
// neutral "No Ring" default.
function buildRingIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 3, 7, 3, 4, 'm');
  fillRect(g, 8, 7, 3, 4, 'm');
  fillRect(g, 3, 10, 8, 2, 'm');
  fillRect(g, 5, 3, 4, 4, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 round berry/trinket shape, one per Held Item — unlike Charms/
// Amulets/Rings these aren't a tiered ramp (each is its own distinct,
// hand-picked item), so every one gets its own palette instead of reusing
// GEAR_TIER_PALETTE by index.
function buildHeldItemIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 4, 3, 6, 8, 'm');
  fillRect(g, 3, 5, 8, 4, 'm');
  fillRect(g, 5, 2, 4, 2, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 heater-shield silhouette (wide top tapering to a point), shared by
// all ten Shield tiers.
function buildShieldIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 2, 1, 10, 3, 'm');
  fillRect(g, 3, 4, 8, 4, 'm');
  fillRect(g, 4, 8, 6, 3, 'm');
  fillRect(g, 5, 11, 4, 2, 'm');
  fillRect(g, 6, 3, 2, 7, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// 14x14 horizontal belt band with a squared buckle, shared by all ten Belt
// tiers.
function buildBeltIcon({ main, trim, dark }) {
  const g = makeGrid(14, 14);
  fillRect(g, 1, 5, 12, 4, 'm');
  fillRect(g, 5, 4, 4, 6, 't');
  addRim(g, 'm', 'd');
  return rasterize(g, { m: main, t: trim, d: dark }, 6);
}

// One shared 10-tier color ramp (rusty -> iron -> steel -> mithril -> flame
// -> frost -> thunder -> void -> dragon -> celestial) reused across helms,
// gloves, and boots so a tier reads the same regardless of slot.
const GEAR_TIER_PALETTE = [
  { main: '#8a7a6a', trim: '#6b5a4a', dark: '#5a4a3a' },
  { main: '#b8bcc4', trim: '#8a8a92', dark: '#6a6a72' },
  { main: '#d0d8e0', trim: '#a4b0bc', dark: '#7a8794' },
  { main: '#e8eef8', trim: '#b8c8ec', dark: '#8a9ac0' },
  { main: '#ff8a3a', trim: '#c94020', dark: '#8a2010' },
  { main: '#a8e8f8', trim: '#4fa8c9', dark: '#2a5a6a' },
  { main: '#f4e04d', trim: '#d4a840', dark: '#a07820' },
  { main: '#7a3fae', trim: '#4a2a6a', dark: '#2a1840' },
  { main: '#8a1a1a', trim: '#5a1010', dark: '#3a0808' },
  { main: '#fff8e0', trim: '#d4a840', dark: '#b08a30' },
];
function tierColors(i) {
  const t = GEAR_TIER_PALETTE[i];
  return { main: hex(t.main), trim: hex(t.trim), dark: hex(t.dark) };
}

const HELMET_KEYS = ['clothCap', 'leatherCap', 'ironHelm', 'steelHelm', 'mithrilCirclet', 'flameguardHelm', 'frostcrown', 'thunderHelm', 'voidsightHelm', 'celestialCrown'];
const GLOVES_KEYS = ['clothWraps', 'leatherGloves', 'ironGauntlets', 'steelGauntlets', 'mithrilGrips', 'flameforgedGloves', 'frostbiteGloves', 'thunderstrikeGauntlets', 'voidtouchedGloves', 'celestialGauntlets'];
const BOOTS_KEYS = ['wornSandals', 'leatherBoots', 'ironGreaves', 'steelBoots', 'mithrilStriders', 'flamewalkers', 'frostwalkers', 'thunderstepBoots', 'voidwalkers', 'celestialStriders'];
const CHARM_KEYS = ['frayedCharm', 'carvedCharm', 'ironCharm', 'steelCharm', 'mithrilCharm', 'flameforgedCharm', 'frostboundCharm', 'thunderCharm', 'voidboundCharm', 'celestialCharm'];
const AMULET_KEYS = ['tarnishedAmulet', 'bronzeAmulet', 'jadeAmulet', 'silverAmulet', 'runedAmulet', 'enchantedAmulet', 'frostkissedAmulet', 'stormboundAmulet', 'voidwovenAmulet', 'celestialAmulet'];
const RING_KEYS = ['wornRing', 'copperRing', 'jadeRing', 'mithrilRing', 'runicRing', 'emberRing', 'frostRing', 'stormRing', 'voidRing', 'celestialRing'];
const SHIELD_KEYS = ['crackedBuckler', 'woodenTarge', 'ironBuckler', 'steelKiteShield', 'mithrilWall', 'dragonscaleWard', 'runicBulwark', 'shadowveilWard', 'stormwardBulwark', 'celestialBulwark'];
const BELT_KEYS = ['frayedSash', 'leatherBelt', 'ironGirdle', 'steelWaistguard', 'mithrilCinch', 'flameforgedSash', 'frostboundGirdle', 'thunderweaveBelt', 'voidwovenCinch', 'celestialSash'];

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
  'wolfpup.png': buildWolfPup,
  'hawk.png': buildHawk,
  'salamander.png': buildSalamander,
  'babygolem.png': buildBabyGolem,
  'turtle.png': buildTurtle,
  'fox.png': buildFox,
  'boar.png': buildBoar,
  'owl.png': buildOwl,
  'panther.png': buildPanther,
  'dragonling.png': buildDragonling,
  'merfolkraider.png': buildMerfolkRaider,
  'reefserpent.png': buildReefSerpent,
  'drownedqueen.png': buildDrownedQueen,
  'thornling.png': buildThornling,
  'wispmoth.png': buildWispMoth,
  'elderent.png': buildElderEnt,
  'dustjackal.png': buildDustJackal,
  'sandviper.png': buildSandViper,
  'sandreaver.png': buildSandReaver,
  'cinderimp.png': buildCinderImp,
  'magmahound.png': buildMagmaHound,
  'moltenwyrm.png': buildMoltenWyrm,
  'stormharpy.png': buildStormHarpy,
  'rockwyvern.png': buildRockWyvern,
  'stormguardtitan.png': buildStormguardTitan,
  'bogleech.png': buildBogLeech,
  'plaguerat.png': buildPlagueRat,
  'rotlord.png': buildRotlord,
  'crystalstalker.png': buildCrystalStalker,
  'gemooze.png': buildGemOoze,
  'prismcolossus.png': buildPrismColossus,
  'shadestalker.png': buildShadeStalker,
  'nightmarehound.png': buildNightmareHound,
  'nightmaredrake.png': buildNightmareDrake,
  'starwisp.png': buildStarWisp,
  'cloudserpent.png': buildCloudSerpent,
  'astralguardian.png': buildAstralGuardian,
  'voidspawn.png': buildVoidSpawn,
  'chaoshound.png': buildChaosHound,
  'worldserpent.png': buildWorldSerpent,
  'ashwraith.png': buildAshWraith,
  'cindergolem.png': buildCinderGolem,
  'ashlord.png': buildAshlord,
  'thunderhawk.png': buildThunderHawk,
  'stormelemental.png': buildStormElemental,
  'tempestking.png': buildTempestKing,
  'bonereaper.png': buildBoneReaper,
  'wraithserpent.png': buildWraithSerpent,
  'boneemperor.png': buildBoneEmperor,
  'chaosspawn.png': buildChaosSpawn,
  'voidhound.png': buildVoidHound,
  'chaosharbinger.png': buildChaosHarbinger,
  'eternalguardian.png': buildEternalGuardian,
  'timelesswraith.png': buildTimelessWraith,
  'eternalsovereign.png': buildEternalSovereign,

  // ---------- Zone 20: The Abyssal Depths (post-game) ----------
  'mawofthedeep.png': buildMawOfTheDeep,
  'gloomfang.png': buildGloomfang,
  'formlessking.png': buildFormlessKing,

  // ---------- Zone 21: The Sunless Expanse (post-game) ----------
  'duskcrawler.png': buildDuskcrawler,
  'hollowrevenant.png': buildHollowRevenant,
  'duskboundtyrant.png': buildDuskboundTyrant,

  // ---------- Zone 22: The First Flame (post-game) ----------
  'emberwraith.png': buildEmberwraith,
  'cinderfiend.png': buildCinderfiend,
  'progenitorember.png': buildProgenitorEmber,

  // ---------- Zone 23: The Cinder Expanse (post-game) ----------
  'smolderingwisp.png': buildSmolderingWisp,
  'ashbornstalker.png': buildAshbornStalker,
  'cinderwarden.png': buildCinderWarden,

  // ---------- Zone 24: The Heart of Emberfall (post-game) ----------
  'flareling.png': buildFlareling,
  'emberkin.png': buildEmberkin,
  'undyingember.png': buildUndyingEmber,

  // ---------- The Feral Pastures (secret zone) ----------
  'woollygrazer.png': buildWoollyGrazer,
  'strayram.png': buildStrayRam,
  'theshepherd.png': buildTheShepherd,

  // ---------- The hired Mercenary ----------
  'mercenary.png': buildMercenary,

  'wpn-rustySword.png': buildRustySwordIcon,
  'wpn-ironSword.png': buildIronSwordIcon,
  'wpn-steelBlade.png': buildSteelBladeIcon,
  'wpn-mithrilBlade.png': buildMithrilBladeIcon,
  'wpn-flameSaber.png': buildFlameSaberIcon,
  'wpn-frostFang.png': buildFrostFangIcon,
  'wpn-thunderAxe.png': buildThunderAxeIcon,
  'wpn-voidCleaver.png': buildVoidCleaverIcon,
  'wpn-dragonfang.png': buildDragonfangIcon,
  'wpn-celestialEdge.png': buildCelestialEdgeIcon,

  'arm-clothTunic.png': buildClothTunicIcon,
  'arm-leatherArmor.png': buildLeatherArmorIcon,
  'arm-ironPlate.png': buildIronPlateIcon,
  'arm-steelMail.png': buildSteelMailIcon,
  'arm-mithrilVest.png': buildMithrilVestIcon,
  'arm-dragonhideArmor.png': buildDragonhideArmorIcon,
  'arm-runicPlate.png': buildRunicPlateIcon,
  'arm-shadowweaveCloak.png': buildShadowweaveCloakIcon,
  'arm-stormguardArmor.png': buildStormguardArmorIcon,
  'arm-celestialAegis.png': buildCelestialAegisIcon,
};

HELMET_KEYS.forEach((key, i) => { sprites[`hlm-${key}.png`] = () => buildHelmetIcon(tierColors(i)); });
GLOVES_KEYS.forEach((key, i) => { sprites[`glv-${key}.png`] = () => buildGlovesIcon(tierColors(i)); });
BOOTS_KEYS.forEach((key, i) => { sprites[`bts-${key}.png`] = () => buildBootsIcon(tierColors(i)); });
SHIELD_KEYS.forEach((key, i) => { sprites[`shd-${key}.png`] = () => buildShieldIcon(tierColors(i)); });
BELT_KEYS.forEach((key, i) => { sprites[`blt-${key}.png`] = () => buildBeltIcon(tierColors(i)); });
sprites['chm-none.png'] = () => buildCharmIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
CHARM_KEYS.forEach((key, i) => { sprites[`chm-${key}.png`] = () => buildCharmIcon(tierColors(i)); });
sprites['amu-none.png'] = () => buildAmuletIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
AMULET_KEYS.forEach((key, i) => { sprites[`amu-${key}.png`] = () => buildAmuletIcon(tierColors(i)); });
sprites['rng-none.png'] = () => buildRingIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
RING_KEYS.forEach((key, i) => { sprites[`rng-${key}.png`] = () => buildRingIcon(tierColors(i)); });

const HELD_ITEM_PALETTES = {
  luckyEgg: { main: hex('#f4e04d'), trim: hex('#d4a840'), dark: hex('#a07820') },
  powerBand: { main: hex('#c94040'), trim: hex('#8a2020'), dark: hex('#5a1010') },
  focusSash: { main: hex('#ff8a3a'), trim: hex('#c94020'), dark: hex('#8a2010') },
  leftovers: { main: hex('#7ad46a'), trim: hex('#4a9c3a'), dark: hex('#2a6a1e') },
  goldenBell: { main: hex('#fff8e0'), trim: hex('#d4a840'), dark: hex('#b08a30') },
  quickClaw: { main: hex('#a8e8f8'), trim: hex('#4fa8c9'), dark: hex('#2a5a6a') },
};
Object.entries(HELD_ITEM_PALETTES).forEach(([key, palette]) => { sprites[`hld-${key}.png`] = () => buildHeldItemIcon(palette); });

for (const [filename, build] of Object.entries(sprites)) {
  const png = build();
  fs.writeFileSync(path.join(outDir, filename), png);
  console.log(`wrote ${filename} (${png.length} bytes)`);
}
