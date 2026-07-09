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
  KNIGHT: 7,
  MAGE: 8,
  TAMER: 9,
};

export const WALKABLE = new Set([
  TILE.GRASS, TILE.PATH, TILE.TOWN, TILE.BOSS, TILE.PORTAL, TILE.KNIGHT, TILE.MAGE, TILE.TAMER,
]);
export const ENCOUNTER_TILES = new Set([TILE.GRASS]);

// 12 columns x 16 rows. A single path (col 5) runs from the town at the top
// to the boss lair at the bottom; grass on either side is where random
// encounters happen; water and stray trees just add texture/obstacles. The
// Knight (col 2) and Master Mage (col 9) sit off the path in row 9; the
// Pet Tamer sits at row 11, col 2.
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
  [3, 0, 7, 0, 0, 1, 0, 0, 0, 8, 0, 3],
  [3, 0, 3, 0, 0, 1, 0, 0, 3, 0, 0, 3],
  [3, 0, 9, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 3, 0, 1, 0, 3, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3],
  [3, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 3],
  [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

// Every dungeon level below the overworld reuses the same layout (same
// obstacles, same footprint, no canvas-resize logic needed) but swaps the
// town for a return portal, drops the vendors (they only make sense above
// ground), and re-themes via a different tile palette in map.js.
function makeDungeonGrid() {
  const grid = OVERWORLD_GRID.map((row) => row.slice());
  grid[1][5] = TILE.PORTAL;
  grid[2][5] = TILE.PATH;
  grid[9][2] = TILE.GRASS;
  grid[9][9] = TILE.GRASS;
  grid[11][2] = TILE.GRASS;
  return grid;
}
const DEPTHS_GRID = makeDungeonGrid();
const FROSTREACH_GRID = makeDungeonGrid();
const SPIRE_GRID = makeDungeonGrid();

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

// Both the Knight and the Master Mage teach permanent skills for gold — they
// share one mechanic (spend MP, hit for atk*power - def) so "physical skill"
// vs "spell" is flavor only, not a separate stat.
export const SKILLS = {
  fireball: { key: 'fireball', name: 'Fireball', mpCost: 5, power: 1.8, price: 0, vendor: null },

  // Knight-taught physical skills, cheap/weak to expensive/strong.
  shieldBash: { key: 'shieldBash', name: 'Shield Bash', mpCost: 3, power: 1.8, price: 30, vendor: 'knight' },
  powerStrike: { key: 'powerStrike', name: 'Power Strike', mpCost: 4, power: 2.2, price: 50, vendor: 'knight' },
  piercingThrust: { key: 'piercingThrust', name: 'Piercing Thrust', mpCost: 5, power: 2.4, price: 70, vendor: 'knight' },
  cleave: { key: 'cleave', name: 'Cleave', mpCost: 6, power: 2.6, price: 90, vendor: 'knight' },
  counterStrike: { key: 'counterStrike', name: 'Counter Strike', mpCost: 6, power: 2.5, price: 100, vendor: 'knight' },
  berserkerRage: { key: 'berserkerRage', name: "Berserker's Rage", mpCost: 7, power: 2.8, price: 110, vendor: 'knight' },
  whirlwind: { key: 'whirlwind', name: 'Whirlwind', mpCost: 8, power: 3.0, price: 150, vendor: 'knight' },
  rendingSlash: { key: 'rendingSlash', name: 'Rending Slash', mpCost: 9, power: 3.2, price: 170, vendor: 'knight' },
  earthbreaker: { key: 'earthbreaker', name: 'Earthbreaker', mpCost: 10, power: 3.4, price: 200, vendor: 'knight' },
  bladeStorm: { key: 'bladeStorm', name: 'Blade Storm', mpCost: 12, power: 3.6, price: 240, vendor: 'knight' },
  executionersEdge: { key: 'executionersEdge', name: "Executioner's Edge", mpCost: 14, power: 4.0, price: 300, vendor: 'knight' },
  titansFury: { key: 'titansFury', name: "Titan's Fury", mpCost: 16, power: 4.4, price: 380, vendor: 'knight' },

  // Mage-taught spells, same cheap-to-strong spread.
  spark: { key: 'spark', name: 'Spark', mpCost: 3, power: 1.7, price: 25, vendor: 'mage' },
  iceShard: { key: 'iceShard', name: 'Ice Shard', mpCost: 6, power: 2.0, price: 60, vendor: 'mage' },
  frostBolt: { key: 'frostBolt', name: 'Frost Bolt', mpCost: 5, power: 2.2, price: 65, vendor: 'mage' },
  arcaneMissile: { key: 'arcaneMissile', name: 'Arcane Missile', mpCost: 6, power: 2.5, price: 85, vendor: 'mage' },
  flameWave: { key: 'flameWave', name: 'Flame Wave', mpCost: 7, power: 2.7, price: 105, vendor: 'mage' },
  lightningChain: { key: 'lightningChain', name: 'Lightning Chain', mpCost: 8, power: 2.9, price: 130, vendor: 'mage' },
  thunderbolt: { key: 'thunderbolt', name: 'Thunderbolt', mpCost: 10, power: 2.6, price: 140, vendor: 'mage' },
  voidRay: { key: 'voidRay', name: 'Void Ray', mpCost: 9, power: 3.1, price: 160, vendor: 'mage' },
  meteor: { key: 'meteor', name: 'Meteor', mpCost: 11, power: 3.5, price: 210, vendor: 'mage' },
  blizzard: { key: 'blizzard', name: 'Blizzard', mpCost: 12, power: 3.7, price: 250, vendor: 'mage' },
  hellfire: { key: 'hellfire', name: 'Hellfire', mpCost: 14, power: 4.1, price: 310, vendor: 'mage' },
  starfall: { key: 'starfall', name: 'Starfall', mpCost: 16, power: 4.5, price: 390, vendor: 'mage' },
};

// Pets fight beside the player: each round, an equipped pet automatically
// lands its own hit for atk*power damage right after the player's action,
// no separate HP/AI — just a free extra hit each turn.
export const PETS = {
  wolfPup: { key: 'wolfPup', name: 'Wolf Pup', power: 0.4, price: 80, sprite: 'icons/sprites/wolfpup.png' },
  hawk: { key: 'hawk', name: 'Hawk', power: 0.55, price: 150, sprite: 'icons/sprites/hawk.png' },
  salamander: { key: 'salamander', name: 'Salamander', power: 0.7, price: 250, sprite: 'icons/sprites/salamander.png' },
  babyGolem: { key: 'babyGolem', name: 'Baby Golem', power: 0.9, price: 400, sprite: 'icons/sprites/babygolem.png' },
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
  knownSkills: ['fireball'],
  ownedPets: [],
  activePetKey: null,
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

export const FROSTREACH_ENEMIES = {
  frostGolem: { key: 'frostGolem', name: 'Frost Golem', maxHp: 32, atk: 12, def: 6, xp: 24, goldMin: 18, goldMax: 26, weight: 3, sprite: 'icons/sprites/frostgolem.png' },
  iceSprite: { key: 'iceSprite', name: 'Ice Sprite', maxHp: 20, atk: 11, def: 3, xp: 20, goldMin: 16, goldMax: 22, weight: 4, sprite: 'icons/sprites/icesprite.png' },
};

export const GLACIAL_TITAN = {
  key: 'glacialtitan', name: 'Glacial Titan', maxHp: 135, atk: 18, def: 9, xp: 350, goldMin: 300, goldMax: 300, sprite: 'icons/sprites/glacialtitan.png',
};

export const SPIRE_ENEMIES = {
  wyrmling: { key: 'wyrmling', name: 'Wyrmling', maxHp: 36, atk: 14, def: 6, xp: 30, goldMin: 24, goldMax: 32, weight: 4, sprite: 'icons/sprites/wyrmling.png' },
  drake: { key: 'drake', name: 'Drake', maxHp: 48, atk: 16, def: 8, xp: 38, goldMin: 30, goldMax: 40, weight: 3, sprite: 'icons/sprites/drake.png' },
};

export const ANCIENT_DRAGON = {
  key: 'ancientdragon', name: 'The Ancient Dragon', maxHp: 180, atk: 22, def: 11, xp: 500, goldMin: 500, goldMax: 500, sprite: 'icons/sprites/ancientdragon.png',
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
    nextMap: { mapId: 'frostreach', pos: { x: 5, y: 2 } },
  },
  frostreach: {
    id: 'frostreach',
    name: 'The Frostreach',
    grid: FROSTREACH_GRID,
    theme: 'frostreach',
    bossPos: { x: 5, y: 14 },
    bossEnemy: GLACIAL_TITAN,
    bossFlag: 'titanDefeated',
    enemyPool: FROSTREACH_ENEMIES,
    portalPos: { x: 5, y: 1 },
    portalTarget: { mapId: 'depths', pos: { x: 5, y: 14 } },
    nextMap: { mapId: 'spire', pos: { x: 5, y: 2 } },
  },
  spire: {
    id: 'spire',
    name: "The Dragon's Spire",
    grid: SPIRE_GRID,
    theme: 'spire',
    bossPos: { x: 5, y: 14 },
    bossEnemy: ANCIENT_DRAGON,
    bossFlag: 'dragonDefeated',
    enemyPool: SPIRE_ENEMIES,
    portalPos: { x: 5, y: 1 },
    portalTarget: { mapId: 'frostreach', pos: { x: 5, y: 14 } },
    // No nextMap — defeating the Ancient Dragon is the true ending.
  },
};

export const ITEMS = {
  potion: { key: 'potion', name: 'Potion', desc: 'Restores 20 HP', price: 8, heal: 20 },
  ether: { key: 'ether', name: 'Ether', desc: 'Restores 10 MP', price: 10, mp: 10 },
};

export const SAVE_KEY = 'emberfall-save-v1';
