import { PLAYER_BASE, START_POS } from './data.js';

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
  return {
    player: { ...structuredClone(PLAYER_BASE), ...saved.player, inventory: { ...PLAYER_BASE.inventory, ...saved.player.inventory } },
    pos: { ...saved.pos },
    flags: { bossDefeated: false, ...saved.flags },
  };
}
