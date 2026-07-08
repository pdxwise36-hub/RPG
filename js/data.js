// Static game content: base stats, roster, items, and the overworld layout.
// Nothing here mutates at runtime — state.js clones what it needs.

export const TILE = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  TREE: 3,
  TOWN: 4,
  BOSS: 5,
};

export const WALKABLE = new Set([TILE.GRASS, TILE.PATH, TILE.TOWN, TILE.BOSS]);
export const ENCOUNTER_TILES = new Set([TILE.GRASS]);

// 12 columns x 16 rows. A single path (col 5) runs from the town at the top
// to the boss lair at the bottom; grass on either side is where random
// encounters happen; water and stray trees just add texture/obstacles.
export const MAP = [
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

export const START_POS = { x: 5, y: 3 };
export const TOWN_POS = { x: 5, y: 2 };
export const BOSS_POS = { x: 5, y: 14 };

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

export const ITEMS = {
  potion: { key: 'potion', name: 'Potion', desc: 'Restores 20 HP', price: 8, heal: 20 },
  ether: { key: 'ether', name: 'Ether', desc: 'Restores 10 MP', price: 10, mp: 10 },
};

export const SKILL_FIREBALL = { name: 'Fireball', mpCost: 5, power: 1.8 };

export const SAVE_KEY = 'emberfall-save-v1';
