import { TILE, MAP, WALKABLE, ENCOUNTER_TILES, BOSS_POS } from './data.js';

export const TILE_SIZE = 32;
export const MAP_COLS = MAP[0].length;
export const MAP_ROWS = MAP.length;

const ENCOUNTER_CHANCE = 0.12;

export function tileAt(x, y) {
  if (y < 0 || y >= MAP_ROWS || x < 0 || x >= MAP_COLS) return TILE.TREE;
  return MAP[y][x];
}

// Attempts to move the player by (dx, dy). Returns one of:
// 'blocked' | 'moved' | 'encounter' | 'town' | 'boss'
export function tryMove(state, dx, dy) {
  const nx = state.pos.x + dx;
  const ny = state.pos.y + dy;
  const tile = tileAt(nx, ny);
  if (!WALKABLE.has(tile)) return 'blocked';

  state.pos.x = nx;
  state.pos.y = ny;

  if (tile === TILE.TOWN) return 'town';
  if (tile === TILE.BOSS) return state.flags.bossDefeated ? 'moved' : 'boss';
  if (ENCOUNTER_TILES.has(tile) && Math.random() < ENCOUNTER_CHANCE) return 'encounter';
  return 'moved';
}

const TILE_COLORS = {
  [TILE.GRASS]: '#2f6b3a',
  [TILE.PATH]: '#8a7355',
  [TILE.WATER]: '#2a5f8a',
  [TILE.TREE]: '#1c3d21',
  [TILE.TOWN]: '#b08a3e',
  [TILE.BOSS]: '#5a1f3a',
};

export function drawMap(ctx, state) {
  const w = MAP_COLS * TILE_SIZE;
  const h = MAP_ROWS * TILE_SIZE;
  ctx.clearRect(0, 0, w, h);

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const tile = MAP[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      ctx.fillStyle = TILE_COLORS[tile];
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (tile === TILE.GRASS) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        if ((x + y) % 2 === 0) ctx.fillRect(px + 6, py + 8, 3, 3);
        if ((x * 3 + y) % 5 === 0) ctx.fillRect(px + 20, py + 20, 3, 3);
      } else if (tile === TILE.WATER) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 16);
        ctx.lineTo(px + 28, py + 16);
        ctx.stroke();
      } else if (tile === TILE.TREE) {
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(px + 13, py + 20, 6, 10);
        ctx.fillStyle = '#2d6b34';
        ctx.beginPath();
        ctx.arc(px + 16, py + 14, 12, 0, Math.PI * 2);
        ctx.fill();
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
        ctx.fillStyle = state.flags.bossDefeated ? '#caa53d' : '#c94040';
        ctx.beginPath();
        ctx.arc(px + 16, py + 16, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // player marker
  const ppx = state.pos.x * TILE_SIZE;
  const ppy = state.pos.y * TILE_SIZE;
  ctx.fillStyle = '#f4e04d';
  ctx.beginPath();
  ctx.arc(ppx + TILE_SIZE / 2, ppy + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function isNearBoss(state) {
  return state.pos.x === BOSS_POS.x && state.pos.y === BOSS_POS.y;
}
