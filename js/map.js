import { TILE, MAPS, WALKABLE, ENCOUNTER_TILES, HERO_SPRITE } from './data.js';

export const TILE_SIZE = 32;
export const MAP_COLS = MAPS.overworld.grid[0].length;
export const MAP_ROWS = MAPS.overworld.grid.length;

const ENCOUNTER_CHANCE = 0.12;

export const heroImage = new Image();
heroImage.src = HERO_SPRITE;

export function tileAt(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return TILE.TREE;
  return grid[y][x];
}

// Attempts to move the player by (dx, dy). Returns one of:
// { type: 'blocked' | 'moved' | 'encounter' | 'town' | 'boss' | 'knight' | 'mage' }
// { type: 'portal', mapId, pos }  — step onto a portal/cleared-boss tile
export function tryMove(state, dx, dy) {
  const map = MAPS[state.mapId];
  const nx = state.pos.x + dx;
  const ny = state.pos.y + dy;
  const tile = tileAt(map.grid, nx, ny);
  if (!WALKABLE.has(tile)) return { type: 'blocked' };

  state.pos.x = nx;
  state.pos.y = ny;

  if (tile === TILE.TOWN) return { type: 'town' };
  if (tile === TILE.KNIGHT) return { type: 'knight' };
  if (tile === TILE.MAGE) return { type: 'mage' };

  if (tile === TILE.BOSS) {
    if (state.flags[map.bossFlag]) {
      if (map.nextMap) return { type: 'portal', mapId: map.nextMap.mapId, pos: map.nextMap.pos };
      return { type: 'moved' };
    }
    return { type: 'boss' };
  }

  if (tile === TILE.PORTAL && map.portalTarget) {
    return { type: 'portal', mapId: map.portalTarget.mapId, pos: map.portalTarget.pos };
  }

  if (ENCOUNTER_TILES.has(tile) && Math.random() < ENCOUNTER_CHANCE) return { type: 'encounter' };
  return { type: 'moved' };
}

const PALETTES = {
  overworld: {
    [TILE.GRASS]: '#2f6b3a',
    [TILE.PATH]: '#8a7355',
    [TILE.WATER]: '#2a5f8a',
    [TILE.TREE]: '#1c3d21',
    [TILE.TOWN]: '#b08a3e',
    [TILE.BOSS]: '#c94040',
    [TILE.PORTAL]: '#7a3fae',
    [TILE.KNIGHT]: '#2f6b3a',
    [TILE.MAGE]: '#2f6b3a',
  },
  depths: {
    [TILE.GRASS]: '#3a3550',
    [TILE.PATH]: '#57506e',
    [TILE.WATER]: '#120c1f',
    [TILE.TREE]: '#241c3d',
    [TILE.TOWN]: '#b08a3e',
    [TILE.BOSS]: '#8a2fae',
    [TILE.PORTAL]: '#3fd4c4',
    [TILE.KNIGHT]: '#3a3550',
    [TILE.MAGE]: '#3a3550',
  },
  frostreach: {
    [TILE.GRASS]: '#a8d4e8',
    [TILE.PATH]: '#cfe4ea',
    [TILE.WATER]: '#0c2436',
    [TILE.TREE]: '#7ab8d0',
    [TILE.TOWN]: '#b08a3e',
    [TILE.BOSS]: '#4fa8c9',
    [TILE.PORTAL]: '#3fd4c4',
    [TILE.KNIGHT]: '#a8d4e8',
    [TILE.MAGE]: '#a8d4e8',
  },
  spire: {
    [TILE.GRASS]: '#4a2a2a',
    [TILE.PATH]: '#6a4a3a',
    [TILE.WATER]: '#c94a10',
    [TILE.TREE]: '#2a1818',
    [TILE.TOWN]: '#b08a3e',
    [TILE.BOSS]: '#5a2a1a',
    [TILE.PORTAL]: '#3fd4c4',
    [TILE.KNIGHT]: '#4a2a2a',
    [TILE.MAGE]: '#4a2a2a',
  },
};

const BOSS_CLEARED_COLOR = '#caa53d';

export function drawMap(ctx, state) {
  const map = MAPS[state.mapId];
  const grid = map.grid;
  const palette = PALETTES[map.theme];
  const rows = grid.length, cols = grid[0].length;
  const w = cols * TILE_SIZE;
  const h = rows * TILE_SIZE;
  const theme = map.theme;
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
          overworld: 'rgba(255,255,255,0.05)',
          depths: 'rgba(180,150,255,0.08)',
          frostreach: 'rgba(255,255,255,0.35)',
          spire: 'rgba(255,120,60,0.15)',
        }[theme];
        ctx.fillStyle = speckle;
        if ((x + y) % 2 === 0) ctx.fillRect(px + 6, py + 8, 3, 3);
        if ((x * 3 + y) % 5 === 0) ctx.fillRect(px + 20, py + 20, 3, 3);
      } else if (tile === TILE.WATER) {
        if (theme === 'depths') {
          ctx.strokeStyle = 'rgba(120,90,180,0.25)';
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 10); ctx.lineTo(px + 14, py + 20); ctx.lineTo(px + 8, py + 28);
          ctx.stroke();
        } else if (theme === 'frostreach') {
          ctx.strokeStyle = 'rgba(200,240,255,0.4)';
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 8); ctx.lineTo(px + 16, py + 18); ctx.lineTo(px + 10, py + 27);
          ctx.moveTo(px + 16, py + 18); ctx.lineTo(px + 26, py + 10);
          ctx.stroke();
        } else if (theme === 'spire') {
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
        if (theme === 'depths') {
          ctx.fillStyle = '#4a4260';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 4); ctx.lineTo(px + 27, py + 26); ctx.lineTo(px + 5, py + 26);
          ctx.closePath();
          ctx.fill();
        } else if (theme === 'frostreach') {
          ctx.fillStyle = '#eaf7fd';
          ctx.beginPath();
          ctx.moveTo(px + 16, py + 3); ctx.lineTo(px + 24, py + 27); ctx.lineTo(px + 8, py + 27);
          ctx.closePath();
          ctx.fill();
        } else if (theme === 'spire') {
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
        ctx.fillStyle = state.flags[map.bossFlag] ? '#8a6a1a' : '#5a1f3a';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2);
        ctx.fill();
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
      }
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
