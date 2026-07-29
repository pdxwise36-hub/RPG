import { TILE, MAPS, WALKABLE, ENCOUNTER_TILES, HERO_SPRITE } from './data.js';
import { MAP_COLS, MAP_ROWS } from './mapgen.js';
export { MAP_COLS, MAP_ROWS };

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
// { type: 'blocked' | 'moved' | 'encounter' | 'town' | 'boss' | 'knight' | 'mage' | 'tamer' | 'arena' }
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
  if (tile === TILE.ARENA) return { type: 'arena' };
  if (tile === TILE.BOSSRUSH) return { type: 'bossrush' };
  if (tile === TILE.IDENTIFIER) return { type: 'identifier' };
  if (tile === TILE.RIVAL) return { type: 'rival' };

  if (tile === TILE.BOSS) {
    // The boss is a permanent, repeatable fight spot — it never turns into
    // a portal itself. The way onward lives in a separate tile beside it.
    return { type: 'boss' };
  }

  if (tile === TILE.NEXT_PORTAL) {
    if (!map.nextMap) return { type: 'moved' };
    if (!state.flags[map.bossFlag]) return { type: 'locked' };
    return { type: 'portal', mapId: map.nextMap.mapId };
  }

  if (tile === TILE.PORTAL) {
    // Town's exit opens the Travel menu, so you can walk into any level
    // you've ever reached — not just whichever one is "current." Every
    // level's own entry portal leads straight back to Town, no matter how
    // deep you are, and it stays open every single time; it never "closes"
    // or chains through intermediate levels on the way back.
    if (state.mapId === 'town') {
      return { type: 'townExit' };
    }
    return { type: 'portal', mapId: 'town' };
  }

  if (ENCOUNTER_TILES.has(tile) && Math.random() < ENCOUNTER_CHANCE) return { type: 'encounter' };
  return { type: 'moved' };
}

// Builds a full tile-color palette from a small set of theme accents —
// Town/Knight/Mage/Tamer/Arena tiles always blend into the theme's grass
// (their icon is drawn on top) and every non-overworld zone shares the same
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
    [TILE.NEXT_PORTAL]: portal,
    [TILE.KNIGHT]: grass,
    [TILE.MAGE]: grass,
    [TILE.TAMER]: grass,
    [TILE.ARENA]: grass,
    [TILE.BOSSRUSH]: grass,
    [TILE.IDENTIFIER]: grass,
    [TILE.RIVAL]: grass,
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
  ashenwastes: makeTheme({ grass: '#4a3530', path: '#6a4f42', water: '#c9500f', tree: '#2a1a15', boss: '#8a5a2a' }),
  stormcitadel: makeTheme({ grass: '#3a4a5a', path: '#5a6f85', water: '#1a2a3a', tree: '#243040', boss: '#4a8ac9' }),
  bonewastes: makeTheme({ grass: '#3a3530', path: '#5a5248', water: '#151210', tree: '#201d18', boss: '#8a5aae' }),
  chaosrift: makeTheme({ grass: '#2a0a25', path: '#4a1a40', water: '#100510', tree: '#180814', boss: '#c92f9f' }),
  throneofeternity: makeTheme({ grass: '#4a4025', path: '#6a5f3a', water: '#2a2510', tree: '#1a1810', boss: '#f4d84d' }),
  abyssaldepths: makeTheme({ grass: '#150a1a', path: '#2a1530', water: '#050208', tree: '#0d0612', boss: '#e02fb0' }),
  sunlessexpanse: makeTheme({ grass: '#0a0a12', path: '#181826', water: '#020204', tree: '#050508', boss: '#5a3aff' }),
  firstflame: makeTheme({ grass: '#3a1508', path: '#5a2810', water: '#ff5a10', tree: '#200a04', boss: '#ffb020' }),
  feralpastures: makeTheme({ grass: '#4a6b3a', path: '#8a9c6a', water: '#3a6a7a', tree: '#2a4a1e', boss: '#6a9c50' }),
  cinderexpanse: makeTheme({ grass: '#4a2010', path: '#6a3418', water: '#ff6a20', tree: '#2a1208', boss: '#ff8a30' }),
  emberheart: makeTheme({ grass: '#5a1808', path: '#7a2c10', water: '#ff4a10', tree: '#300e04', boss: '#ffcf40' }),
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
  ashenwastes: 'ember', stormcitadel: 'frost', bonewastes: 'arcane',
  chaosrift: 'arcane', throneofeternity: 'warm', abyssaldepths: 'arcane',
  sunlessexpanse: 'arcane', firstflame: 'ember', feralpastures: 'warm',
  cinderexpanse: 'ember', emberheart: 'ember',
};

const BOSS_CLEARED_COLOR = '#caa53d';
const SEALED_PORTAL_COLOR = '#3a3a42';

// A cheap, deterministic per-tile hash — used to vary grass blades/path
// texture/water ripples across a tile's own (x, y) so the extra decoration
// below doesn't look like an obviously repeating stamp, without resorting
// to Math.random() (which would make every redraw of the same tile jitter).
function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ (x << 13);
  h = (h ^ (h >>> 15)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

// Same lighten/darken-from-a-base-color trick the vector sprites use to
// auto-derive gradient stops, ported to canvas hex strings so map icons can
// get the same volumetric shading without hand-picking two colors each.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}

// The canvas equivalent of a vector-sprite body: a soft contact shadow, a
// radial gradient sphere (upper-left highlight, like bodyGradient), a rim
// stroke, and a sheen highlight — every interactive map icon (town, vendors,
// portals) is built on this so it reads at the same polish tier as the
// pets/characters instead of a flat-color rectangle.
function drawBadge(ctx, px, py, base, r = 12) {
  const cx = px + 16, cy = py + 16;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, py + 27, r - 1, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.15, cx, cy, r);
  grad.addColorStop(0, lighten(base, 0.35));
  grad.addColorStop(1, darken(base, 0.15));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(base, 0.45);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.5, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fill();
  return { cx, cy };
}

function drawPortalGlow(ctx, px, py, open) {
  const cx = px + 16, cy = py + 16;
  if (open) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 13);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - 3, cy - 2, 6, 6);
  }
}

export function drawMap(ctx, state) {
  const map = MAPS[state.mapId];
  const layout = state.layouts[state.mapId];
  const grid = layout.grid;
  const palette = PALETTES[map.theme];
  const mood = THEME_MOOD[map.theme] || 'warm';
  const rows = grid.length, gridCols = grid[0].length;
  // Every zone but the (3-screens-wide) Outskirts has gridCols === viewCols,
  // so camCol is always 0 and this is a no-op there. On the Outskirts the
  // camera clamps to the player's column, horizontally centered whenever
  // there's room on both sides, so it only stops scrolling at the grid's
  // outer edges — vertical framing never changes since nothing scrolls
  // top-to-bottom.
  const viewCols = Math.min(MAP_COLS, gridCols);
  const camCol = Math.max(0, Math.min(gridCols - viewCols, state.pos.x - Math.floor(viewCols / 2)));
  const w = viewCols * TILE_SIZE;
  const h = rows * TILE_SIZE;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  for (let y = 0; y < rows; y++) {
    for (let gx = camCol; gx < camCol + viewCols; gx++) {
      const tile = grid[y][gx];
      const px = (gx - camCol) * TILE_SIZE;
      const py = y * TILE_SIZE;
      ctx.fillStyle = tile === TILE.BOSS && state.flags[map.bossFlag] ? BOSS_CLEARED_COLOR
        : tile === TILE.NEXT_PORTAL && !state.flags[map.bossFlag] ? SEALED_PORTAL_COLOR
        : palette[tile];
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (tile === TILE.GRASS) {
        // A soft top-lit gradient reads as gentle terrain shading instead
        // of one flat fill, then a handful of short blade strokes (varied
        // per-tile via tileHash so it isn't an obviously repeating stamp)
        // stand in for individual grass without needing sprite art.
        const grad = ctx.createLinearGradient(px, py, px, py + TILE_SIZE);
        grad.addColorStop(0, 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const bladeColor = {
          warm: 'rgba(255,255,255,0.12)',
          arcane: 'rgba(180,150,255,0.16)',
          frost: 'rgba(255,255,255,0.5)',
          ember: 'rgba(255,140,70,0.25)',
        }[mood];
        const gh = tileHash(gx, y);
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) {
          const seed = (gh >> (i * 5)) & 0x1f;
          const bx = px + 4 + (seed % (TILE_SIZE - 8));
          const by = py + TILE_SIZE - 4 - (seed % 5);
          const lean = ((seed % 3) - 1) * 2;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + lean, by - 5 - (seed % 4));
          ctx.stroke();
        }
      } else if (tile === TILE.PATH) {
        // Path had no decoration at all before — a few worn dirt/stone
        // flecks (position/size varied per-tile via tileHash) so a long
        // corridor doesn't read as one uniform color block.
        const wh = tileHash(gx, y);
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        for (let i = 0; i < 3; i++) {
          const seed = (wh >> (i * 6)) & 0x3f;
          const dx = px + 4 + (seed % (TILE_SIZE - 8));
          const dy = py + 4 + ((seed * 7) % (TILE_SIZE - 8));
          const size = 1.5 + (seed % 3);
          ctx.beginPath();
          ctx.ellipse(dx, dy, size, size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (tile === TILE.WATER) {
        // A vertical gradient gives the water actual depth instead of one
        // flat fill; each mood then layers on 2 themed ripple/glint lines
        // (offset per-tile via tileHash) instead of just 1, for more
        // motion-suggesting detail on a still canvas redraw.
        const grad = ctx.createLinearGradient(px, py, px, py + TILE_SIZE);
        grad.addColorStop(0, 'rgba(255,255,255,0.06)');
        grad.addColorStop(1, 'rgba(0,0,0,0.14)');
        ctx.fillStyle = grad;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        const wh2 = tileHash(gx, y);
        const yOff = (wh2 % 7) - 3;
        if (mood === 'arcane') {
          ctx.strokeStyle = 'rgba(120,90,180,0.25)';
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 10 + yOff); ctx.lineTo(px + 14, py + 20 + yOff); ctx.lineTo(px + 8, py + 28 + yOff);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(160,130,220,0.18)';
          ctx.beginPath();
          ctx.moveTo(px + 20, py + 6 - yOff); ctx.lineTo(px + 26, py + 16 - yOff);
          ctx.stroke();
        } else if (mood === 'frost') {
          ctx.strokeStyle = 'rgba(200,240,255,0.4)';
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 8 + yOff); ctx.lineTo(px + 16, py + 18 + yOff); ctx.lineTo(px + 10, py + 27 + yOff);
          ctx.moveTo(px + 16, py + 18 + yOff); ctx.lineTo(px + 26, py + 10 + yOff);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 22 - yOff); ctx.lineTo(px + 12, py + 22 - yOff);
          ctx.stroke();
        } else if (mood === 'ember') {
          ctx.fillStyle = 'rgba(255,200,80,0.55)';
          ctx.beginPath(); ctx.arc(px + 12, py + 20 + yOff, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + 21, py + 12 + yOff, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,150,60,0.3)';
          ctx.beginPath(); ctx.arc(px + 8, py + 8 - yOff, 1.6, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 16 + yOff);
          ctx.lineTo(px + 28, py + 16 + yOff);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.moveTo(px + 6, py + 24 - yOff);
          ctx.lineTo(px + 22, py + 24 - yOff);
          ctx.stroke();
        }
      } else if (tile === TILE.TREE) {
        // Ground shadow first grounds the canopy, then the canopy and trunk
        // are lit with the same lighten/darken diagonal-gradient trick the
        // vector sprites use (bodyGradient) instead of one flat fill, plus
        // a crisp dark rim so the silhouette pops the way sprite outlines do.
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(px + 16, py + 28, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        const canopyBase = { arcane: '#4a4260', frost: '#cfe8f5', ember: '#241414', warm: '#2d6b34' }[mood];
        const canopyGrad = ctx.createLinearGradient(px + 6, py + 4, px + 26, py + 27);
        canopyGrad.addColorStop(0, lighten(canopyBase, 0.3));
        canopyGrad.addColorStop(1, darken(canopyBase, 0.25));
        if (mood === 'warm') {
          const trunkGrad = ctx.createLinearGradient(px + 13, py + 20, px + 19, py + 30);
          trunkGrad.addColorStop(0, lighten('#5a3a22', 0.15));
          trunkGrad.addColorStop(1, darken('#5a3a22', 0.25));
          ctx.fillStyle = trunkGrad;
          ctx.fillRect(px + 13, py + 20, 6, 10);
          ctx.fillStyle = canopyGrad;
          ctx.beginPath();
          ctx.arc(px + 16, py + 14, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = darken(canopyBase, 0.4);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          ctx.fillStyle = canopyGrad;
          ctx.beginPath();
          const tipX = mood === 'arcane' ? [16, 27, 5] : mood === 'frost' ? [16, 24, 8] : [16, 26, 6];
          ctx.moveTo(px + tipX[0], py + 4); ctx.lineTo(px + tipX[1], py + 26); ctx.lineTo(px + tipX[2], py + 26);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = darken(canopyBase, 0.4);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          if (mood === 'ember') {
            ctx.fillStyle = 'rgba(255,140,60,0.75)';
            ctx.beginPath(); ctx.arc(px + 16, py + 19, 1.6, 0, Math.PI * 2); ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.moveTo(px + 16, py + 6); ctx.lineTo(px + 20, py + 19); ctx.lineTo(px + 12, py + 19);
        ctx.closePath();
        ctx.fill();
      } else if (tile === TILE.TOWN) {
        const { cx, cy } = drawBadge(ctx, px, py, '#b08a3e');
        ctx.fillStyle = '#fff6df';
        ctx.fillRect(cx - 7, cy - 2, 14, 10);
        ctx.fillStyle = '#7a3b2e';
        ctx.beginPath();
        ctx.moveTo(cx - 9, cy - 2); ctx.lineTo(cx, cy - 11); ctx.lineTo(cx + 9, cy - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = darken('#7a3b2e', 0.3);
        ctx.fillRect(cx - 2, cy + 2, 4, 6);
      } else if (tile === TILE.BOSS) {
        // Farmable — the boss stays on its tile forever, defeated or not.
        // Fallback marker in case the boss portrait hasn't loaded yet; the
        // real portrait is drawn afterward as an overlay so its overflow
        // into neighboring tiles isn't painted over below.
        const bossImg = bossImages[map.id];
        if (!(bossImg && bossImg.complete && bossImg.naturalWidth > 0)) {
          drawBadge(ctx, px, py, '#5a1f3a', 10);
        }
      } else if (tile === TILE.PORTAL) {
        drawPortalGlow(ctx, px, py, true);
      } else if (tile === TILE.NEXT_PORTAL) {
        drawPortalGlow(ctx, px, py, !!state.flags[map.bossFlag]);
      } else if (tile === TILE.KNIGHT) {
        const { cx, cy } = drawBadge(ctx, px, py, '#5a5a62');
        ctx.strokeStyle = '#f4d878';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
        ctx.moveTo(cx - 6, cy - 2); ctx.lineTo(cx + 6, cy - 2);
        ctx.stroke();
        ctx.lineCap = 'butt';
      } else if (tile === TILE.MAGE) {
        const { cx, cy } = drawBadge(ctx, px, py, '#3a2a5a');
        const orbGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
        orbGrad.addColorStop(0, '#e0f7ff');
        orbGrad.addColorStop(1, '#7ad4f4');
        ctx.fillStyle = orbGrad;
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(122,212,244,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
      } else if (tile === TILE.TAMER) {
        const { cx, cy } = drawBadge(ctx, px, py, '#6b4a2e');
        ctx.fillStyle = '#f4e2c0';
        ctx.beginPath(); ctx.ellipse(cx, cy + 3, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); // paw pad
        ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 5, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 4, cy - 3, 2.2, 0, Math.PI * 2); ctx.fill();
      } else if (tile === TILE.ARENA) {
        const { cx, cy } = drawBadge(ctx, px, py, '#7a3b2e');
        ctx.fillStyle = '#f4e2c0';
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c94040'; // crossed swords
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5);
        ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5);
        ctx.stroke();
        ctx.lineCap = 'butt';
      } else if (tile === TILE.BOSSRUSH) {
        // a row of small skull markers — "many bosses, one gate"
        const { cx, cy } = drawBadge(ctx, px, py, '#3a1424');
        ctx.fillStyle = '#f4e2c0';
        ctx.beginPath(); ctx.arc(cx - 5, cy + 2, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, cy + 2, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a1424';
        ctx.beginPath(); ctx.arc(cx - 1.5, cy - 2, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 1.5, cy - 2, 1, 0, Math.PI * 2); ctx.fill();
      } else if (tile === TILE.IDENTIFIER) {
        // a magnifying glass — Deckard Cain identifies unidentified gear
        const { cx, cy } = drawBadge(ctx, px, py, '#3a4a5a');
        ctx.strokeStyle = '#c8d4e0';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 2, cy + 2); ctx.lineTo(cx + 6, cy + 6); ctx.stroke();
        ctx.lineCap = 'butt';
      } else if (tile === TILE.RIVAL) {
        // a two-tone diamond split down the middle — "you vs the rival"
        const { cx, cy } = drawBadge(ctx, px, py, '#4a3a5a');
        ctx.fillStyle = '#c94040';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 7, cy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a5a8a';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx + 7, cy);
        ctx.closePath(); ctx.fill();
      }
    }
  }

  // boss portrait — drawn as an overlay (not inline above) so its overflow
  // into neighboring tiles isn't painted over by tiles later in the loop.
  // Shown every visit, defeated or not — the boss is a permanent fight spot.
  if (map.bossEnemy) {
    const bossImg = bossImages[map.id];
    if (bossImg && bossImg.complete && bossImg.naturalWidth > 0) {
      const bpx = (layout.bossPos.x - camCol) * TILE_SIZE;
      const bpy = layout.bossPos.y * TILE_SIZE;
      const size = TILE_SIZE * 1.5;
      ctx.drawImage(bossImg, bpx + (TILE_SIZE - size) / 2, bpy + TILE_SIZE - size, size, size);
    }
  }

  // player marker
  const ppx = (state.pos.x - camCol) * TILE_SIZE;
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
