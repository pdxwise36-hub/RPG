// Static game content: base stats, roster, items, and the overworld layout.
// Nothing here mutates at runtime — state.js clones what it needs.

export const TILE = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  TREE: 3,
  TOWN: 4,
  BOSS: 5,
  PORTAL: 6,
};

export const WALKABLE = new Set([TILE.GRASS, TILE.PATH, TILE.TOWN, TILE.BOSS, TILE.PORTAL]);
export const ENCOUNTER_TILES = new Set([TILE.GRASS]);

// 12 columns x 16 rows. A single path (col 5) runs from the town at the top
// to the boss lair at the bottom; grass on either side is where random
// encounters happen; water and stray trees just add texture/obstacles.
const OVERWORLD_GRID = [
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
  [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 3, 3, 1, 3, 3, 0, 0, 0, 3],
  [3, 0, 0, 3, 0, 1, 0, 3, 0, 0, 0, 3],
  [3, 0, 2, 2, 0, 1, 0, 0, 0, 2, 0, 3],
  [3, 0, 2, 2, 0, 1, 0, 0, 0, 2, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 3, 0, 0, 1, 0, 0, 3, 0, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 3, 0, 1, 0, 3, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 3],
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

// The Ember Depths reuses the overworld's layout (same obstacles, same
// footprint) so no canvas-resize logic is needed, but swaps the town for a
// return portal and re-themes via a different tile palette in map.js.
const DEPTHS_GRID = OVERWORLD_GRID.map((row) => row.slice());
DEPTHS_GRID[1][5] = TILE.PORTAL;
DEPTHS_GRID[2][5] = TILE.PATH;

export const HERO_SPRITE = 'icons/sprites/hero.png';

export const WEAPONS = {
  rustySword: { key: 'rustySword', name: 'Rusty Sword', atkBonus: 0, price: 0 },
  ironSword: { key: 'ironSword', name: 'Iron Sword', atkBonus: 4, price: 40 },
  steelBlade: { key: 'steelBlade', name: 'Steel Blade', atkBonus: 9, price: 120 },
};

export const ARMORS = {
  clothTunic: { key: 'clothTunic', name: 'Cloth Tunic', defBonus: 0, price: 0 },
  leatherArmor: { key: 'leatherArmor', name: 'Leather Armor', defBonus: 3, price: 35 },
  ironPlate: { key: 'ironPlate', name: 'Iron Plate', defBonus: 7, price: 110 },
};

export const PLAYER_BASE = {
  name: 'Kael',
  level: 1,
  hp: 30,
  maxHp: 30,
  mp: 10,
  maxMp: 10,
  baseAtk: 6,
  baseDef: 3,
  xp: 0,
  xpToNext: 20,
  gold: 15,
  weaponKey: 'rustySword',
  armorKey: 'clothTunic',
  ownedWeapons: ['rustySword'],
  ownedArmors: ['clothTunic'],
  inventory: { potion: 3, ether: 0 },
};

export const LEVEL_GROWTH = { hp: 8, mp: 3, atk: 2, def: 1, xpFactor: 1.6 };

export const ENEMIES = {
  slime: { key: 'slime', name: 'Slime', maxHp: 12, atk: 3, def: 1, xp: 5, goldMin: 3, goldMax: 6, weight: 5, sprite: 'icons/sprites/slime.png' },
  goblin: { key: 'goblin', name: 'Goblin', maxHp: 20, atk: 6, def: 2, xp: 10, goldMin: 6, goldMax: 12, weight: 3, sprite: 'icons/sprites/goblin.png' },
  wolf: { key: 'wolf', name: 'Wolf', maxHp: 18, atk: 8, def: 1, xp: 12, goldMin: 8, goldMax: 14, weight: 2, sprite: 'icons/sprites/wolf.png' },
};

export const BOSS = {
  key: 'darkknight', name: 'Dark Knight', maxHp: 70, atk: 12, def: 5, xp: 150, goldMin: 100, goldMax: 100, sprite: 'icons/sprites/darkknight.png',
};

export const DEPTHS_ENEMIES = {
  bat: { key: 'bat', name: 'Bat', maxHp: 16, atk: 9, def: 2, xp: 14, goldMin: 10, goldMax: 16, weight: 4, sprite: 'icons/sprites/bat.png' },
  specter: { key: 'specter', name: 'Specter', maxHp: 26, atk: 10, def: 4, xp: 18, goldMin: 14, goldMax: 22, weight: 3, sprite: 'icons/sprites/specter.png' },
};

export const LICH = {
  key: 'lich', name: 'The Lich', maxHp: 100, atk: 15, def: 7, xp: 250, goldMin: 200, goldMax: 200, sprite: 'icons/sprites/lich.png',
};

// Registry driving movement/rendering/encounters per zone (map.js, battle.js,
// ui.js all key off state.mapId instead of hardcoding a single map).
export const MAPS = {
  overworld: {
    id: 'overworld',
    name: 'Emberfall',
    grid: OVERWORLD_GRID,
    theme: 'overworld',
    startPos: { x: 5, y: 3 },
    townPos: { x: 5, y: 2 },
    bossPos: { x: 5, y: 14 },
    bossEnemy: BOSS,
    bossFlag: 'bossDefeated',
    enemyPool: ENEMIES,
    // Once the boss is beaten, its tile becomes a permanent portal down.
    nextMap: { mapId: 'depths', pos: { x: 5, y: 2 } },
  },
  depths: {
    id: 'depths',
    name: 'The Ember Depths',
    grid: DEPTHS_GRID,
    theme: 'depths',
    bossPos: { x: 5, y: 14 },
    bossEnemy: LICH,
    bossFlag: 'lichDefeated',
    enemyPool: DEPTHS_ENEMIES,
    portalPos: { x: 5, y: 1 },
    portalTarget: { mapId: 'overworld', pos: { x: 5, y: 14 } },
  },
};

export const ITEMS = {
  potion: { key: 'potion', name: 'Potion', desc: 'Restores 20 HP', price: 8, heal: 20 },
  ether: { key: 'ether', name: 'Ether', desc: 'Restores 10 MP', price: 10, mp: 10 },
};

export const SKILL_FIREBALL = { name: 'Fireball', mpCost: 5, power: 1.8 };

export const SAVE_KEY = 'emberfall-save-v1';
