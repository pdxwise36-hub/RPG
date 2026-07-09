import { PLAYER_BASE, WEAPONS, ARMORS, MAPS, PETS, PET_XP_PER_LEVEL, PET_MAX_LEVEL, PET_LEVEL_POWER_BONUS } from './data.js';
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

// Pet level is purely derived from cumulative XP earned while that pet was
// active — no separate stored level field, so there's nothing to desync.
export function petLevel(player, petKey) {
  const xp = (player.petXp && player.petXp[petKey]) || 0;
  return Math.min(PET_MAX_LEVEL, 1 + Math.floor(xp / PET_XP_PER_LEVEL));
}

export function petEffectivePower(player, petKey) {
  const pet = PETS[petKey];
  if (!pet) return 0;
  const level = petLevel(player, petKey);
  return pet.power * (1 + (level - 1) * PET_LEVEL_POWER_BONUS);
}

// Progress toward the pet's next level, for rendering an XP bar. At max
// level there's nowhere left to progress to, so the bar just reads full.
export function petXpProgress(player, petKey) {
  const xp = (player.petXp && player.petXp[petKey]) || 0;
  const level = petLevel(player, petKey);
  if (level >= PET_MAX_LEVEL) {
    return { level, xpIntoLevel: PET_XP_PER_LEVEL, xpNeeded: PET_XP_PER_LEVEL, isMax: true };
  }
  return { level, xpIntoLevel: xp - (level - 1) * PET_XP_PER_LEVEL, xpNeeded: PET_XP_PER_LEVEL, isMax: false };
}
