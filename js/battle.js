import { ITEMS, SKILLS, ALL_PET_DEFS, CHARM_ORDER, AMULET_ORDER, RING_ORDER, SHINY_CHANCE, LEVEL_GROWTH, MAPS, GEAR_SLOTS, PET_ENERGY_MAX, PET_ENERGY_PER_HIT, PET_SKILL_MULTIPLIER, ngPlusMultiplier } from './data.js';
import { effectiveAtk, effectiveDef, petEffectivePower, petDisplayName, charmPowerBonus, petPowerSetBonus, itemFindBonus, skillPowerBonus, companionAbilityBonus, applyLevelUps, ensurePetProgress, mpCostReduction, xpBonusPercent, critChance, dodgeChance, goldBonusPercent, mpRegenPercent, reflectPercent } from './state.js';

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

// Arena enemies are reskinned/scaled versions of regular level enemies — no
// separate roster to maintain. Zones unlock progressively (one more every 2
// waves) so early waves draw from easy enemies instead of randomly pulling
// an endgame monster on wave 1; both stats and rewards scale up with wave.
export function pickArenaEnemy(wave) {
  const zones = Object.values(MAPS).filter((m) => m.enemyPool);
  const maxDepth = Math.min(Math.max(...zones.map((z) => z.depth)), Math.floor((wave - 1) / 2));
  const pool = zones.filter((z) => z.depth <= maxDepth).flatMap((z) => Object.values(z.enemyPool));
  const base = pool[Math.floor(Math.random() * pool.length)];
  const mult = 1 + (wave - 1) * 0.12;
  return {
    ...base,
    name: `${base.name} (Wave ${wave})`,
    maxHp: Math.round(base.maxHp * mult),
    atk: Math.round(base.atk * mult),
    def: Math.round(base.def * mult),
    xp: Math.round(base.xp * mult * 1.5),
    goldMin: Math.round(base.goldMin * mult * 1.5),
    goldMax: Math.round(base.goldMax * mult * 1.5),
  };
}

// Scales an enemy/boss def up for New Game+ — every cycle raises stats and
// payout together so pushing through the chain again stays worthwhile.
export function scaleForNGPlus(enemyDef, ngPlusLevel) {
  const mult = ngPlusMultiplier(ngPlusLevel);
  if (mult === 1) return enemyDef;
  return {
    ...enemyDef,
    maxHp: Math.round(enemyDef.maxHp * mult),
    atk: Math.round(enemyDef.atk * mult),
    def: Math.round(enemyDef.def * mult),
    xp: Math.round(enemyDef.xp * mult),
    goldMin: Math.round(enemyDef.goldMin * mult),
    goldMax: Math.round(enemyDef.goldMax * mult),
  };
}

export function createBattle(enemyDef, isBoss = false) {
  return {
    enemy: { ...enemyDef, hp: enemyDef.maxHp },
    log: [isBoss ? `${enemyDef.name} blocks your path!` : `A wild ${enemyDef.name} appears!`],
    over: false,
    result: null, // 'win' | 'lose' | 'fled'
    playerTurn: true,
    isBoss,
    // Charges from the active pet's normal auto-hits, spent on the
    // Companion Skill battle button (see petActiveSkill) — battle-scoped
    // only, never persisted, so every fight starts uncharged.
    petEnergy: 0,
  };
}

function pushLog(battle, msg) {
  battle.log.push(msg);
  if (battle.log.length > 4) battle.log.shift();
}

// Boots give a chance to dodge an attack entirely, gloves give a chance for
// the player's own hits to crit for double damage — rolled fresh each time.
// A Swift/Berserker companion ability adds straight onto these same rolls.
function rollDodge(player) {
  return Math.random() * 100 < dodgeChance(player) + companionAbilityBonus(player, 'swift');
}
function rollCrit(player) {
  return Math.random() * 100 < critChance(player) + companionAbilityBonus(player, 'berserker');
}

// Some zones inflict environmental damage on top of the enemy's own attack
// (poison fumes, scorching heat, and so on) — a flat chance per enemy turn,
// independent of dodge, since ducking the monster doesn't duck the swamp.
function applyZoneHazard(battle, state) {
  const player = state.player;
  const hazard = MAPS[state.mapId] && MAPS[state.mapId].hazard;
  if (!hazard || Math.random() >= hazard.chance) return;
  const dmg = Math.max(1, Math.round(player.maxHp * hazard.damagePercent));
  player.hp = Math.max(0, player.hp - dmg);
  pushLog(battle, `${hazard.type} stings you for ${dmg}!`);
  if (player.hp <= 0) {
    battle.over = true;
    battle.result = 'lose';
  }
}

function enemyStrikes(battle, state) {
  const player = state.player;
  if (rollDodge(player)) {
    pushLog(battle, `You dodge ${battle.enemy.name}'s attack!`);
  } else {
    let dmg = damageRoll(battle.enemy.atk, effectiveDef(player));
    const guardian = companionAbilityBonus(player, 'guardian');
    if (guardian > 0) dmg = Math.max(1, Math.round(dmg * (1 - guardian / 100)));
    player.hp = Math.max(0, player.hp - dmg);
    pushLog(battle, `${battle.enemy.name} hits you for ${dmg}.`);
    const reflect = reflectPercent(player);
    if (reflect > 0) {
      const reflected = Math.max(1, Math.round(dmg * reflect / 100));
      battle.enemy.hp = Math.max(0, battle.enemy.hp - reflected);
      pushLog(battle, `Your ring lashes back for ${reflected}!`);
    }
    if (player.hp <= 0) {
      battle.over = true;
      battle.result = 'lose';
    }
  }
  // A reflect can finish the enemy off mid-strike — check for that (but only
  // if the player didn't just lose, which takes priority) before moving on
  // to the zone hazard roll.
  if (!battle.over && checkEnemyDefeated(battle)) return;
  if (!battle.over) applyZoneHazard(battle, state);
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
  const petKey = player.activePetKey;
  const pet = ALL_PET_DEFS[petKey];
  if (!pet) return;
  const power = petEffectivePower(player, petKey) * (1 + (charmPowerBonus(player) + petPowerSetBonus(player)) / 100);
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * power));
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${petDisplayName(player, petKey)} attacks ${battle.enemy.name} for ${dmg}!`);
  const vampiric = companionAbilityBonus(player, 'vampiric');
  if (vampiric > 0 && player.hp < player.maxHp) {
    const healed = Math.min(player.maxHp - player.hp, Math.round(dmg * vampiric / 100));
    if (healed > 0) {
      player.hp += healed;
      pushLog(battle, `${pet.name}'s bite heals you for ${healed}!`);
    }
  }
  battle.petEnergy = Math.min(PET_ENERGY_MAX, (battle.petEnergy || 0) + PET_ENERGY_PER_HIT);
}

// The Amulet slowly tops the player's MP back up each round — rolled once
// per player action, same cadence as the enemy's own turn.
function applyMpRegen(battle, state) {
  const player = state.player;
  const regen = mpRegenPercent(player);
  if (regen <= 0 || player.mp >= player.maxMp) return;
  const restored = Math.min(player.maxMp - player.mp, Math.max(1, Math.round(player.maxMp * regen / 100)));
  if (restored > 0) {
    player.mp += restored;
    pushLog(battle, `Your amulet hums, restoring ${restored} MP.`);
  }
}

// Shared tail end of a round once the pet's own contribution (if any) is
// settled — used both after a normal petAttacks and after the Companion
// Skill burst, which replaces petAttacks for that round instead of adding
// to it.
function finishRound(battle, state) {
  if (checkEnemyDefeated(battle)) return;
  applyMpRegen(battle, state);
  enemyStrikes(battle, state);
}

function afterPlayerAction(battle, state) {
  if (checkEnemyDefeated(battle)) return;
  petAttacks(battle, state);
  finishRound(battle, state);
}

// The active companion's charged-up burst move (see PET_ENERGY_MAX/PET_
// ENERGY_PER_HIT/PET_SKILL_MULTIPLIER in data.js) — a genuine alternative to
// Attack/Skill for that round rather than a bonus on top: it replaces the
// pet's normal small auto-hit with one much bigger one, so choosing it means
// forgoing your own action that round.
export function petActiveSkill(battle, state) {
  if (battle.over) return;
  const player = state.player;
  const petKey = player.activePetKey;
  const pet = ALL_PET_DEFS[petKey];
  if (!pet || (battle.petEnergy || 0) < PET_ENERGY_MAX) return;
  battle.petEnergy = 0;
  const power = petEffectivePower(player, petKey) * (1 + (charmPowerBonus(player) + petPowerSetBonus(player)) / 100) * PET_SKILL_MULTIPLIER;
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * power));
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${petDisplayName(player, petKey)} unleashes a Rally on ${battle.enemy.name} for ${dmg}!`);
  const vampiric = companionAbilityBonus(player, 'vampiric');
  if (vampiric > 0 && player.hp < player.maxHp) {
    const healed = Math.min(player.maxHp - player.hp, Math.round(dmg * vampiric / 100));
    if (healed > 0) {
      player.hp += healed;
      pushLog(battle, `${pet.name}'s bite heals you for ${healed}!`);
    }
  }
  finishRound(battle, state);
}

export function playerAttack(battle, state) {
  if (battle.over) return;
  let dmg = damageRoll(effectiveAtk(state.player), battle.enemy.def);
  const crit = rollCrit(state.player);
  if (crit) dmg *= 2;
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${crit ? 'Critical hit! ' : ''}You strike ${battle.enemy.name} for ${dmg}.`);
  afterPlayerAction(battle, state);
}

export function playerSkill(battle, state, skillKey) {
  if (battle.over) return;
  const player = state.player;
  const skill = SKILLS[skillKey];
  if (!skill || !player.knownSkills.includes(skillKey)) return;
  const cost = Math.max(1, Math.round(skill.mpCost * (1 - mpCostReduction(player) / 100)));
  if (player.mp < cost) {
    pushLog(battle, 'Not enough MP!');
    return;
  }
  player.mp -= cost;
  const power = skill.power * (1 + skillPowerBonus(player) / 100);
  let dmg = Math.max(2, Math.round(effectiveAtk(player) * power) - battle.enemy.def);
  const crit = rollCrit(player);
  if (crit) dmg *= 2;
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${crit ? 'Critical hit! ' : ''}${skill.name} hits ${battle.enemy.name} for ${dmg}!`);
  afterPlayerAction(battle, state);
}

// Applies an item's effect directly to the player and decrements inventory.
// Shared by in-battle item use and the Status screen's out-of-battle "Use"
// buttons. Returns a message describing what happened, or null if the item
// couldn't be used (none left, or not a consumable).
export function consumeItem(player, itemKey) {
  const count = player.inventory[itemKey] || 0;
  if (count <= 0) return null;
  const item = ITEMS[itemKey];
  player.inventory[itemKey] = count - 1;
  if (item.heal) {
    player.hp = Math.min(player.maxHp, player.hp + item.heal);
    return `You drink a ${item.name}. Restored ${item.heal} HP.`;
  }
  if (item.mp) {
    player.mp = Math.min(player.maxMp, player.mp + item.mp);
    return `You drink an ${item.name}. Restored ${item.mp} MP.`;
  }
  return null;
}

export function playerItem(battle, state, itemKey) {
  if (battle.over) return;
  const msg = consumeItem(state.player, itemKey);
  if (msg) pushLog(battle, msg);
  afterPlayerAction(battle, state);
}

// Pokemon-style capture: consumes a Capture Orb for a chance to add the
// current enemy to ownedPets as a usable companion instead of defeating it
// for the usual gold/XP/bestiary credit — catching is a genuine alternative
// to a kill, not a strictly-better bonus on top of one. Bosses can never be
// captured, so the boss-gated level chain is untouched by this system.
export function playerCapture(battle, state, itemKey) {
  if (battle.over) return;
  const player = state.player;
  const item = ITEMS[itemKey];
  if (!item || !item.capture || (player.inventory[itemKey] || 0) <= 0) return;
  if (battle.isBoss) {
    pushLog(battle, `${battle.enemy.name} is too powerful to capture!`);
    return;
  }
  if (player.ownedPets.includes(battle.enemy.key)) {
    pushLog(battle, `You already have a ${battle.enemy.name}!`);
    return;
  }
  player.inventory[itemKey] -= 1;
  const hpPercent = battle.enemy.hp / battle.enemy.maxHp;
  const chance = Math.min(0.95, item.captureBase + (1 - hpPercent) * item.captureHpBonus);
  if (Math.random() < chance) {
    player.ownedPets.push(battle.enemy.key);
    const shiny = Math.random() < SHINY_CHANCE;
    if (shiny) player.shinyPets.push(battle.enemy.key);
    if (!player.activePetKey) player.activePetKey = battle.enemy.key;
    battle.over = true;
    battle.result = 'captured';
    pushLog(battle, shiny ? `Gotcha! A Shiny ${battle.enemy.name} was captured!` : `Gotcha! ${battle.enemy.name} was captured!`);
  } else {
    pushLog(battle, `The ${battle.enemy.name} broke free!`);
    afterPlayerAction(battle, state);
  }
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

// Returns { leveledUp, levels, petLeveledUp, petLevels } describing how many
// level-ups occurred. The active pet earns the exact same (already-boosted)
// XP as the player from this kill and levels on the exact same curve, so it
// never lags behind as long as it's been active the whole way. Boots boost
// gold found and a helm boosts XP gained, both applied here since every
// kill (regular, boss, or Arena) funnels through this one function.
export function grantRewards(state, enemyDef) {
  const player = state.player;
  const blessed = companionAbilityBonus(player, 'blessed');
  const goldWon = Math.round(rand(enemyDef.goldMin, enemyDef.goldMax) * (1 + goldBonusPercent(player) / 100) * (1 + blessed / 100));
  const xpWon = Math.round(enemyDef.xp * (1 + xpBonusPercent(player) / 100) * (1 + blessed / 100));
  player.gold += goldWon;
  player.xp += xpWon;
  if (enemyDef.key) player.bestiary[enemyDef.key] = true;
  player.bountyProgress.kills += 1;
  player.bountyProgress.gold += goldWon;
  player.lifetimeKills = (player.lifetimeKills || 0) + 1;
  player.lifetimeGoldEarned = (player.lifetimeGoldEarned || 0) + goldWon;
  if (enemyDef.isElite) player.lifetimeElites = (player.lifetimeElites || 0) + 1;
  const levels = applyLevelUps(player);
  if (levels > 0) {
    player.maxHp += LEVEL_GROWTH.hp * levels;
    player.maxMp += LEVEL_GROWTH.mp * levels;
    player.baseAtk += LEVEL_GROWTH.atk * levels;
    player.baseDef += LEVEL_GROWTH.def * levels;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
  }

  let petLevels = 0;
  if (player.activePetKey) {
    const progress = ensurePetProgress(player, player.activePetKey);
    progress.xp += xpWon;
    petLevels = applyLevelUps(progress);
  }

  return {
    goldWon, xpWon,
    leveledUp: levels > 0, levels,
    petLeveledUp: petLevels > 0, petLevels,
  };
}

const CHEST_CHANCE = 0.25;

// Chest gold scales with how deep the current zone is in the chain (0 =
// overworld, 13 = the Void Rift) — the same "found 15-40 gold" roll is worth
// noticeably more once you're deep in.
function goldDrop(state, depth) {
  const amount = Math.round(rand(15, 40) * (1 + depth * 0.2));
  state.player.gold += amount;
  return amount;
}

const GEAR_SLOT_KEYS = Object.keys(GEAR_SLOTS);

// Picks an unowned piece from a random equipment slot, anchored to the
// current zone's depth so early chests don't hand out endgame gear (or
// waste a drop on something already outclassed). Searches outward from the
// anchor tier for the nearest unowned piece; returns null only if every
// tier in that slot is already owned.
// Gear chests drop unidentified — the roll picks a real, specific item right
// now (same anchored-to-depth logic as always), but it lands in
// unidentifiedItems instead of the slot's owned list. Deckard Cain reveals
// (and grants ownership of) it later, for a fee.
function rollGear(state, depth) {
  const player = state.player;
  const slot = GEAR_SLOT_KEYS[Math.floor(Math.random() * GEAR_SLOT_KEYS.length)];
  const { order, ownedField } = GEAR_SLOTS[slot];
  const owned = player[ownedField];
  const pending = player.unidentifiedItems.filter((u) => u.slot === slot).map((u) => u.key);
  const anchor = Math.max(0, Math.min(order.length - 1, depth + rand(-1, 1)));
  let key = null;
  for (let offset = 0; offset < order.length && !key; offset++) {
    for (const candidate of [anchor + offset, anchor - offset]) {
      if (candidate < 0 || candidate >= order.length) continue;
      const candidateKey = order[candidate];
      if (!owned.includes(candidateKey) && !pending.includes(candidateKey)) { key = candidateKey; break; }
    }
  }
  if (!key) return null;
  player.unidentifiedItems.push({ slot, key });
  return { type: 'gear', slot, key };
}

// Companion Charms are chest-only — no Buy flow at the Tamer at all — so
// this is the sole way to acquire one. Same "nearest unowned tier anchored
// to zone depth" search as rollGear, just over the one CHARM_ORDER list.
function rollCharm(state, depth) {
  const player = state.player;
  const order = CHARM_ORDER;
  const owned = player.ownedCharms;
  const anchor = Math.max(0, Math.min(order.length - 1, depth + rand(-1, 1)));
  let key = null;
  for (let offset = 0; offset < order.length && !key; offset++) {
    for (const candidate of [anchor + offset, anchor - offset]) {
      if (candidate < 0 || candidate >= order.length) continue;
      const candidateKey = order[candidate];
      if (!owned.includes(candidateKey)) { key = candidateKey; break; }
    }
  }
  if (!key) return null;
  player.ownedCharms.push(key);
  return { type: 'charm', key };
}

// Same "nearest unowned tier anchored to zone depth" search as rollCharm,
// generalized over any {order, ownedField} pair — Amulet and both Ring
// slots are chest-only exactly like Charms, just two more parallel lists.
function rollTrinket(state, depth, order, ownedField) {
  const player = state.player;
  const owned = player[ownedField];
  const anchor = Math.max(0, Math.min(order.length - 1, depth + rand(-1, 1)));
  let key = null;
  for (let offset = 0; offset < order.length && !key; offset++) {
    for (const candidate of [anchor + offset, anchor - offset]) {
      if (candidate < 0 || candidate >= order.length) continue;
      const candidateKey = order[candidate];
      if (candidateKey !== 'none' && !owned.includes(candidateKey)) { key = candidateKey; break; }
    }
  }
  if (!key) return null;
  player[ownedField].push(key);
  return key;
}

// Rolls a chest drop after a non-boss win. Mutates player state directly
// (same pattern as grantRewards) and returns a description of the loot, or
// null if no chest appeared. `guaranteed` skips the appearance roll
// entirely — used for Elite kills, which always drop something.
export function rollChest(state, guaranteed = false) {
  const player = state.player;
  if (!guaranteed && Math.random() >= CHEST_CHANCE + itemFindBonus(player) / 100) return null;
  const depth = (MAPS[state.mapId] && MAPS[state.mapId].depth) || 0;
  const roll = Math.random();

  if (roll < 0.20) {
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.38) {
    // Deeper zones have a rising chance of the Greater tier instead of the
    // basic potion/ether — same "deeper = better loot" pattern as gold/gear.
    const greaterChance = Math.min(0.5, depth * 0.04);
    const itemRoll = Math.random();
    let itemKey;
    if (itemRoll < 0.3) itemKey = Math.random() < greaterChance ? 'greaterPotion' : 'potion';
    else if (itemRoll < 0.55) itemKey = Math.random() < greaterChance ? 'greaterEther' : 'ether';
    else if (itemRoll < 0.75) itemKey = 'townScroll';
    else itemKey = Math.random() < greaterChance ? 'greaterCaptureOrb' : 'captureOrb';
    player.inventory[itemKey] = (player.inventory[itemKey] || 0) + 1;
    return { type: 'item', itemKey };
  }

  if (roll < 0.56) {
    const gear = rollGear(state, depth);
    if (gear) return gear;
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.68) {
    const charm = rollCharm(state, depth);
    if (charm) return charm;
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.76) {
    const key = rollTrinket(state, depth, AMULET_ORDER, 'ownedAmulets');
    if (key) return { type: 'amulet', key };
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.84) {
    const key = rollTrinket(state, depth, RING_ORDER, 'ownedRings');
    if (key) return { type: 'ring', key };
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  const learnable = Object.values(SKILLS).filter(
    (s) => s.key !== 'fireball' && !player.knownSkills.includes(s.key)
  );
  if (learnable.length === 0) {
    return { type: 'gold', amount: goldDrop(state, depth) };
  }
  const skill = learnable[Math.floor(Math.random() * learnable.length)];
  player.knownSkills.push(skill.key);
  return { type: 'scroll', skillKey: skill.key };
}
