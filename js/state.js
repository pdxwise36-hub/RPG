import { PLAYER_BASE, START_POS, WEAPONS, ARMORS } from './data.js';

export function newGameState() {
  return {
    player: structuredClone(PLAYER_BASE),
    pos: { ...START_POS },
    flags: { bossDefeated: false },
  };
}

export function toSaveObject(state) {
  return {
    player: state.player,
    pos: state.pos,
    flags: state.flags,
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
    pos: { ...saved.pos },
    flags: { bossDefeated: false, ...saved.flags },
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
