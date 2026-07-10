// Static game content: base stats, roster, and the zone registry. Zone
// layouts are no longer hand-authored here — they're procedurally generated
// per playthrough by mapgen.js and cached on state.layouts.

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
  ARENA: 10,
  // The portal onward to the next level — placed beside the boss instead of
  // the boss tile itself becoming a portal, so the boss stays a permanent,
  // repeatable fight spot. Sealed (blocked with a toast) until the boss has
  // been beaten at least once, then stays open forever after.
  NEXT_PORTAL: 11,
};

export const WALKABLE = new Set([
  TILE.GRASS, TILE.PATH, TILE.TOWN, TILE.BOSS, TILE.PORTAL, TILE.KNIGHT, TILE.MAGE, TILE.TAMER, TILE.ARENA,
  TILE.NEXT_PORTAL,
]);
export const ENCOUNTER_TILES = new Set([TILE.GRASS]);

export const HERO_SPRITE = 'icons/sprites/hero.png';

export const WEAPONS = {
  rustySword: { key: 'rustySword', name: 'Rusty Sword', atkBonus: 0, price: 0 },
  ironSword: { key: 'ironSword', name: 'Iron Sword', atkBonus: 4, price: 40 },
  steelBlade: { key: 'steelBlade', name: 'Steel Blade', atkBonus: 9, price: 120 },
  mithrilBlade: { key: 'mithrilBlade', name: 'Mithril Blade', atkBonus: 15, price: 220 },
  flameSaber: { key: 'flameSaber', name: 'Flame Saber', atkBonus: 22, price: 340 },
  frostFang: { key: 'frostFang', name: 'Frost Fang', atkBonus: 30, price: 480 },
  thunderAxe: { key: 'thunderAxe', name: 'Thunder Axe', atkBonus: 38, price: 640 },
  voidCleaver: { key: 'voidCleaver', name: 'Void Cleaver', atkBonus: 47, price: 820 },
  dragonfang: { key: 'dragonfang', name: 'Dragonfang', atkBonus: 57, price: 1020 },
  celestialEdge: { key: 'celestialEdge', name: 'Celestial Edge', atkBonus: 70, price: 1300 },
};

export const ARMORS = {
  clothTunic: { key: 'clothTunic', name: 'Cloth Tunic', defBonus: 0, price: 0 },
  leatherArmor: { key: 'leatherArmor', name: 'Leather Armor', defBonus: 3, price: 35 },
  ironPlate: { key: 'ironPlate', name: 'Iron Plate', defBonus: 7, price: 110 },
  steelMail: { key: 'steelMail', name: 'Steel Mail', defBonus: 12, price: 200 },
  mithrilVest: { key: 'mithrilVest', name: 'Mithril Vest', defBonus: 18, price: 320 },
  dragonhideArmor: { key: 'dragonhideArmor', name: 'Dragonhide Armor', defBonus: 25, price: 460 },
  runicPlate: { key: 'runicPlate', name: 'Runic Plate', defBonus: 33, price: 620 },
  shadowweaveCloak: { key: 'shadowweaveCloak', name: 'Shadowweave Cloak', defBonus: 42, price: 800 },
  stormguardArmor: { key: 'stormguardArmor', name: 'Stormguard Armor', defBonus: 52, price: 1000 },
  celestialAegis: { key: 'celestialAegis', name: 'Celestial Aegis', defBonus: 64, price: 1280 },
};

// Tier-ordered key lists so chest gear drops can be anchored to how deep the
// player has traveled (insertion order already runs weak -> strong).
export const WEAPON_ORDER = Object.keys(WEAPONS);
export const ARMOR_ORDER = Object.keys(ARMORS);

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
// no separate HP/AI — just a free extra hit each turn. Ten pets span cheap
// and weak to rare and strong, with the Dragonling as the top-tier prize.
export const PETS = {
  turtle: { key: 'turtle', name: 'Turtle', power: 0.3, price: 60, sprite: 'icons/sprites/turtle.png' },
  wolfPup: { key: 'wolfPup', name: 'Wolf Pup', power: 0.4, price: 80, sprite: 'icons/sprites/wolfpup.png' },
  fox: { key: 'fox', name: 'Fox', power: 0.5, price: 130, sprite: 'icons/sprites/fox.png' },
  hawk: { key: 'hawk', name: 'Hawk', power: 0.55, price: 150, sprite: 'icons/sprites/hawk.png' },
  boar: { key: 'boar', name: 'Boar', power: 0.65, price: 200, sprite: 'icons/sprites/boar.png' },
  salamander: { key: 'salamander', name: 'Salamander', power: 0.7, price: 250, sprite: 'icons/sprites/salamander.png' },
  owl: { key: 'owl', name: 'Owl', power: 0.8, price: 320, sprite: 'icons/sprites/owl.png' },
  babyGolem: { key: 'babyGolem', name: 'Baby Golem', power: 0.9, price: 400, sprite: 'icons/sprites/babygolem.png' },
  panther: { key: 'panther', name: 'Panther', power: 1.0, price: 500, sprite: 'icons/sprites/panther.png' },
  dragonling: { key: 'dragonling', name: 'Dragonling', power: 1.2, price: 650, sprite: 'icons/sprites/dragonling.png' },
};

// Pets earn the exact same XP as the player from every kill they're active
// for, leveling up on the exact same curve (see LEVEL_GROWTH below) — so an
// active pet levels in lockstep with you instead of lagging behind. Each
// level adds a flat bonus to the pet's damage multiplier; no cap, same as
// the player.
export const PET_LEVEL_POWER_BONUS = 0.15;

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
  petProgress: {},
  arenaBestWave: 0,
  inventory: { potion: 3, ether: 0 },
  // Marks an enemy key true the first time it's ever been defeated, so the
  // Bestiary can show which monsters in each level you've already killed.
  bestiary: {},
};

// xpFactor compounds level-to-level below xpFactorCapLevel — this is the
// original curve, unchanged since the game's first build. Beyond that level
// it switches to a flat +xpLinearStep per level instead of continuing to
// compound, since the multiplicative growth was never stress-tested past a
// short 4-zone game and explodes to an ungrindable wall by level ~15 once
// there's 14 zones of content to actually reach.
export const LEVEL_GROWTH = {
  hp: 8, mp: 3, atk: 2, def: 1,
  xpFactor: 1.6, xpFactorCapLevel: 10, xpLinearStep: 500,
};

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

export const SUNKENRUINS_ENEMIES = {
  merfolkRaider: { key: 'merfolkRaider', name: 'Merfolk Raider', maxHp: 40, atk: 15, def: 7, xp: 32, goldMin: 24, goldMax: 32, weight: 4, sprite: 'icons/sprites/merfolkraider.png' },
  reefSerpent: { key: 'reefSerpent', name: 'Reef Serpent', maxHp: 46, atk: 17, def: 8, xp: 38, goldMin: 28, goldMax: 36, weight: 3, sprite: 'icons/sprites/reefserpent.png' },
};
export const DROWNED_QUEEN = {
  key: 'drownedqueen', name: 'The Drowned Queen', maxHp: 220, atk: 24, def: 13, xp: 600, goldMin: 600, goldMax: 600, sprite: 'icons/sprites/drownedqueen.png',
};

export const WHISPERINGWOODS_ENEMIES = {
  thornling: { key: 'thornling', name: 'Thornling', maxHp: 48, atk: 17, def: 8, xp: 38, goldMin: 30, goldMax: 38, weight: 4, sprite: 'icons/sprites/thornling.png' },
  wispMoth: { key: 'wispMoth', name: 'Wisp Moth', maxHp: 42, atk: 19, def: 6, xp: 40, goldMin: 32, goldMax: 40, weight: 3, sprite: 'icons/sprites/wispmoth.png' },
};
export const ELDER_ENT = {
  key: 'elderent', name: 'The Elder Ent', maxHp: 260, atk: 26, def: 14, xp: 680, goldMin: 680, goldMax: 680, sprite: 'icons/sprites/elderent.png',
};

export const SANDSCAR_ENEMIES = {
  dustJackal: { key: 'dustJackal', name: 'Dust Jackal', maxHp: 56, atk: 19, def: 9, xp: 44, goldMin: 36, goldMax: 44, weight: 4, sprite: 'icons/sprites/dustjackal.png' },
  sandViper: { key: 'sandViper', name: 'Sand Viper', maxHp: 52, atk: 21, def: 8, xp: 46, goldMin: 38, goldMax: 46, weight: 3, sprite: 'icons/sprites/sandviper.png' },
};
export const SAND_REAVER = {
  key: 'sandreaver', name: 'The Sand Reaver', maxHp: 300, atk: 28, def: 16, xp: 760, goldMin: 760, goldMax: 760, sprite: 'icons/sprites/sandreaver.png',
};

export const VOLCANIC_ENEMIES = {
  cinderImp: { key: 'cinderImp', name: 'Cinder Imp', maxHp: 62, atk: 21, def: 10, xp: 50, goldMin: 42, goldMax: 50, weight: 4, sprite: 'icons/sprites/cinderimp.png' },
  magmaHound: { key: 'magmaHound', name: 'Magma Hound', maxHp: 68, atk: 23, def: 10, xp: 54, goldMin: 46, goldMax: 54, weight: 3, sprite: 'icons/sprites/magmahound.png' },
};
export const MOLTEN_WYRM = {
  key: 'moltenwyrm', name: 'The Molten Wyrm', maxHp: 340, atk: 30, def: 17, xp: 840, goldMin: 840, goldMax: 840, sprite: 'icons/sprites/moltenwyrm.png',
};

export const SHATTEREDPEAKS_ENEMIES = {
  stormHarpy: { key: 'stormHarpy', name: 'Storm Harpy', maxHp: 70, atk: 23, def: 11, xp: 56, goldMin: 48, goldMax: 56, weight: 4, sprite: 'icons/sprites/stormharpy.png' },
  rockWyvern: { key: 'rockWyvern', name: 'Rock Wyvern', maxHp: 76, atk: 25, def: 12, xp: 60, goldMin: 52, goldMax: 60, weight: 3, sprite: 'icons/sprites/rockwyvern.png' },
};
export const STORMGUARD_TITAN = {
  key: 'stormguardtitan', name: 'The Stormguard Titan', maxHp: 380, atk: 32, def: 19, xp: 920, goldMin: 920, goldMax: 920, sprite: 'icons/sprites/stormguardtitan.png',
};

export const BLIGHTMARSH_ENEMIES = {
  bogLeech: { key: 'bogLeech', name: 'Bog Leech', maxHp: 78, atk: 25, def: 12, xp: 62, goldMin: 54, goldMax: 62, weight: 4, sprite: 'icons/sprites/bogleech.png' },
  plagueRat: { key: 'plagueRat', name: 'Plague Rat', maxHp: 72, atk: 27, def: 11, xp: 64, goldMin: 56, goldMax: 64, weight: 3, sprite: 'icons/sprites/plaguerat.png' },
};
export const ROTLORD = {
  key: 'rotlord', name: 'The Rotlord', maxHp: 420, atk: 34, def: 20, xp: 1000, goldMin: 1000, goldMax: 1000, sprite: 'icons/sprites/rotlord.png',
};

export const CRYSTALCAVERNS_ENEMIES = {
  crystalStalker: { key: 'crystalStalker', name: 'Crystal Stalker', maxHp: 86, atk: 27, def: 14, xp: 68, goldMin: 60, goldMax: 68, weight: 4, sprite: 'icons/sprites/crystalstalker.png' },
  gemOoze: { key: 'gemOoze', name: 'Gem Ooze', maxHp: 92, atk: 29, def: 13, xp: 72, goldMin: 64, goldMax: 72, weight: 3, sprite: 'icons/sprites/gemooze.png' },
};
export const PRISM_COLOSSUS = {
  key: 'prismcolossus', name: 'The Prism Colossus', maxHp: 460, atk: 36, def: 22, xp: 1080, goldMin: 1080, goldMax: 1080, sprite: 'icons/sprites/prismcolossus.png',
};

export const SHADOWFEN_ENEMIES = {
  shadeStalker: { key: 'shadeStalker', name: 'Shade Stalker', maxHp: 94, atk: 29, def: 15, xp: 74, goldMin: 66, goldMax: 74, weight: 4, sprite: 'icons/sprites/shadestalker.png' },
  nightmareHound: { key: 'nightmareHound', name: 'Nightmare Hound', maxHp: 100, atk: 31, def: 14, xp: 78, goldMin: 70, goldMax: 78, weight: 3, sprite: 'icons/sprites/nightmarehound.png' },
};
export const NIGHTMARE_DRAKE = {
  key: 'nightmaredrake', name: 'The Nightmare Drake', maxHp: 500, atk: 38, def: 23, xp: 1160, goldMin: 1160, goldMax: 1160, sprite: 'icons/sprites/nightmaredrake.png',
};

export const CELESTIAL_ENEMIES = {
  starWisp: { key: 'starWisp', name: 'Star Wisp', maxHp: 102, atk: 31, def: 16, xp: 80, goldMin: 72, goldMax: 80, weight: 4, sprite: 'icons/sprites/starwisp.png' },
  cloudSerpent: { key: 'cloudSerpent', name: 'Cloud Serpent', maxHp: 108, atk: 33, def: 16, xp: 84, goldMin: 76, goldMax: 84, weight: 3, sprite: 'icons/sprites/cloudserpent.png' },
};
export const ASTRAL_GUARDIAN = {
  key: 'astralguardian', name: 'The Astral Guardian', maxHp: 540, atk: 40, def: 25, xp: 1240, goldMin: 1240, goldMax: 1240, sprite: 'icons/sprites/astralguardian.png',
};

export const VOIDRIFT_ENEMIES = {
  voidSpawn: { key: 'voidSpawn', name: 'Void Spawn', maxHp: 116, atk: 34, def: 17, xp: 90, goldMin: 80, goldMax: 90, weight: 4, sprite: 'icons/sprites/voidspawn.png' },
  chaosHound: { key: 'chaosHound', name: 'Chaos Hound', maxHp: 122, atk: 36, def: 18, xp: 96, goldMin: 84, goldMax: 94, weight: 3, sprite: 'icons/sprites/chaoshound.png' },
};
export const WORLD_SERPENT = {
  key: 'worldserpent', name: 'The World Serpent', maxHp: 640, atk: 45, def: 28, xp: 1600, goldMin: 1600, goldMax: 1600, sprite: 'icons/sprites/worldserpent.png',
};

export const ASHENWASTES_ENEMIES = {
  ashWraith: { key: 'ashWraith', name: 'Ash Wraith', maxHp: 130, atk: 37, def: 19, xp: 100, goldMin: 90, goldMax: 100, weight: 4, sprite: 'icons/sprites/ashwraith.png' },
  cinderGolem: { key: 'cinderGolem', name: 'Cinder Golem', maxHp: 140, atk: 39, def: 20, xp: 108, goldMin: 94, goldMax: 104, weight: 3, sprite: 'icons/sprites/cindergolem.png' },
};
export const ASHLORD = {
  key: 'ashlord', name: 'The Ashlord', maxHp: 700, atk: 48, def: 30, xp: 1750, goldMin: 1750, goldMax: 1750, sprite: 'icons/sprites/ashlord.png',
};

export const STORMCITADEL_ENEMIES = {
  thunderHawk: { key: 'thunderHawk', name: 'Thunder Hawk', maxHp: 145, atk: 40, def: 21, xp: 112, goldMin: 100, goldMax: 110, weight: 4, sprite: 'icons/sprites/thunderhawk.png' },
  stormElemental: { key: 'stormElemental', name: 'Storm Elemental', maxHp: 155, atk: 42, def: 22, xp: 120, goldMin: 104, goldMax: 114, weight: 3, sprite: 'icons/sprites/stormelemental.png' },
};
export const TEMPEST_KING = {
  key: 'tempestking', name: 'The Tempest King', maxHp: 760, atk: 51, def: 32, xp: 1900, goldMin: 1900, goldMax: 1900, sprite: 'icons/sprites/tempestking.png',
};

export const BONEWASTES_ENEMIES = {
  boneReaper: { key: 'boneReaper', name: 'Bone Reaper', maxHp: 160, atk: 43, def: 23, xp: 124, goldMin: 112, goldMax: 122, weight: 4, sprite: 'icons/sprites/bonereaper.png' },
  wraithSerpent: { key: 'wraithSerpent', name: 'Wraith Serpent', maxHp: 170, atk: 45, def: 24, xp: 132, goldMin: 116, goldMax: 126, weight: 3, sprite: 'icons/sprites/wraithserpent.png' },
};
export const BONE_EMPEROR = {
  key: 'boneemperor', name: 'The Bone Emperor', maxHp: 820, atk: 54, def: 34, xp: 2050, goldMin: 2050, goldMax: 2050, sprite: 'icons/sprites/boneemperor.png',
};

export const CHAOSRIFT_ENEMIES = {
  chaosSpawn: { key: 'chaosSpawn', name: 'Chaos Spawn', maxHp: 175, atk: 46, def: 25, xp: 136, goldMin: 124, goldMax: 134, weight: 4, sprite: 'icons/sprites/chaosspawn.png' },
  voidHound: { key: 'voidHound', name: 'Void Hound', maxHp: 185, atk: 48, def: 26, xp: 144, goldMin: 128, goldMax: 138, weight: 3, sprite: 'icons/sprites/voidhound.png' },
};
export const CHAOS_HARBINGER = {
  key: 'chaosharbinger', name: 'The Chaos Harbinger', maxHp: 880, atk: 57, def: 36, xp: 2200, goldMin: 2200, goldMax: 2200, sprite: 'icons/sprites/chaosharbinger.png',
};

export const THRONEOFETERNITY_ENEMIES = {
  eternalGuardian: { key: 'eternalGuardian', name: 'Eternal Guardian', maxHp: 190, atk: 49, def: 27, xp: 148, goldMin: 136, goldMax: 146, weight: 4, sprite: 'icons/sprites/eternalguardian.png' },
  timelessWraith: { key: 'timelessWraith', name: 'Timeless Wraith', maxHp: 200, atk: 51, def: 28, xp: 156, goldMin: 140, goldMax: 150, weight: 3, sprite: 'icons/sprites/timelesswraith.png' },
};
export const ETERNAL_SOVEREIGN = {
  key: 'eternalsovereign', name: 'The Eternal Sovereign', maxHp: 1000, atk: 62, def: 40, xp: 3000, goldMin: 3000, goldMax: 3000, sprite: 'icons/sprites/eternalsovereign.png',
};

// Registry driving movement/rendering/encounters per zone (map.js, battle.js,
// ui.js all key off state.mapId instead of hardcoding a single map). Layouts
// are no longer stored here — mapgen.js procedurally builds a fresh grid for
// each zone, cached on state.layouts. `nextMap` is the only chain link: it's
// what opens (and where) once a level's boss is defeated. Every level's own
// entry portal always leads straight back to Town, and Town's exit always
// leads back to whichever level you're currently in — both resolved
// dynamically in map.js/tryMove rather than a fixed field here.
export const MAPS = {
  // Town is a fixed, always-safe hub — no enemyPool/bossEnemy at all, so
  // encounters and boss logic simply never trigger here.
  town: {
    id: 'town', name: 'Emberfall', theme: 'town',
  },
  overworld: {
    id: 'overworld', name: 'The Emberfall Outskirts', theme: 'overworld', depth: 0,
    bossEnemy: BOSS, bossFlag: 'bossDefeated', enemyPool: ENEMIES,
    nextMap: { mapId: 'depths' },
  },
  depths: {
    id: 'depths', name: 'The Ember Depths', theme: 'depths', depth: 1,
    bossEnemy: LICH, bossFlag: 'lichDefeated', enemyPool: DEPTHS_ENEMIES,
    nextMap: { mapId: 'frostreach' },
  },
  frostreach: {
    id: 'frostreach', name: 'The Frostreach', theme: 'frostreach', depth: 2,
    bossEnemy: GLACIAL_TITAN, bossFlag: 'titanDefeated', enemyPool: FROSTREACH_ENEMIES,
    nextMap: { mapId: 'spire' },
  },
  spire: {
    id: 'spire', name: "The Dragon's Spire", theme: 'spire', depth: 3,
    bossEnemy: ANCIENT_DRAGON, bossFlag: 'dragonDefeated', enemyPool: SPIRE_ENEMIES,
    nextMap: { mapId: 'sunkenruins' },
  },
  sunkenruins: {
    id: 'sunkenruins', name: 'The Sunken Ruins', theme: 'sunkenruins', depth: 4,
    bossEnemy: DROWNED_QUEEN, bossFlag: 'drownedQueenDefeated', enemyPool: SUNKENRUINS_ENEMIES,
    nextMap: { mapId: 'whisperingwoods' },
  },
  whisperingwoods: {
    id: 'whisperingwoods', name: 'The Whispering Woods', theme: 'whisperingwoods', depth: 5,
    bossEnemy: ELDER_ENT, bossFlag: 'elderEntDefeated', enemyPool: WHISPERINGWOODS_ENEMIES,
    nextMap: { mapId: 'sandscar' },
  },
  sandscar: {
    id: 'sandscar', name: 'The Sandscar Wastes', theme: 'sandscar', depth: 6,
    bossEnemy: SAND_REAVER, bossFlag: 'sandReaverDefeated', enemyPool: SANDSCAR_ENEMIES,
    nextMap: { mapId: 'volcanic' },
  },
  volcanic: {
    id: 'volcanic', name: 'The Volcanic Depths', theme: 'volcanic', depth: 7,
    bossEnemy: MOLTEN_WYRM, bossFlag: 'moltenWyrmDefeated', enemyPool: VOLCANIC_ENEMIES,
    nextMap: { mapId: 'shatteredpeaks' },
  },
  shatteredpeaks: {
    id: 'shatteredpeaks', name: 'The Shattered Peaks', theme: 'shatteredpeaks', depth: 8,
    bossEnemy: STORMGUARD_TITAN, bossFlag: 'stormguardTitanDefeated', enemyPool: SHATTEREDPEAKS_ENEMIES,
    nextMap: { mapId: 'blightmarsh' },
  },
  blightmarsh: {
    id: 'blightmarsh', name: 'The Blightmarsh', theme: 'blightmarsh', depth: 9,
    bossEnemy: ROTLORD, bossFlag: 'rotlordDefeated', enemyPool: BLIGHTMARSH_ENEMIES,
    nextMap: { mapId: 'crystalcaverns' },
  },
  crystalcaverns: {
    id: 'crystalcaverns', name: 'The Crystal Caverns', theme: 'crystalcaverns', depth: 10,
    bossEnemy: PRISM_COLOSSUS, bossFlag: 'prismColossusDefeated', enemyPool: CRYSTALCAVERNS_ENEMIES,
    nextMap: { mapId: 'shadowfen' },
  },
  shadowfen: {
    id: 'shadowfen', name: 'The Shadowfen', theme: 'shadowfen', depth: 11,
    bossEnemy: NIGHTMARE_DRAKE, bossFlag: 'nightmareDrakeDefeated', enemyPool: SHADOWFEN_ENEMIES,
    nextMap: { mapId: 'celestial' },
  },
  celestial: {
    id: 'celestial', name: 'The Celestial Spire', theme: 'celestial', depth: 12,
    bossEnemy: ASTRAL_GUARDIAN, bossFlag: 'astralGuardianDefeated', enemyPool: CELESTIAL_ENEMIES,
    nextMap: { mapId: 'voidrift' },
  },
  voidrift: {
    id: 'voidrift', name: 'The Void Rift', theme: 'voidrift', depth: 13,
    bossEnemy: WORLD_SERPENT, bossFlag: 'worldSerpentDefeated', enemyPool: VOIDRIFT_ENEMIES,
    nextMap: { mapId: 'ashenwastes' },
  },
  ashenwastes: {
    id: 'ashenwastes', name: 'The Ashen Wastes', theme: 'ashenwastes', depth: 14,
    bossEnemy: ASHLORD, bossFlag: 'ashlordDefeated', enemyPool: ASHENWASTES_ENEMIES,
    nextMap: { mapId: 'stormcitadel' },
  },
  stormcitadel: {
    id: 'stormcitadel', name: 'The Storm Citadel', theme: 'stormcitadel', depth: 15,
    bossEnemy: TEMPEST_KING, bossFlag: 'tempestKingDefeated', enemyPool: STORMCITADEL_ENEMIES,
    nextMap: { mapId: 'bonewastes' },
  },
  bonewastes: {
    id: 'bonewastes', name: 'The Bone Wastes', theme: 'bonewastes', depth: 16,
    bossEnemy: BONE_EMPEROR, bossFlag: 'boneEmperorDefeated', enemyPool: BONEWASTES_ENEMIES,
    nextMap: { mapId: 'chaosrift' },
  },
  chaosrift: {
    id: 'chaosrift', name: 'The Chaos Rift', theme: 'chaosrift', depth: 17,
    bossEnemy: CHAOS_HARBINGER, bossFlag: 'chaosHarbingerDefeated', enemyPool: CHAOSRIFT_ENEMIES,
    nextMap: { mapId: 'throneofeternity' },
  },
  throneofeternity: {
    id: 'throneofeternity', name: 'The Throne of Eternity', theme: 'throneofeternity', depth: 18,
    bossEnemy: ETERNAL_SOVEREIGN, bossFlag: 'eternalSovereignDefeated', enemyPool: THRONEOFETERNITY_ENEMIES,
    // No nextMap — defeating the Eternal Sovereign is the true ending.
  },
};

// The level chain in progression order (Town excluded), derived by walking
// nextMap links from the outskirts — used for the Travel menu and Bestiary
// so both always match the real unlock order without hand-maintaining a list.
export const LEVEL_CHAIN = (() => {
  const order = [];
  let cur = 'overworld';
  while (cur) {
    order.push(cur);
    cur = MAPS[cur].nextMap ? MAPS[cur].nextMap.mapId : null;
  }
  return order;
})();

export const ITEMS = {
  potion: { key: 'potion', name: 'Potion', desc: 'Restores 20 HP', price: 8, heal: 20 },
  ether: { key: 'ether', name: 'Ether', desc: 'Restores 10 MP', price: 10, mp: 10 },
  townScroll: { key: 'townScroll', name: 'Town Scroll', desc: 'Teleports you back to town', price: 25 },
};

export const SAVE_KEY = 'emberfall-save-v1';
