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
  BOSSRUSH: 12,
  IDENTIFIER: 13,
  RIVAL: 14,
};

export const WALKABLE = new Set([
  TILE.GRASS, TILE.PATH, TILE.TOWN, TILE.BOSS, TILE.PORTAL, TILE.KNIGHT, TILE.MAGE, TILE.TAMER, TILE.ARENA,
  TILE.NEXT_PORTAL, TILE.BOSSRUSH, TILE.IDENTIFIER, TILE.RIVAL,
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

// Helmets, Gloves, and Boots don't add flat ATK/DEF like weapons/armor do —
// each slot has its own unique mechanic instead, applied in battle.js:
// helmets cut skill MP costs and boost XP gain, gloves add a chance to
// crit for double damage, boots add a chance to dodge an attack entirely
// and boost gold found. Same 10-tier weak-to-strong spread and price curve
// as Armor (they're all "gear you find and wear," just different slots).
export const HELMETS = {
  clothCap: { key: 'clothCap', name: 'Cloth Cap', mpCostReduction: 0, xpBonusPercent: 0, price: 0 },
  leatherCap: { key: 'leatherCap', name: 'Leather Cap', mpCostReduction: 4, xpBonusPercent: 2, price: 35 },
  ironHelm: { key: 'ironHelm', name: 'Iron Helm', mpCostReduction: 8, xpBonusPercent: 4, price: 110 },
  steelHelm: { key: 'steelHelm', name: 'Steel Helm', mpCostReduction: 12, xpBonusPercent: 6, price: 200 },
  mithrilCirclet: { key: 'mithrilCirclet', name: 'Mithril Circlet', mpCostReduction: 16, xpBonusPercent: 8, price: 320 },
  flameguardHelm: { key: 'flameguardHelm', name: 'Flameguard Helm', mpCostReduction: 20, xpBonusPercent: 10, price: 460 },
  frostcrown: { key: 'frostcrown', name: 'Frostcrown', mpCostReduction: 25, xpBonusPercent: 12, price: 620 },
  thunderHelm: { key: 'thunderHelm', name: 'Thunder Helm', mpCostReduction: 30, xpBonusPercent: 14, price: 800 },
  voidsightHelm: { key: 'voidsightHelm', name: 'Voidsight Helm', mpCostReduction: 35, xpBonusPercent: 17, price: 1000 },
  celestialCrown: { key: 'celestialCrown', name: 'Celestial Crown', mpCostReduction: 40, xpBonusPercent: 20, price: 1280 },
};

export const GLOVES = {
  clothWraps: { key: 'clothWraps', name: 'Cloth Wraps', critChance: 0, price: 0 },
  leatherGloves: { key: 'leatherGloves', name: 'Leather Gloves', critChance: 3, price: 35 },
  ironGauntlets: { key: 'ironGauntlets', name: 'Iron Gauntlets', critChance: 6, price: 110 },
  steelGauntlets: { key: 'steelGauntlets', name: 'Steel Gauntlets', critChance: 9, price: 200 },
  mithrilGrips: { key: 'mithrilGrips', name: 'Mithril Grips', critChance: 12, price: 320 },
  flameforgedGloves: { key: 'flameforgedGloves', name: 'Flameforged Gloves', critChance: 15, price: 460 },
  frostbiteGloves: { key: 'frostbiteGloves', name: 'Frostbite Gloves', critChance: 18, price: 620 },
  thunderstrikeGauntlets: { key: 'thunderstrikeGauntlets', name: 'Thunderstrike Gauntlets', critChance: 21, price: 800 },
  voidtouchedGloves: { key: 'voidtouchedGloves', name: 'Voidtouched Gloves', critChance: 25, price: 1000 },
  celestialGauntlets: { key: 'celestialGauntlets', name: 'Celestial Gauntlets', critChance: 30, price: 1280 },
};

export const BOOTS = {
  wornSandals: { key: 'wornSandals', name: 'Worn Sandals', dodgeChance: 0, goldBonusPercent: 0, price: 0 },
  leatherBoots: { key: 'leatherBoots', name: 'Leather Boots', dodgeChance: 2, goldBonusPercent: 2, price: 35 },
  ironGreaves: { key: 'ironGreaves', name: 'Iron Greaves', dodgeChance: 4, goldBonusPercent: 4, price: 110 },
  steelBoots: { key: 'steelBoots', name: 'Steel Boots', dodgeChance: 6, goldBonusPercent: 6, price: 200 },
  mithrilStriders: { key: 'mithrilStriders', name: 'Mithril Striders', dodgeChance: 8, goldBonusPercent: 8, price: 320 },
  flamewalkers: { key: 'flamewalkers', name: 'Flamewalkers', dodgeChance: 10, goldBonusPercent: 10, price: 460 },
  frostwalkers: { key: 'frostwalkers', name: 'Frostwalkers', dodgeChance: 12, goldBonusPercent: 12, price: 620 },
  thunderstepBoots: { key: 'thunderstepBoots', name: 'Thunderstep Boots', dodgeChance: 14, goldBonusPercent: 14, price: 800 },
  voidwalkers: { key: 'voidwalkers', name: 'Voidwalkers', dodgeChance: 17, goldBonusPercent: 17, price: 1000 },
  celestialStriders: { key: 'celestialStriders', name: 'Celestial Striders', dodgeChance: 20, goldBonusPercent: 20, price: 1280 },
};

// Icon art per piece — one shared silhouette template recolored per tier
// (see scripts/gen-sprites.js), used by the Armory, Enchant, and Inventory.
Object.values(WEAPONS).forEach((w) => { w.sprite = `icons/sprites/wpn-${w.key}.png`; });
Object.values(ARMORS).forEach((a) => { a.sprite = `icons/sprites/arm-${a.key}.png`; });
Object.values(HELMETS).forEach((h) => { h.sprite = `icons/sprites/hlm-${h.key}.png`; });
Object.values(GLOVES).forEach((g) => { g.sprite = `icons/sprites/glv-${g.key}.png`; });
Object.values(BOOTS).forEach((b) => { b.sprite = `icons/sprites/bts-${b.key}.png`; });

// Tier-ordered key lists so chest gear drops can be anchored to how deep the
// player has traveled (insertion order already runs weak -> strong).
export const WEAPON_ORDER = Object.keys(WEAPONS);
export const ARMOR_ORDER = Object.keys(ARMORS);
export const HELMET_ORDER = Object.keys(HELMETS);
export const GLOVES_ORDER = Object.keys(GLOVES);
export const BOOTS_ORDER = Object.keys(BOOTS);

// One place to look up "the registry/order/owned-list/equipped-key field for
// this equipment slot" — every piece of UI that lists or equips gear (the
// Armory, the Inventory paper doll, chest reveals, achievements) reads
// through this instead of hand-rolling a weapon/armor ternary per site, so
// adding a future slot (ring, amulet, shield...) only means adding one more
// entry here.
export const GEAR_SLOTS = {
  weapon: { registry: WEAPONS, order: WEAPON_ORDER, ownedField: 'ownedWeapons', equipField: 'weaponKey', label: 'Weapon' },
  armor: { registry: ARMORS, order: ARMOR_ORDER, ownedField: 'ownedArmors', equipField: 'armorKey', label: 'Armor' },
  helmet: { registry: HELMETS, order: HELMET_ORDER, ownedField: 'ownedHelmets', equipField: 'helmKey', label: 'Helmet' },
  gloves: { registry: GLOVES, order: GLOVES_ORDER, ownedField: 'ownedGloves', equipField: 'glovesKey', label: 'Gloves' },
  boots: { registry: BOOTS, order: BOOTS_ORDER, ownedField: 'ownedBoots', equipField: 'bootsKey', label: 'Boots' },
};

// Six 5-piece sets (one item per equipment slot), each with a single clear
// purpose rather than one do-everything set — every set has value from the
// moment you have 2 pieces on, not just at a full 5/5, via `thresholds`:
// each key is a worn-piece-count and its value is the CUMULATIVE bonus at
// that count (not a delta), so equipping a 4th piece is a strict upgrade
// over 3. Pieces are drawn from existing gear tiers (no new items needed)
// — a set's own name/theme is what ties its 5 otherwise-differently-named
// pieces together, called out via setForPiece() in the Armory/Inventory.
export const SET_BONUSES = [
  {
    key: 'celestialSet', name: 'Celestial Radiance', desc: 'Makes you personally stronger in a fight.',
    pieces: { weapon: 'celestialEdge', armor: 'celestialAegis', helmet: 'celestialCrown', gloves: 'celestialGauntlets', boots: 'celestialStriders' },
    thresholds: {
      2: { atk: 6, def: 6 },
      3: { atk: 10, def: 10, critChance: 4 },
      4: { atk: 15, def: 15, critChance: 7, dodgeChance: 7 },
      5: { atk: 22, def: 22, critChance: 12, dodgeChance: 12 },
    },
  },
  {
    key: 'beastmasterSet', name: "Beastmaster's Regalia", desc: 'Makes your active companion stronger.',
    pieces: { weapon: 'frostFang', armor: 'dragonhideArmor', helmet: 'flameguardHelm', gloves: 'flameforgedGloves', boots: 'flamewalkers' },
    thresholds: {
      2: { petPowerBonus: 8 },
      3: { petPowerBonus: 14 },
      4: { petPowerBonus: 22 },
      5: { petPowerBonus: 32 },
    },
  },
  {
    key: 'sageSet', name: "Sage's Vestments", desc: 'Boosts XP gained, so you level up faster.',
    pieces: { weapon: 'thunderAxe', armor: 'runicPlate', helmet: 'frostcrown', gloves: 'frostbiteGloves', boots: 'frostwalkers' },
    thresholds: {
      2: { xpBonusPercent: 8 },
      3: { xpBonusPercent: 14 },
      4: { xpBonusPercent: 22 },
      5: { xpBonusPercent: 32 },
    },
  },
  {
    key: 'fortuneHunterSet', name: "Fortune Hunter's Garb", desc: 'Raises the odds of finding a chest after a win.',
    pieces: { weapon: 'mithrilBlade', armor: 'steelMail', helmet: 'steelHelm', gloves: 'steelGauntlets', boots: 'steelBoots' },
    thresholds: {
      2: { itemFindBonus: 5 },
      3: { itemFindBonus: 9 },
      4: { itemFindBonus: 14 },
      5: { itemFindBonus: 20 },
    },
  },
  {
    key: 'prospectorSet', name: "Prospector's Gear", desc: 'Boosts gold found from every source.',
    pieces: { weapon: 'steelBlade', armor: 'ironPlate', helmet: 'ironHelm', gloves: 'ironGauntlets', boots: 'ironGreaves' },
    thresholds: {
      2: { goldBonusPercent: 8 },
      3: { goldBonusPercent: 14 },
      4: { goldBonusPercent: 22 },
      5: { goldBonusPercent: 32 },
    },
  },
  {
    key: 'battlemageSet', name: "Battlemage's Focus", desc: 'Cuts Skill MP cost and boosts Skill damage.',
    pieces: { weapon: 'ironSword', armor: 'leatherArmor', helmet: 'leatherCap', gloves: 'leatherGloves', boots: 'leatherBoots' },
    thresholds: {
      2: { mpCostReduction: 5 },
      3: { mpCostReduction: 8, skillPowerBonus: 5 },
      4: { mpCostReduction: 12, skillPowerBonus: 9 },
      5: { mpCostReduction: 18, skillPowerBonus: 15 },
    },
  },
];

const PIECE_TO_SET = {};
SET_BONUSES.forEach((set) => {
  Object.values(set.pieces).forEach((key) => { PIECE_TO_SET[key] = set; });
});
export function setForPiece(key) {
  return PIECE_TO_SET[key] || null;
}

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

// Canonical price/tier order — p.ownedWeapons/ownedArmors/knownSkills grow
// in whatever order things were bought/found/learned, so anywhere that
// lists owned gear or known skills should sort through these instead of
// iterating the array as-is.
export const SKILL_ORDER = Object.keys(SKILLS);

// Each vendor's 12 skills split into two 6-skill branches — a genuine
// choice of path rather than one long line, without needing a full graph
// editor: each branch is its own straight chain (skill N requires skill
// N-1 already known, in the SAME branch only), gated additionally by
// character level per tier. fireball sits outside the tree entirely as the
// innate starting skill.
export const SKILL_TREES = {
  knight: {
    vendor: 'knight',
    branches: {
      guardian: { name: "Guardian's Path", skills: ['shieldBash', 'piercingThrust', 'counterStrike', 'whirlwind', 'earthbreaker', 'executionersEdge'] },
      warlord: { name: "Warlord's Path", skills: ['powerStrike', 'cleave', 'berserkerRage', 'rendingSlash', 'bladeStorm', 'titansFury'] },
    },
  },
  mage: {
    vendor: 'mage',
    branches: {
      frostfire: { name: 'Frostfire Path', skills: ['spark', 'frostBolt', 'flameWave', 'thunderbolt', 'meteor', 'hellfire'] },
      storm: { name: "Stormcaller's Path", skills: ['iceShard', 'arcaneMissile', 'lightningChain', 'voidRay', 'blizzard', 'starfall'] },
    },
  },
};
export const SKILL_TREE_LEVEL_REQS = [1, 5, 10, 15, 20, 28];

const SKILL_TREE_INFO = {};
Object.values(SKILL_TREES).forEach((tree) => {
  Object.values(tree.branches).forEach((branch) => {
    branch.skills.forEach((skillKey, i) => {
      SKILL_TREE_INFO[skillKey] = {
        branchName: branch.name,
        tierIndex: i,
        prereqKey: i > 0 ? branch.skills[i - 1] : null,
        levelReq: SKILL_TREE_LEVEL_REQS[i],
      };
    });
  });
});
export function skillTreeInfo(skillKey) {
  return SKILL_TREE_INFO[skillKey] || null;
}

// Every companion — Tamer-bought or wild-caught — learns one passive
// ability once it reaches COMPANION_ABILITY_LEVEL, sourced from this small
// shared pool instead of 49 hand-authored bespoke abilities. Each reuses an
// existing player-facing mechanic (crit/dodge/lifesteal/gold+xp/damage
// reduction) so the payoff is just "apply the same formula, sourced from
// the active companion" rather than a new combat subsystem.
export const COMPANION_ABILITIES = {
  vampiric: { key: 'vampiric', name: 'Vampiric', desc: "Heals you for a % of the pet's hit damage.", value: 15 },
  guardian: { key: 'guardian', name: 'Guardian', desc: 'Reduces incoming damage by a %.', value: 12 },
  berserker: { key: 'berserker', name: 'Berserker', desc: 'Adds to your own crit chance.', value: 15 },
  swift: { key: 'swift', name: 'Swift', desc: 'Adds to your own dodge chance.', value: 12 },
  blessed: { key: 'blessed', name: 'Blessed', desc: 'Boosts gold and XP found.', value: 12 },
};
export const COMPANION_ABILITY_LEVEL = 10;

// A companion "evolves" once it reaches this level: a flat damage
// multiplier, a name change (see petDisplayName in state.js), and a visual
// glow — reusing the pet's existing sprite rather than commissioning a
// second bespoke piece of art per companion.
export const PET_EVOLVE_LEVEL = 15;
export const PET_EVOLVE_MULTIPLIER = 1.3;

// Pets fight beside the player: each round, an equipped pet automatically
// lands its own hit for atk*power damage right after the player's action,
// no separate HP/AI — just a free extra hit each turn. Ten pets span cheap
// and weak to rare and strong, with the Dragonling as the top-tier prize.
// Each also carries a hand-picked `ability` (see COMPANION_ABILITIES above).
export const PETS = {
  turtle: { key: 'turtle', name: 'Turtle', power: 0.3, price: 60, sprite: 'icons/sprites/turtle.png', ability: 'guardian' },
  wolfPup: { key: 'wolfPup', name: 'Wolf Pup', power: 0.4, price: 80, sprite: 'icons/sprites/wolfpup.png', ability: 'berserker' },
  fox: { key: 'fox', name: 'Fox', power: 0.5, price: 130, sprite: 'icons/sprites/fox.png', ability: 'swift' },
  hawk: { key: 'hawk', name: 'Hawk', power: 0.55, price: 150, sprite: 'icons/sprites/hawk.png', ability: 'blessed' },
  boar: { key: 'boar', name: 'Boar', power: 0.65, price: 200, sprite: 'icons/sprites/boar.png', ability: 'berserker' },
  salamander: { key: 'salamander', name: 'Salamander', power: 0.7, price: 250, sprite: 'icons/sprites/salamander.png', ability: 'vampiric' },
  owl: { key: 'owl', name: 'Owl', power: 0.8, price: 320, sprite: 'icons/sprites/owl.png', ability: 'blessed' },
  babyGolem: { key: 'babyGolem', name: 'Baby Golem', power: 0.9, price: 400, sprite: 'icons/sprites/babygolem.png', ability: 'guardian' },
  panther: { key: 'panther', name: 'Panther', power: 1.0, price: 500, sprite: 'icons/sprites/panther.png', ability: 'berserker' },
  dragonling: { key: 'dragonling', name: 'Dragonling', power: 1.2, price: 650, sprite: 'icons/sprites/dragonling.png', ability: 'vampiric' },
};

// Pets earn the exact same XP as the player from every kill they're active
// for, leveling up on the exact same curve (see LEVEL_GROWTH below) — so an
// active pet levels in lockstep with you instead of lagging behind. Each
// level adds a flat bonus to the pet's damage multiplier; no cap, same as
// the player.
export const PET_LEVEL_POWER_BONUS = 0.15;

// A small chance for a companion to come out "Shiny" the moment it's first
// acquired (captured or adopted) — permanent once rolled, a flat power
// bonus and a distinct glow (see .pet-shiny in style.css) alongside — not
// instead of — the Evolved state, which is purely level-based.
export const SHINY_CHANCE = 0.05;
export const SHINY_POWER_MULTIPLIER = 1.15;

// A single equippable trinket that boosts whichever companion is currently
// active — found only in chests, never sold, so unlike the player's own
// gear there's no Buy flow, just Equip. Ten tiers, same price-curve shape
// as the rest of the game's gear (used only to anchor chest depth-scaling,
// not to charge gold). `none` is always owned so there's always something
// equipped, even if it does nothing yet.
export const CHARMS = {
  none: { key: 'none', name: 'No Charm', petPowerBonus: 0 },
  frayedCharm: { key: 'frayedCharm', name: 'Frayed Charm', petPowerBonus: 5 },
  carvedCharm: { key: 'carvedCharm', name: 'Carved Charm', petPowerBonus: 10 },
  ironCharm: { key: 'ironCharm', name: 'Iron Charm', petPowerBonus: 16 },
  steelCharm: { key: 'steelCharm', name: 'Steel Charm', petPowerBonus: 22 },
  mithrilCharm: { key: 'mithrilCharm', name: 'Mithril Charm', petPowerBonus: 28 },
  flameforgedCharm: { key: 'flameforgedCharm', name: 'Flameforged Charm', petPowerBonus: 35 },
  frostboundCharm: { key: 'frostboundCharm', name: 'Frostbound Charm', petPowerBonus: 42 },
  thunderCharm: { key: 'thunderCharm', name: 'Thunder Charm', petPowerBonus: 50 },
  voidboundCharm: { key: 'voidboundCharm', name: 'Voidbound Charm', petPowerBonus: 60 },
  celestialCharm: { key: 'celestialCharm', name: 'Celestial Charm', petPowerBonus: 75 },
};
Object.values(CHARMS).forEach((c) => { c.sprite = `icons/sprites/chm-${c.key}.png`; });
export const CHARM_ORDER = Object.keys(CHARMS);

// Fusion permanently sacrifices one owned companion into another: the
// target keeps its own sprite/name (prefixed "Fused" — see
// petDisplayName in state.js) and gains a flat power bump plus, if the
// sacrifice knew a different ability, that ability too — stored per
// target key on player.fusionBonus so it survives switching which
// companion is active. The power bump scales with how leveled the
// sacrifice was, rewarding fusing in a companion you've actually invested
// in rather than a fresh level-1 catch.
export function fusionPowerGain(sacrificeLevel) {
  return Math.min(20, 5 + Math.floor(sacrificeLevel / 2));
}

// A rival trainer's fixed team of three, fought back-to-back with a full
// heal between each (same shape as Boss Rush) — reuses existing enemy
// sprites rather than needing new art, and scales with the player's own
// level so the rival stays a real fight at any point in the game.
export const RIVAL_TEAM = [
  { key: 'rivalDirewolf', name: "Rival's Direwolf", baseHp: 60, baseAtk: 20, baseDef: 8, sprite: 'icons/sprites/wolf.png' },
  { key: 'rivalFalcon', name: "Rival's Falcon", baseHp: 50, baseAtk: 24, baseDef: 6, sprite: 'icons/sprites/hawk.png' },
  { key: 'rivalShadowfang', name: "Rival's Shadowfang", baseHp: 75, baseAtk: 27, baseDef: 11, sprite: 'icons/sprites/panther.png' },
];
export function scaleRivalOpponent(base, playerLevel) {
  const mult = 1 + playerLevel * 0.06;
  return {
    key: base.key, name: base.name, sprite: base.sprite,
    maxHp: Math.round(base.baseHp * mult), atk: Math.round(base.baseAtk * mult), def: Math.round(base.baseDef * mult),
    xp: Math.round(30 * mult), goldMin: Math.round(40 * mult), goldMax: Math.round(60 * mult),
  };
}

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
  helmKey: 'clothCap',
  glovesKey: 'clothWraps',
  bootsKey: 'wornSandals',
  ownedWeapons: ['rustySword'],
  ownedArmors: ['clothTunic'],
  ownedHelmets: ['clothCap'],
  ownedGloves: ['clothWraps'],
  ownedBoots: ['wornSandals'],
  knownSkills: ['fireball'],
  ownedPets: [],
  activePetKey: null,
  petProgress: {},
  charmKey: 'none',
  ownedCharms: ['none'],
  // { [targetPetKey]: { power: N, extraAbilities: [abilityKey, ...] } } —
  // built up by fusing other companions into targetPetKey (see
  // fuseCompanions in ui.js). fusionCount is just a running total for the
  // "Fusionist" achievement.
  fusionBonus: {},
  fusionCount: 0,
  // Companion keys that rolled Shiny on first acquisition — permanent.
  shinyPets: [],
  // Lifetime totals, never reset (unlike bountyProgress, which rerolls
  // daily) — feeds the Hall of Legacy tab.
  lifetimeKills: 0,
  lifetimeGoldEarned: 0,
  arenaBestWave: 0,
  inventory: { potion: 3, ether: 0, captureOrb: 1 },
  // Marks an enemy key true the first time it's ever been defeated, so the
  // Bestiary can show which monsters in each level you've already killed.
  bestiary: {},
  // Marks an achievement key true the first time its condition is met —
  // permanent once earned, checked on every autosave.
  achievements: {},
  // Per-gear-key enchant levels, e.g. { weapon: { rustySword: 2 }, armor: {} }
  // — an extra flat stat bonus on top of the gear's own atkBonus/defBonus,
  // bought repeatedly at the Armory regardless of which piece is equipped.
  enchantLevels: { weapon: {}, armor: {} },
  // Today's 3 Bounty Board objectives and progress toward them; regenerated
  // whenever the real-world date changes. bountyDate is a toDateString().
  bountyDate: null,
  bounties: [],
  bountyProgress: { kills: 0, gold: 0, arenaWins: 0, bossWins: 0 },
  // How many times New Game+ has been started — each cycle scales enemy
  // stats and rewards up further.
  ngPlusLevel: 0,
  // Gear chest drops land here as { slot, key } instead of going straight
  // into ownedWeapons/ownedArmors — Deckard Cain in Town identifies them
  // (for a fee) before you learn what they are and can equip them.
  unidentifiedItems: [],
};

export const IDENTIFY_COST = 15;

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

// Post-game only — see the "Descend into the Abyss" Town button, shown
// only once the true ending achievement is earned. Not linked in via
// nextMap (that would replace the true-ending victory screen with a mere
// "the way onward has opened" toast), so it's appended to LEVEL_CHAIN by
// hand below instead of being discovered by walking nextMap links.
export const ABYSSAL_ENEMIES = {
  mawOfTheDeep: { key: 'mawOfTheDeep', name: 'Maw of the Deep', maxHp: 210, atk: 54, def: 29, xp: 165, goldMin: 150, goldMax: 160, weight: 4, sprite: 'icons/sprites/mawofthedeep.png' },
  gloomfang: { key: 'gloomfang', name: 'Gloomfang', maxHp: 220, atk: 56, def: 30, xp: 172, goldMin: 155, goldMax: 165, weight: 3, sprite: 'icons/sprites/gloomfang.png' },
};
export const FORMLESS_KING = {
  key: 'formlessking', name: 'The Formless King', maxHp: 1100, atk: 66, def: 42, xp: 3300, goldMin: 3300, goldMax: 3300, sprite: 'icons/sprites/formlessking.png',
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
    hazard: { type: 'Frostbite', chance: 0.15, damagePercent: 0.04 },
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
    hazard: { type: 'Scorching heat', chance: 0.15, damagePercent: 0.04 },
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
    hazard: { type: 'Toxic fumes', chance: 0.15, damagePercent: 0.04 },
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
  // Post-game only — reached via a Town button (see ui.js), not the normal
  // nextMap chain. No nextMap of its own either: it's a dead-end, farmable
  // endgame zone same as any other, not a new "true ending."
  abyssaldepths: {
    id: 'abyssaldepths', name: 'The Abyssal Depths', theme: 'abyssaldepths', depth: 19,
    bossEnemy: FORMLESS_KING, bossFlag: 'formlessKingDefeated', enemyPool: ABYSSAL_ENEMIES,
    hazard: { type: 'The Abyss itself', chance: 0.15, damagePercent: 0.05 },
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
  // The Abyssal Depths isn't linked via nextMap (see its comment in MAPS
  // above), so it's appended by hand — this is what makes it show up in
  // the World Map, Bestiary, and the "every boss/monster" achievements.
  order.push('abyssaldepths');
  return order;
})();

// Every non-boss monster across every zone is a potential companion — catch
// one in battle (see playerCapture in battle.js) instead of defeating it for
// loot, and it fights beside you exactly like a Tamer-bought pet (same
// {key, name, sprite, power} shape, same lockstep leveling). `power` scales
// with how deep its zone is, so a wild catch from a late zone is a
// genuinely stronger companion than anything buyable — bosses are excluded
// entirely so capture can never bypass the boss-gated level chain.
function capturePower(depth) {
  return Math.round((0.25 + depth * 0.09) * 100) / 100;
}

// Abilities are assigned deterministically (cycling through the shared
// pool by position) rather than hand-authored per monster — there are too
// many of these for bespoke flavor text to be worth it, but the assignment
// is stable across saves since it only depends on each monster's fixed
// position in the chain.
const ABILITY_KEYS = Object.keys(COMPANION_ABILITIES);
let abilityCursor = 0;
export const CAPTURABLE_MONSTERS = LEVEL_CHAIN.flatMap((mapId) => {
  const map = MAPS[mapId];
  return Object.values(map.enemyPool).map((enemy) => ({
    key: enemy.key, name: enemy.name, sprite: enemy.sprite,
    power: capturePower(map.depth), zoneName: map.name,
    ability: ABILITY_KEYS[abilityCursor++ % ABILITY_KEYS.length],
  }));
});
export const CAPTURABLE_KEYS = new Set(CAPTURABLE_MONSTERS.map((m) => m.key));

// One combined lookup for "the pet definition behind this key," whether it
// was bought from the Tamer or caught in the wild — battle.js's petAttacks,
// state.js's petEffectivePower, and every pet-display spot in ui.js read
// through this instead of PETS alone. Monster and pet keys never collide
// (disjoint naming), so a plain merge is safe.
export const ALL_PET_DEFS = {
  ...PETS,
  ...Object.fromEntries(CAPTURABLE_MONSTERS.map((m) => [m.key, m])),
};

// Permanent milestones, checked on every autosave (see checkAchievements in
// ui.js). Each `check` reads live state; once earned, state.player.achievements
// stays true forever regardless of whether the condition still holds (e.g.
// gold spent after "Rich and Famous" doesn't un-earn it).
export const ACHIEVEMENTS = [
  {
    key: 'firstBlood', name: 'First Blood', desc: 'Defeat your first enemy.', rewardGold: 20,
    check: (state) => Object.keys(state.player.bestiary).length > 0,
  },
  {
    key: 'levelTen', name: 'Rising Hero', desc: 'Reach character level 10.', rewardGold: 50,
    check: (state) => state.player.level >= 10,
  },
  {
    key: 'levelFifty', name: 'Legend', desc: 'Reach character level 50.', rewardGold: 300,
    check: (state) => state.player.level >= 50,
  },
  {
    key: 'allBossesDefeated', name: 'Boss Slayer', desc: 'Defeat every boss in the realm.', rewardGold: 1000,
    check: (state) => LEVEL_CHAIN.every((id) => state.flags[MAPS[id].bossFlag]),
  },
  {
    key: 'trueEnding', name: 'Savior of Emberfall', desc: 'Defeat the Eternal Sovereign.', rewardGold: 500,
    check: (state) => !!state.flags.eternalSovereignDefeated,
  },
  {
    key: 'petCollector', name: 'Pet Collector', desc: 'Adopt all 10 pets.', rewardGold: 200,
    check: (state) => Object.keys(PETS).every((k) => state.player.ownedPets.includes(k)),
  },
  {
    key: 'wildCatcher', name: 'Wild Catcher', desc: 'Capture 10 different wild monsters.', rewardGold: 150,
    check: (state) => state.player.ownedPets.filter((k) => CAPTURABLE_KEYS.has(k)).length >= 10,
  },
  {
    key: 'monsterTamer', name: 'Monster Tamer', desc: 'Capture every capturable monster in the realm.', rewardGold: 600,
    check: (state) => CAPTURABLE_MONSTERS.every((m) => state.player.ownedPets.includes(m.key)),
  },
  {
    key: 'charmMaster', name: 'Charm Master', desc: 'Find the Celestial Charm.', rewardGold: 300,
    check: (state) => state.player.ownedCharms.includes('celestialCharm'),
  },
  {
    key: 'fusionist', name: 'Fusionist', desc: 'Fuse 3 companions together.', rewardGold: 200,
    check: (state) => (state.player.fusionCount || 0) >= 3,
  },
  {
    key: 'rivalDefeated', name: 'Rival Defeated', desc: "Clear the Rival's full team in one duel.", rewardGold: 250,
    check: (state) => !!state.flags.rivalDefeated,
  },
  {
    key: 'shinyHunter', name: 'Shiny Hunter', desc: 'Acquire a Shiny companion.', rewardGold: 150,
    check: (state) => (state.player.shinyPets || []).length > 0,
  },
  {
    key: 'fullyGeared', name: 'Fully Geared', desc: 'Own the top tier of every equipment slot.', rewardGold: 400,
    check: (state) => Object.values(GEAR_SLOTS).every((slot) => {
      const topKey = slot.order[slot.order.length - 1];
      return state.player[slot.ownedField].includes(topKey);
    }),
  },
  {
    key: 'bestiaryComplete', name: 'Monster Hunter', desc: 'Defeat every kind of monster and every boss.', rewardGold: 750,
    check: (state) => LEVEL_CHAIN.every((id) => {
      const map = MAPS[id];
      return Object.keys(map.enemyPool).every((k) => state.player.bestiary[k]) && state.flags[map.bossFlag];
    }),
  },
  {
    key: 'arenaChampion', name: 'Arena Champion', desc: 'Reach Arena wave 20.', rewardGold: 400,
    check: (state) => state.player.arenaBestWave >= 20,
  },
  {
    key: 'richAndFamous', name: 'Rich and Famous', desc: 'Amass 10,000 gold at once.', rewardGold: 0,
    check: (state) => state.player.gold >= 10000,
  },
];

// Enchanting adds a flat stat bonus per gear key, bought repeatedly at the
// Armory regardless of which piece is currently equipped — a gold sink and
// a reason to keep favorite gear instead of only ever buying the next tier.
export const ENCHANT_MAX_LEVEL = 10;
export const ENCHANT_BONUS_PER_LEVEL = 2;
export const ENCHANT_BASE_COST = 40;
export function enchantCost(level) {
  return ENCHANT_BASE_COST * (level + 1);
}

// Bounty Board objective templates — 3 are rolled fresh each real-world day.
// `progressKey` names which counter in player.bountyProgress to read.
export const BOUNTY_TEMPLATES = [
  { type: 'kills', label: (n) => `Defeat ${n} enemies`, targets: [5, 8, 12], rewardGold: (n) => n * 8 },
  { type: 'gold', label: (n) => `Earn ${n} gold`, targets: [100, 200, 350], rewardGold: (n) => Math.round(n * 0.4) },
  { type: 'arenaWins', label: (n) => `Clear ${n} Arena waves`, targets: [3, 5, 8], rewardGold: (n) => n * 30 },
  { type: 'bossWins', label: (n) => `Win ${n} boss fights`, targets: [1, 2, 3], rewardGold: (n) => n * 100 },
];

// Each New Game+ cycle scales enemy/boss stats (and their gold/XP payout)
// up further, while your character, gear, and collection progress persist.
export const NG_PLUS_SCALING_PER_LEVEL = 0.5;
export function ngPlusMultiplier(ngPlusLevel) {
  return 1 + (ngPlusLevel || 0) * NG_PLUS_SCALING_PER_LEVEL;
}

export const ITEMS = {
  potion: { key: 'potion', name: 'Potion', desc: 'Restores 20 HP', price: 8, heal: 20 },
  ether: { key: 'ether', name: 'Ether', desc: 'Restores 10 MP', price: 10, mp: 10 },
  greaterPotion: { key: 'greaterPotion', name: 'Greater Potion', desc: 'Restores 60 HP', price: 24, heal: 60 },
  greaterEther: { key: 'greaterEther', name: 'Greater Ether', desc: 'Restores 30 MP', price: 30, mp: 30 },
  townScroll: { key: 'townScroll', name: 'Town Scroll', desc: 'Teleports you back to town', price: 25 },
  captureOrb: {
    key: 'captureOrb', name: 'Capture Orb', desc: 'A chance to capture a wild monster', price: 20,
    capture: true, captureBase: 0.15, captureHpBonus: 0.55,
  },
  greaterCaptureOrb: {
    key: 'greaterCaptureOrb', name: 'Greater Capture Orb', desc: 'A much better chance to capture a wild monster', price: 55,
    capture: true, captureBase: 0.3, captureHpBonus: 0.65,
  },
};

// Any item with a heal or mp field is a usable consumable — shown in the
// battle Item submenu and the Status screen's Items section alike, so a
// new potion/ether tier never needs its own hardcoded button.
export const CONSUMABLE_ITEMS = Object.values(ITEMS).filter((item) => item.heal || item.mp);

// Capture Orbs only make sense as a battle action (they need a live target),
// so they're listed separately from CONSUMABLE_ITEMS rather than mixed in
// with the out-of-battle-usable heal/mp items.
export const CAPTURE_ITEMS = Object.values(ITEMS).filter((item) => item.capture);

export const SAVE_KEY = 'emberfall-save-v1';
