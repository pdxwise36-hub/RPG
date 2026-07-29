// Procedural zone-layout generator for the 14 monster levels, plus a fixed
// (never randomized) layout builder for Town. Every zone uses the same
// 12x16 footprint and entry column so canvas sizing stays put — except the
// Outskirts (the first level), which is generated 3 screens wide instead of
// 1 (see `screensWide`) for extra roaming room; the camera in map.js's
// drawMap scrolls to follow the player across it while every other zone
// stays exactly 1 screen and renders exactly as before. A level's path from
// entry to boss winds left and right at random instead of running straight
// down a single column — each call produces a different layout. Town is the
// one exception: it's hand-authored and identical every time, since it's
// meant to be a memorized, always-safe home base.
import { TILE, WALKABLE } from './data.js';

export const MAP_COLS = 12;
export const MAP_ROWS = 16;
const ENTRY_COL = 5;
const ENTRY_ROW = 3;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Every WALKABLE tile reachable from `start` via 4-directional steps —
// shared by isReachable (boss-specific check) and sealUnreachablePockets
// (whole-grid cleanup) below.
function floodReachable(grid, start) {
  const seen = new Set([`${start.x},${start.y}`]);
  const stack = [start];
  while (stack.length) {
    const { x, y } = stack.pop();
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
  return seen;
}

function isReachable(grid, start, target) {
  return floodReachable(grid, start).has(`${target.x},${target.y}`);
}

// The obstacle scatter in buildOnce is independent of the carved path, so a
// pocket of GRASS can end up fully ringed by TREE/WATER with no orthogonal
// route back to the rest of the map — only the exact carved corridor is
// guaranteed connected. A player wandering off the path (chasing an
// encounter, exploring) could step into one of these pockets and find
// themselves walled in with no way onward, since movement is 4-directional
// only. Converts every WALKABLE tile NOT reachable from `start` into TREE
// so the returned grid has no such traps — the whole playable area is
// always one connected region.
function sealUnreachablePockets(grid, start) {
  const reachable = floodReachable(grid, start);
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (WALKABLE.has(grid[y][x]) && !reachable.has(`${x},${y}`)) grid[y][x] = TILE.TREE;
    }
  }
}

// `screensWide` widens the grid to that many MAP_COLS-wide screens (only the
// Outskirts uses more than 1 — see generateZoneGrid) with the entry re-centered
// in the middle of the full width instead of the fixed single-screen ENTRY_COL,
// so the extra room is split evenly to both sides. Everything else (obstacle
// scatter, the winding boss path, reachability sealing) already operates on
// the grid's actual dimensions rather than the MAP_COLS/MAP_ROWS constants
// directly, so it scales up for free.
function buildOnce(obstacleChance, hasNextLevel, screensWide = 1) {
  const cols = MAP_COLS * screensWide;
  const entryCol = screensWide === 1 ? ENTRY_COL : Math.floor(cols / 2);
  const minCol = 2;
  const maxCol = cols - 3;
  const grid = Array.from({ length: MAP_ROWS }, () => Array(cols).fill(TILE.TREE));
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const roll = Math.random();
      grid[y][x] = roll < obstacleChance ? TILE.TREE : roll < obstacleChance * 1.6 ? TILE.WATER : TILE.GRASS;
    }
  }

  grid[2][entryCol] = TILE.PORTAL;
  grid[ENTRY_ROW][entryCol] = TILE.PATH;
  const path = [{ x: entryCol, y: ENTRY_ROW }];
  let col = entryCol;
  for (let y = ENTRY_ROW + 1; y <= MAP_ROWS - 2; y++) {
    col = Math.min(maxCol, Math.max(minCol, col + pick([-1, 0, 0, 0, 1])));
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
    ].filter((p) => p.x >= 1 && p.x <= cols - 2 && p.y >= 1 && p.y <= MAP_ROWS - 2);
    if (sides.length > 0) {
      nextPortalPos = sides[0];
      grid[nextPortalPos.y][nextPortalPos.x] = TILE.NEXT_PORTAL;
    }
  }

  return { grid, startPos: { x: entryCol, y: ENTRY_ROW }, bossPos, nextPortalPos };
}

// Builds a random layout for one of the monster levels. Retries a few times
// if a rare bad roll walls off the boss, falling back to an obstacle-free
// layout (always trivially reachable) if that keeps failing. hasNextLevel
// controls whether a next-level portal is placed beside the boss at all —
// the final level's boss has nowhere onward to send you. screensWide (see
// buildOnce) is 1 for every zone except the Outskirts, which state.js passes
// 3 for — 3 MAP_COLS-wide screens joined into one grid, entered dead center.
export function generateZoneGrid(hasNextLevel = true, screensWide = 1) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const layout = buildOnce(0.15, hasNextLevel, screensWide);
    if (isReachable(layout.grid, layout.startPos, layout.bossPos)) {
      sealUnreachablePockets(layout.grid, layout.startPos);
      return layout;
    }
  }
  const layout = buildOnce(0, hasNextLevel, screensWide);
  sealUnreachablePockets(layout.grid, layout.startPos);
  return layout;
}

// Town's fixed grid — same every playthrough, every visit. No grass tiles
// at all, so no random encounters are even possible here. Buildings sit at
// hand-picked spots: the Town Center (rest/shop/armory hub) just below the
// entrance, the Rival's tent a little further down, Knight and Master Mage
// flanking further still, the Pet Tamer and the Arena further still
// (mirrored on either side), the Boss Rush gate and Deckard Cain's tent
// near the bottom (also mirrored), and the exit portal (back to whichever
// level you were in) at the bottom.
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
  grid[13][2] = TILE.BOSSRUSH;
  grid[13][9] = TILE.IDENTIFIER;
  grid[7][2] = TILE.RIVAL;
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
