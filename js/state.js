import { PLAYER_BASE, WEAPONS, ARMORS, MAPS, PETS, LEVEL_GROWTH, PET_LEVEL_POWER_BONUS } from './data.js';
import { generateZoneGrid } from './mapgen.js';

// Ensures state.layouts[mapId] exists, generating a fresh random layout when
// needed. The overworld (your home town) is only ever generated once, on
// New Game — everywhere past it is a "level" that gets a brand new random
// layout each time you step into it (forceRegenerate), which is what makes
// arriving somewhere fresh instead of memorizing a fixed corridor.
export function ensureLayout(state, mapId, forceRegenerate = false) {
  if (forceRegenerate || !state.layouts[mapId]) {
    const map = MAPS[mapId];
    state.layouts[mapId] = generateZoneGrid({ hasTown: !!map.hasTown, vendors: map.vendors || [] });
  }
  return state.layouts[mapId];
}

export function newGameState(heroName) {
  const player = structuredClone(PLAYER_BASE);
  const trimmed = (heroName || '').trim();
  if (trimmed) player.name = trimmed.slice(0, 12);
  const state = {
    player,
    mapId: 'overworld',
    pos: { x: 0, y: 0 },
    flags: {},
    layouts: {},
  };
  const layout = ensureLayout(state, 'overworld');
  state.pos = { ...layout.startPos };
  return state;
}

export function toSaveObject(state) {
  return {
    player: state.player,
    mapId: state.mapId,
    pos: state.pos,
    flags: state.flags,
    layouts: state.layouts,
  };
}

export function fromSaveObject(saved) {
  const player = {
    ...structuredClone(PLAYER_BASE),
    ...saved.player,
    inventory: { ...PLAYER_BASE.inventory, ...saved.player.inventory },
  };
  // Migrate pre-equipment saves: old shape had flat atk/def instead of
  // baseAtk/baseDef, and no weapon/armor keys. Carry the old totals over as
  // the new base stats so returning players don't get quietly nerfed.
  if (saved.player.baseAtk === undefined && saved.player.atk !== undefined) {
    player.baseAtk = saved.player.atk;
    player.baseDef = saved.player.def;
  }
  return {
    player,
    // Older saves predate later zones/flags — default to the overworld.
    mapId: saved.mapId || 'overworld',
    pos: { ...saved.pos },
    flags: { ...saved.flags },
    layouts: { ...saved.layouts },
  };
}

export function effectiveAtk(player) {
  const weapon = WEAPONS[player.weaponKey] || WEAPONS.rustySword;
  return player.baseAtk + weapon.atkBonus;
}

export function effectiveDef(player) {
  const armor = ARMORS[player.armorKey] || ARMORS.clothTunic;
  return player.baseDef + armor.defBonus;
}

// Advances xp/xpToNext/level on any {level, xp, xpToNext} entity using the
// shared curve (compounds through xpFactorCapLevel, then a flat step per
// level after that). Both the player and pets use this exact function with
// the exact same per-kill XP amount, so an active pet levels in lockstep
// with the player instead of lagging behind on some slower schedule.
export function applyLevelUps(entity, growth = LEVEL_GROWTH) {
  let levels = 0;
  while (entity.xp >= entity.xpToNext) {
    entity.xp -= entity.xpToNext;
    entity.xpToNext = entity.level < growth.xpFactorCapLevel
      ? Math.round(entity.xpToNext * growth.xpFactor)
      : entity.xpToNext + growth.xpLinearStep;
    entity.level += 1;
    levels += 1;
  }
  return levels;
}

// Lazily creates a pet's progress record, starting at the exact same
// level 1 / xp 0 / xpToNext as a brand-new player.
export function ensurePetProgress(player, petKey) {
  if (!player.petProgress[petKey]) {
    player.petProgress[petKey] = { level: 1, xp: 0, xpToNext: PLAYER_BASE.xpToNext };
  }
  return player.petProgress[petKey];
}

export function petLevel(player, petKey) {
  const progress = player.petProgress && player.petProgress[petKey];
  return progress ? progress.level : 1;
}

export function petEffectivePower(player, petKey) {
  const pet = PETS[petKey];
  if (!pet) return 0;
  const level = petLevel(player, petKey);
  return pet.power * (1 + (level - 1) * PET_LEVEL_POWER_BONUS);
}

// Progress toward the pet's next level, for rendering an XP bar.
export function petXpProgress(player, petKey) {
  const progress = player.petProgress && player.petProgress[petKey];
  if (!progress) return { level: 1, xpIntoLevel: 0, xpNeeded: PLAYER_BASE.xpToNext };
  return { level: progress.level, xpIntoLevel: progress.xp, xpNeeded: progress.xpToNext };
}
