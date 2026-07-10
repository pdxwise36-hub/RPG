// Procedural zone-layout generator for the 14 monster levels, plus a fixed
// (never randomized) layout builder for Town. Every zone uses the same
// 12x16 footprint and entry column so canvas sizing stays put, but a
// level's path from entry to boss winds left and right at random instead of
// running straight down a single column — each call produces a different
// layout. Town is the one exception: it's hand-authored and identical every
// time, since it's meant to be a memorized, always-safe home base.
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

function buildOnce(obstacleChance, hasNextLevel) {
  const grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TILE.TREE));
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < MAP_COLS - 1; x++) {
      const roll = Math.random();
      grid[y][x] = roll < obstacleChance ? TILE.TREE : roll < obstacleChance * 1.6 ? TILE.WATER : TILE.GRASS;
    }
  }

  grid[2][ENTRY_COL] = TILE.PORTAL;
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

  // The portal onward sits beside the boss (not inside it) so the boss stays
  // a repeatable fight — whichever orthogonal neighbor is in bounds first.
  let nextPortalPos = null;
  if (hasNextLevel) {
    const sides = [
      { x: bossPos.x + 1, y: bossPos.y },
      { x: bossPos.x - 1, y: bossPos.y },
      { x: bossPos.x, y: bossPos.y - 1 },
      { x: bossPos.x, y: bossPos.y + 1 },
    ].filter((p) => p.x >= 1 && p.x <= MAP_COLS - 2 && p.y >= 1 && p.y <= MAP_ROWS - 2);
    if (sides.length > 0) {
      nextPortalPos = sides[0];
      grid[nextPortalPos.y][nextPortalPos.x] = TILE.NEXT_PORTAL;
    }
  }

  return { grid, startPos: { x: ENTRY_COL, y: ENTRY_ROW }, bossPos, nextPortalPos };
}

// Builds a random layout for one of the monster levels. Retries a few times
// if a rare bad roll walls off the boss, falling back to an obstacle-free
// layout (always trivially reachable) if that keeps failing. hasNextLevel
// controls whether a next-level portal is placed beside the boss at all —
// the final level's boss has nowhere onward to send you.
export function generateZoneGrid(hasNextLevel = true) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const layout = buildOnce(0.15, hasNextLevel);
    if (isReachable(layout.grid, layout.startPos, layout.bossPos)) return layout;
  }
  return buildOnce(0, hasNextLevel);
}

// Town's fixed grid — same every playthrough, every visit. No grass tiles
// at all, so no random encounters are even possible here. Buildings sit at
// hand-picked spots: the Town Center (rest/shop/armory hub) just below the
// entrance, Knight and Master Mage flanking a bit further down, the Pet
// Tamer and the Arena further still (mirrored on either side), and the exit
// portal (back to whichever level you were in) at the bottom.
function buildTownGrid() {
  const grid = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(TILE.TREE));
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < MAP_COLS - 1; x++) {
      grid[y][x] = TILE.PATH;
    }
  }
  grid[2][ENTRY_COL] = TILE.TOWN;
  grid[9][2] = TILE.KNIGHT;
  grid[9][9] = TILE.MAGE;
  grid[11][2] = TILE.TAMER;
  grid[11][9] = TILE.ARENA;
  grid[14][ENTRY_COL] = TILE.PORTAL;
  return grid;
}

const TOWN_GRID = buildTownGrid();

// Town's layout never changes — same grid object every time, no
// regeneration, no reachability check needed (it's hand-placed and fully
// open, nothing to wall off).
export function getTownLayout() {
  return { grid: TOWN_GRID, startPos: { x: ENTRY_COL, y: ENTRY_ROW } };
}
