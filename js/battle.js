import { ITEMS, SKILLS, PETS, LEVEL_GROWTH } from './data.js';
import { effectiveAtk, effectiveDef } from './state.js';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function damageRoll(atk, def) {
  return Math.max(1, atk - def + rand(-2, 2));
}

export function pickRandomEnemy(enemyPool) {
  const pool = Object.values(enemyPool);
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of pool) {
    if (roll < e.weight) return e;
    roll -= e.weight;
  }
  return pool[0];
}

export function createBattle(enemyDef, isBoss = false) {
  return {
    enemy: { ...enemyDef, hp: enemyDef.maxHp },
    log: [isBoss ? `${enemyDef.name} blocks your path!` : `A wild ${enemyDef.name} appears!`],
    over: false,
    result: null, // 'win' | 'lose' | 'fled'
    playerTurn: true,
    isBoss,
  };
}

function pushLog(battle, msg) {
  battle.log.push(msg);
  if (battle.log.length > 4) battle.log.shift();
}

function enemyStrikes(battle, state) {
  const player = state.player;
  const dmg = damageRoll(battle.enemy.atk, effectiveDef(player));
  player.hp = Math.max(0, player.hp - dmg);
  pushLog(battle, `${battle.enemy.name} hits you for ${dmg}.`);
  if (player.hp <= 0) {
    battle.over = true;
    battle.result = 'lose';
  }
}

// Returns true (and finalizes the win) if the enemy is dead.
function checkEnemyDefeated(battle) {
  if (battle.enemy.hp <= 0) {
    battle.enemy.hp = 0;
    battle.over = true;
    battle.result = 'win';
    pushLog(battle, `${battle.enemy.name} is defeated!`);
    return true;
  }
  return false;
}

function petAttacks(battle, state) {
  const player = state.player;
  const pet = PETS[player.activePetKey];
  if (!pet) return;
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * pet.power));
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${pet.name} attacks ${battle.enemy.name} for ${dmg}!`);
}

function afterPlayerAction(battle, state) {
  if (checkEnemyDefeated(battle)) return;
  petAttacks(battle, state);
  if (checkEnemyDefeated(battle)) return;
  enemyStrikes(battle, state);
}

export function playerAttack(battle, state) {
  if (battle.over) return;
  const dmg = damageRoll(effectiveAtk(state.player), battle.enemy.def);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `You strike ${battle.enemy.name} for ${dmg}.`);
  afterPlayerAction(battle, state);
}

export function playerSkill(battle, state, skillKey) {
  if (battle.over) return;
  const player = state.player;
  const skill = SKILLS[skillKey];
  if (!skill || !player.knownSkills.includes(skillKey)) return;
  if (player.mp < skill.mpCost) {
    pushLog(battle, 'Not enough MP!');
    return;
  }
  player.mp -= skill.mpCost;
  const dmg = Math.max(2, Math.round(effectiveAtk(player) * skill.power) - battle.enemy.def);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${skill.name} hits ${battle.enemy.name} for ${dmg}!`);
  afterPlayerAction(battle, state);
}

export function playerItem(battle, state, itemKey) {
  if (battle.over) return;
  const player = state.player;
  const count = player.inventory[itemKey] || 0;
  if (count <= 0) return;
  const item = ITEMS[itemKey];
  player.inventory[itemKey] = count - 1;
  if (item.heal) {
    player.hp = Math.min(player.maxHp, player.hp + item.heal);
    pushLog(battle, `You drink a ${item.name}. Restored ${item.heal} HP.`);
  } else if (item.mp) {
    player.mp = Math.min(player.maxMp, player.mp + item.mp);
    pushLog(battle, `You drink an ${item.name}. Restored ${item.mp} MP.`);
  }
  afterPlayerAction(battle, state);
}

export function playerRun(battle, state) {
  if (battle.over) return;
  if (battle.isBoss) {
    pushLog(battle, 'You cannot flee this battle!');
    enemyStrikes(battle, state);
    return;
  }
  if (Math.random() < 0.75) {
    battle.over = true;
    battle.result = 'fled';
    pushLog(battle, 'You got away safely.');
  } else {
    pushLog(battle, 'Could not escape!');
    enemyStrikes(battle, state);
  }
}

// Returns { leveledUp, levels } describing how many level-ups occurred.
export function grantRewards(state, enemyDef) {
  const player = state.player;
  const goldWon = rand(enemyDef.goldMin, enemyDef.goldMax);
  player.gold += goldWon;
  player.xp += enemyDef.xp;
  let levels = 0;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.xpToNext = Math.round(player.xpToNext * LEVEL_GROWTH.xpFactor);
    player.level += 1;
    player.maxHp += LEVEL_GROWTH.hp;
    player.maxMp += LEVEL_GROWTH.mp;
    player.baseAtk += LEVEL_GROWTH.atk;
    player.baseDef += LEVEL_GROWTH.def;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    levels += 1;
  }
  return { goldWon, xpWon: enemyDef.xp, leveledUp: levels > 0, levels };
}

const CHEST_CHANCE = 0.25;

// Rolls a chest drop after a non-boss win. Mutates player state directly
// (same pattern as grantRewards) and returns a description of the loot, or
// null if no chest appeared.
export function rollChest(state) {
  if (Math.random() >= CHEST_CHANCE) return null;
  const player = state.player;
  const roll = Math.random();

  if (roll < 0.4) {
    const amount = rand(15, 40);
    player.gold += amount;
    return { type: 'gold', amount };
  }

  if (roll < 0.75) {
    const itemKey = Math.random() < 0.6 ? 'potion' : 'ether';
    player.inventory[itemKey] = (player.inventory[itemKey] || 0) + 1;
    return { type: 'item', itemKey };
  }

  const learnable = Object.values(SKILLS).filter(
    (s) => s.key !== 'fireball' && !player.knownSkills.includes(s.key)
  );
  if (learnable.length === 0) {
    const amount = rand(15, 40);
    player.gold += amount;
    return { type: 'gold', amount };
  }
  const skill = learnable[Math.floor(Math.random() * learnable.length)];
  player.knownSkills.push(skill.key);
  return { type: 'scroll', skillKey: skill.key };
}
