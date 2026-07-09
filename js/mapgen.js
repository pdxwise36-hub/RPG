// Procedural zone-layout generator. Every zone (overworld included) uses the
// same fixed 12x16 footprint and entry column so canvas sizing and the
// town/portal anchor stay put, but the path from entry to boss winds left
// and right at random instead of running straight down a single column —
// each call produces a different layout.
import { TILE, WALKABLE } from './data.js';

export const MAP_COLS = 12;
export const MAP_ROWS = 16;
const ENTRY_COL = 5;
const ENTRY_ROW = 3;
const MIN_COL = 2;
const MAX_COL = MAP_COLS - 3;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function isReachable(grid, start, target) {
  const seen = new Set([`${start.x},${start.y}`]);
  const stack = [start];
  while (stack.length) {
    const { x, y } = stack.pop();
    if (x === target.x && y === target.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key)) continue;
      const row = grid[ny];
      const tile = row && row[nx];
      if (tile === undefined || !WALKABLE.has(tile)) continue;
      seen.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return false;
}

function buildOnce({ hasTown, vendors, obstacleChance }) {
  const grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TILE.TREE));
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < MAP_COLS - 1; x++) {
      const roll = Math.random();
      grid[y][x] = roll < obstacleChance ? TILE.TREE : roll < obstacleChance * 1.6 ? TILE.WATER : TILE.GRASS;
    }
  }

  grid[2][ENTRY_COL] = hasTown ? TILE.TOWN : TILE.PORTAL;
  grid[ENTRY_ROW][ENTRY_COL] = TILE.PATH;
  const path = [{ x: ENTRY_COL, y: ENTRY_ROW }];
  let col = ENTRY_COL;
  for (let y = ENTRY_ROW + 1; y <= MAP_ROWS - 2; y++) {
    col = Math.min(MAX_COL, Math.max(MIN_COL, col + pick([-1, 0, 0, 0, 1])));
    grid[y][col] = TILE.PATH;
    path.push({ x: col, y });
  }
  const bossPos = path[path.length - 1];
  grid[bossPos.y][bossPos.x] = TILE.BOSS;

  const used = new Set([`${ENTRY_COL},2`, `${bossPos.x},${bossPos.y}`]);
  const midPath = path.slice(2, -2);
  vendors.forEach((tileValue) => {
    for (let attempt = 0; attempt < 30 && midPath.length; attempt++) {
      const base = pick(midPath);
      const [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const nx = base.x + dx, ny = base.y + dy;
      const key = `${nx},${ny}`;
      if (nx <= 0 || nx >= MAP_COLS - 1 || ny <= 1 || ny >= MAP_ROWS - 1) continue;
      if (used.has(key)) continue;
      if (grid[ny][nx] === TILE.PATH || grid[ny][nx] === TILE.BOSS) continue;
      grid[ny][nx] = tileValue;
      used.add(key);
      return;
    }
  });

  return { grid, startPos: { x: ENTRY_COL, y: ENTRY_ROW }, bossPos };
}

// Builds a random layout for a zone. `hasTown` swaps the entry tile for a
// Town (overworld only); `vendors` is a list of TILE values (Knight/Mage/
// Tamer) scattered adjacent to the path, overworld only. Retries a few
// times if a rare bad roll walls off the boss, falling back to an
// obstacle-free layout (always trivially reachable) if that keeps failing.
export function generateZoneGrid({ hasTown = false, vendors = [] } = {}) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const layout = buildOnce({ hasTown, vendors, obstacleChance: 0.15 });
    if (isReachable(layout.grid, layout.startPos, layout.bossPos)) return layout;
  }
  return buildOnce({ hasTown, vendors, obstacleChance: 0 });
}
