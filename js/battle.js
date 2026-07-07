import { ENEMIES, BOSS, ITEMS, SKILL_FIREBALL, LEVEL_GROWTH } from './data.js';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function damageRoll(atk, def) {
  return Math.max(1, atk - def + rand(-2, 2));
}

export function pickRandomEnemy() {
  const pool = Object.values(ENEMIES);
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of pool) {
    if (roll < e.weight) return e;
    roll -= e.weight;
  }
  return pool[0];
}

export function createBattle(enemyDef) {
  return {
    enemy: { ...enemyDef, hp: enemyDef.maxHp },
    log: [`A wild ${enemyDef.name} appears!`],
    over: false,
    result: null, // 'win' | 'lose' | 'fled'
    playerTurn: true,
  };
}

function pushLog(battle, msg) {
  battle.log.push(msg);
  if (battle.log.length > 4) battle.log.shift();
}

function enemyStrikes(battle, state) {
  const player = state.player;
  const dmg = damageRoll(battle.enemy.atk, player.def);
  player.hp = Math.max(0, player.hp - dmg);
  pushLog(battle, `${battle.enemy.name} hits you for ${dmg}.`);
  if (player.hp <= 0) {
    battle.over = true;
    battle.result = 'lose';
  }
}

function afterPlayerAction(battle, state) {
  if (battle.enemy.hp <= 0) {
    battle.enemy.hp = 0;
    battle.over = true;
    battle.result = 'win';
    pushLog(battle, `${battle.enemy.name} is defeated!`);
    return;
  }
  enemyStrikes(battle, state);
}

export function playerAttack(battle, state) {
  if (battle.over) return;
  const dmg = damageRoll(state.player.atk, battle.enemy.def);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `You strike ${battle.enemy.name} for ${dmg}.`);
  afterPlayerAction(battle, state);
}

export function playerSkill(battle, state) {
  if (battle.over) return;
  const player = state.player;
  if (player.mp < SKILL_FIREBALL.mpCost) {
    pushLog(battle, 'Not enough MP!');
    return;
  }
  player.mp -= SKILL_FIREBALL.mpCost;
  const dmg = Math.max(2, Math.round(player.atk * SKILL_FIREBALL.power) - battle.enemy.def);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `Fireball scorches ${battle.enemy.name} for ${dmg}!`);
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
  if (battle.enemy.key === BOSS.key) {
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
    player.atk += LEVEL_GROWTH.atk;
    player.def += LEVEL_GROWTH.def;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    levels += 1;
  }
  return { goldWon, xpWon: enemyDef.xp, leveledUp: levels > 0, levels };
}
