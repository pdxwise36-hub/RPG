import { PLAYER_BASE, WEAPONS, ARMORS, MAPS } from './data.js';
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
