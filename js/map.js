import { TILE, MAPS, WALKABLE, ENCOUNTER_TILES, HERO_SPRITE } from './data.js';
export { MAP_COLS, MAP_ROWS } from './mapgen.js';

export const TILE_SIZE = 32;

const ENCOUNTER_CHANCE = 0.12;

export const heroImage = new Image();
heroImage.src = HERO_SPRITE;

// One boss portrait per map, preloaded so it can stand on its lair tile.
// Town has no boss at all, so it's skipped here.
export const bossImages = {};
Object.values(MAPS).forEach((map) => {
  if (!map.bossEnemy) return;
  const img = new Image();
  img.src = map.bossEnemy.sprite;
  bossImages[map.id] = img;
});

export function tileAt(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return TILE.TREE;
  return grid[y][x];
}

// Attempts to move the player by (dx, dy). Returns one of:
// { type: 'blocked' | 'moved' | 'encounter' | 'town' | 'boss' | 'knight' | 'mage' | 'tamer' }
// { type: 'portal', mapId } — step onto a portal or cleared-boss tile; the
// caller resolves the landing position from the target zone's startPos.
export function tryMove(state, dx, dy) {
  const map = MAPS[state.mapId];
  const layout = state.layouts[state.mapId];
  const nx = state.pos.x + dx;
  const ny = state.pos.y + dy;
  const tile = tileAt(layout.grid, nx, ny);
  if (!WALKABLE.has(tile)) return { type: 'blocked' };

  state.pos.x = nx;
  state.pos.y = ny;

  if (tile === TILE.TOWN) return { type: 'town' };
  if (tile === TILE.KNIGHT) return { type: 'knight' };
  if (tile === TILE.MAGE) return { type: 'mage' };
  if (tile === TILE.TAMER) return { type: 'tamer' };

  if (tile === TILE.BOSS) {
    if (state.flags[map.bossFlag]) {
      if (map.nextMap) return { type: 'portal', mapId: map.nextMap.mapId };
      return { type: 'moved' };
    }
    return { type: 'boss' };
  }

  if (tile === TILE.PORTAL) {
    // Town's exit always leads back to whichever level you're actually
    // progressing through — that's what makes a Town Scroll (or just
    // walking out) a real shortcut back to your progress instead of a walk
    // back to level one. Symmetrically, every level's own entry portal
    // leads straight back to Town, no matter how deep you are — the same
    // shortcut a Town Scroll gives you, just reachable on foot. It stays
    // open every single time; it never "closes" or chains through
    // intermediate levels on the way back.
    if (state.mapId === 'town') {
      return { type: 'portal', mapId: state.currentLevelId || 'overworld' };
    }
    return { type: 'portal', mapId: 'town' };
  }

  if (ENCOUNTER_TILES.has(tile) && Math.random() < ENCOUNTER_CHANCE) return { type: 'encounter' };
  return { type: 'moved' };
}

// Builds a full tile-color palette from a small set of theme accents —
// Town/Knight/Mage/Tamer tiles always blend into the theme's grass (their
// icon is drawn on top) and every non-overworld zone shares the same
// "path onward" teal portal glow, so only grass/path/water/tree/boss vary.
function makeTheme({ grass, path, water, tree, boss, portal = '#3fd4c4' }) {
  return {
    [TILE.GRASS]: grass,
    [TILE.PATH]: path,
    [TILE.WATER]: water,
    [TILE.TREE]: tree,
    [TILE.TOWN]: '#b08a3e',
    [TILE.BOSS]: boss,
    [TILE.PORTAL]: portal,
    [TILE.KNIGHT]: grass,
    [TILE.MAGE]: grass,
    [TILE.TAMER]: grass,
  };
}

const PALETTES = {
  town: makeTheme({ grass: '#8a7355', path: '#8a7355', water: '#2a5f8a', tree: '#1c3d21', boss: '#8a7355', portal: '#d4a840' }),
  overworld: makeTheme({ grass: '#2f6b3a', path: '#8a7355', water: '#2a5f8a', tree: '#1c3d21', boss: '#c94040', portal: '#7a3fae' }),
  depths: makeTheme({ grass: '#3a3550', path: '#57506e', water: '#120c1f', tree: '#241c3d', boss: '#8a2fae' }),
  frostreach: makeTheme({ grass: '#a8d4e8', path: '#cfe4ea', water: '#0c2436', tree: '#7ab8d0', boss: '#4fa8c9' }),
  spire: makeTheme({ grass: '#4a2a2a', path: '#6a4a3a', water: '#c94a10', tree: '#2a1818', boss: '#5a2a1a' }),
  sunkenruins: makeTheme({ grass: '#1f4a52', path: '#3a6b6f', water: '#0a2a30', tree: '#153a40', boss: '#2f8a8f' }),
  whisperingwoods: makeTheme({ grass: '#2a3d1f', path: '#4a5a35', water: '#16240f', tree: '#1c2e12', boss: '#6a8a3f' }),
  sandscar: makeTheme({ grass: '#c9a86a', path: '#e0c894', water: '#8a6a3a', tree: '#a8874a', boss: '#d4763a' }),
  volcanic: makeTheme({ grass: '#3a1f1a', path: '#5a2f22', water: '#c94a10', tree: '#241210', boss: '#ff6a2a' }),
  shatteredpeaks: makeTheme({ grass: '#5a6a78', path: '#8494a0', water: '#2a3a48', tree: '#3a4a56', boss: '#a8c4d8' }),
  blightmarsh: makeTheme({ grass: '#2f3a1f', path: '#4a5a2a', water: '#1a2a10', tree: '#243015', boss: '#7a4a8a' }),
  crystalcaverns: makeTheme({ grass: '#2a2a4a', path: '#4a4a7a', water: '#12122a', tree: '#1c1c38', boss: '#e070c0' }),
  shadowfen: makeTheme({ grass: '#18101f', path: '#2a1e35', water: '#0a0612', tree: '#0f0a18', boss: '#7a2fae' }),
  celestial: makeTheme({ grass: '#3a3a5a', path: '#5a5a80', water: '#1a1a3a', tree: '#242440', boss: '#f4e04d' }),
  voidrift: makeTheme({ grass: '#0a0a0f', path: '#1a1420', water: '#000000', tree: '#050508', boss: '#c9304a' }),
};

// Generic per-theme decoration accents (speckle/water/tree rendering), keyed
// by a small set of "moods" instead of one bespoke branch per zone — zones
// reuse whichever mood fits their palette, since 14 fully bespoke decoration
// sets would be a lot of near-duplicate canvas code for little visual gain.
const THEME_MOOD = {
  town: 'warm', overworld: 'warm', depths: 'arcane', frostreach: 'frost', spire: 'ember',
  sunkenruins: 'arcane', whisperingwoods: 'warm', sandscar: 'ember', volcanic: 'ember',
  shatteredpeaks: 'frost', blightmarsh: 'arcane', crystalcaverns: 'frost',
  shadowfen: 'arcane', celestial: 'frost', voidrift: 'arcane',
};

const BOSS_CLEARED_COLOR = '#caa53d';

export function drawMap(ctx, state) {
  const map = MAPS[state.mapId];
  const layout = state.layouts[state.mapId];
  const grid = layout.grid;
  const palette = PALETTES[map.theme];
  const mood = THEME_MOOD[map.theme] || 'warm';
  const rows = grid.length, cols = grid[0].length;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = grid[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      ctx.fillStyle = tile === TILE.BOSS && state.flags[map.bossFlag] ? BOSS_CLEARED_COLOR : palette[tile];
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (tile === TILE.GRASS) {
        const speckle = {
          warm: 'rgba(255,255,255,0.05)',
          arcane: 'rgba(180,150,255,0.08)',
          frost: 'rgba(255,255,255,0.35)',
          ember: 'rgba(255,120,60,0.15)',
        }[mood];
        ctx.fillStyle = speckle;
        if ((x + y) % 2 === 0) ctx.fillRect(px + 6, py + 8, 3, 3);
        if ((x * 3 + y) % 5 === 0) ctx.fillRect(px + 20, py + 20, 3, 3);
      } else if (tile === TILE.WATER) {
        if (mood === 'arcane') {
          ctx.strokeStyle = 'rgba(120,90,180,0.25)';
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 10); ctx.lineTo(px + 14, py + 20); ctx.lineTo(px + 8, py + 28);
          ctx.stroke();
        } else if (mood === 'frost') {
          ctx.strokeStyle = 'rgba(200,240,255,0.4)';
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 8); ctx.lineTo(px + 16, py + 18); ctx.lineTo(px + 10, py + 27);
          ctx.moveTo(px + 16, py + 18); ctx.lineTo(px + 26, py + 10);
          ctx.stroke();
        } else if (mood === 'ember') {
          ctx.fillStyle = 'rgba(255,200,80,0.55)';
          ctx.beginPath(); ctx.arc(px + 12, py + 20, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 21, py + 12, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 16);
          ctx.lineTo(px + 28, py + 16);
          ctx.stroke();
        }
      } else if (tile === TILE.TREE) {
        if (mood === 'arcane') {
          ctx.fillStyle = '#4a4260';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 4); ctx.lineTo(px + 27, py + 26); ctx.lineTo(px + 5, py + 26);
          ctx.closePath();
          ctx.fill();
        } else if (mood === 'frost') {
          ctx.fillStyle = '#eaf7fd';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 3); ctx.lineTo(px + 24, py + 27); ctx.lineTo(px + 8, py + 27);
          ctx.closePath();
          ctx.fill();
        } else if (mood === 'ember') {
          ctx.fillStyle = '#1a0e0e';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 4); ctx.lineTo(px + 26, py + 27); ctx.lineTo(px + 6, py + 27);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = 'rgba(255,140,60,0.7)';
          ctx.fillRect(px + 15, py + 18, 2, 2);
        } else {
          ctx.fillStyle = '#5a3a22';
          ctx.fillRect(px + 13, py + 20, 6, 10);
          ctx.fillStyle = '#2d6b34';
          ctx.beginPath();
          ctx.arc(px + 16, py + 14, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === TILE.TOWN) {
        ctx.fillStyle = '#e8d9a8';
        ctx.fillRect(px + 8, py + 14, 16, 14);
        ctx.fillStyle = '#7a3b2e';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 14);
        ctx.lineTo(px + 16, py + 5);
        ctx.lineTo(px + 26, py + 14);
        ctx.closePath();
        ctx.fill();
      } else if (tile === TILE.BOSS) {
        if (state.flags[map.bossFlag]) {
          // cleared — reads the same as a portal, since that's what it now is
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px + 16, py + 16, 11, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // fallback marker in case the boss portrait hasn't loaded yet —
          // the real portrait is drawn afterward as an overlay so its
          // overflow into neighboring tiles isn't painted over below.
          const bossImg = bossImages[map.id];
          if (!(bossImg && bossImg.complete && bossImg.naturalWidth > 0)) {
            ctx.fillStyle = '#5a1f3a';
            ctx.beginPath();
            ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (tile === TILE.PORTAL) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 11, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tile === TILE.KNIGHT) {
        ctx.fillStyle = '#8a8a92';
        ctx.fillRect(px + 6, py + 10, 20, 18);
        ctx.strokeStyle = '#d4a840';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(px + 16, py + 8); ctx.lineTo(px + 16, py + 25);
        ctx.moveTo(px + 10, py + 14); ctx.lineTo(px + 22, py + 14);
        ctx.stroke();
      } else if (tile === TILE.MAGE) {
        ctx.fillStyle = '#3a2a5a';
        ctx.fillRect(px + 6, py + 12, 20, 16);
        ctx.fillStyle = '#7ad4f4';
        ctx.beginPath();
        ctx.arc(px + 16, py + 12, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(122,212,244,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px + 16, py + 12, 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tile === TILE.TAMER) {
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(px + 6, py + 12, 20, 16);
        ctx.fillStyle = '#e8c890';
        ctx.beginPath(); ctx.arc(px + 16, py + 17, 4, 0, Math.PI * 2); ctx.fill(); // paw pad
        ctx.beginPath(); ctx.arc(px + 12, py + 12, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 16, py + 10, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 20, py + 12, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // boss portrait — drawn as an overlay (not inline above) so its overflow
  // into neighboring tiles isn't painted over by tiles later in the loop
  if (map.bossEnemy && !state.flags[map.bossFlag]) {
    const bossImg = bossImages[map.id];
    if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
      const bpx = layout.bossPos.x * TILE_SIZE;
      const bpy = layout.bossPos.y * TILE_SIZE;
      const size = TILE_SIZE * 1.5;
      ctx.drawImage(bossImg, bpx + (TILE_SIZE - size) / 2, bpy + TILE_SIZE - size, size, size);
    }
  }

  // player marker
  const ppx = state.pos.x * TILE_SIZE;
  const ppy = state.pos.y * TILE_SIZE;
  if (heroImage.complete && heroImage.naturalWidth > 0) {
    const size = TILE_SIZE * 1.15;
    ctx.drawImage(heroImage, ppx + (TILE_SIZE - size) / 2, ppy + TILE_SIZE - size, size, size);
  } else {
    ctx.fillStyle = '#f4e04d';
    ctx.beginPath();
    ctx.arc(ppx + TILE_SIZE / 2, ppy + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
