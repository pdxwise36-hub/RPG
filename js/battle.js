import { ITEMS, SKILLS, ALL_PET_DEFS, CHARM_ORDER, AMULET_ORDER, RING_ORDER, HELD_ITEM_ORDER, GEM_TYPE_KEYS, AFFIX_ORDER, AFFIX_CHANCE, MERCENARIES, MERC_WEAPONS, LEGENDARIES, LEGENDARY_DROP_CHANCE, elementMultiplier, SHINY_CHANCE, LEVEL_GROWTH, MAPS, GEAR_SLOTS, PET_ENERGY_MAX, PET_ENERGY_PER_HIT, PET_SKILL_MULTIPLIER, ngPlusMultiplier, difficultyByKey } from './data.js';
import { effectiveAtk, effectiveDef, petEffectivePower, petDisplayName, charmPowerBonus, petPowerSetBonus, gearPetPowerBonus, heldItemPetPowerBonus, hpRegenPercent, mercPowerSetBonus, elementalBonusPercent, itemFindBonus, skillPowerBonus, companionAbilityBonus, petOwnAbilityBonus, applyLevelUps, findPetInstance, makePetInstance, mpCostReduction, xpBonusPercent, critChance, dodgeChance, goldBonusPercent, mpRegenPercent, reflectPercent, mercDamageReduction } from './state.js';

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

// Shared by both scaling axes below — enemyMult raises maxHp/atk/def,
// rewardMult raises xp/gold. New Game+ uses the same value for both; a
// Difficulty tier deliberately uses two different ones (harder AND more
// rewarding by different amounts), which is why this takes them separately
// instead of a single combined multiplier.
function scaleEnemyStats(enemyDef, enemyMult, rewardMult) {
  if (enemyMult === 1 && rewardMult === 1) return enemyDef;
  return {
    ...enemyDef,
    maxHp: Math.round(enemyDef.maxHp * enemyMult),
    atk: Math.round(enemyDef.atk * enemyMult),
    def: Math.round(enemyDef.def * enemyMult),
    xp: Math.round(enemyDef.xp * rewardMult),
    goldMin: Math.round(enemyDef.goldMin * rewardMult),
    goldMax: Math.round(enemyDef.goldMax * rewardMult),
  };
}

// Scales an enemy/boss def up for New Game+ — every cycle raises stats and
// payout together so pushing through the chain again stays worthwhile.
export function scaleForNGPlus(enemyDef, ngPlusLevel) {
  const mult = ngPlusMultiplier(ngPlusLevel);
  return scaleEnemyStats(enemyDef, mult, mult);
}

// Scales an enemy/boss def for the player's current Difficulty tier (see
// DIFFICULTIES in data.js) — independent of, and stacks with, NG+.
export function scaleForDifficulty(enemyDef, difficultyKey) {
  const d = difficultyByKey(difficultyKey);
  return scaleEnemyStats(enemyDef, d.enemyMultiplier, d.rewardMultiplier);
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
// A Swift companion's Rally (see petActiveSkill) can also guarantee the
// very next dodge outright, consuming battle.guaranteedDodge once used.
function rollDodge(player, battle) {
  if (battle && battle.guaranteedDodge) {
    battle.guaranteedDodge = false;
    return true;
  }
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
  if (rollDodge(player, battle)) {
    pushLog(battle, `You dodge ${battle.enemy.name}'s attack!`);
  } else {
    let dmg = damageRoll(battle.enemy.atk, effectiveDef(player));
    // A Guardian companion ability, a hired Mercenary's own armor, and a
    // Guardian companion's Rally-granted one-time shield all stack, capped
    // well short of making a hit do nothing.
    let reduction = companionAbilityBonus(player, 'guardian') + mercDamageReduction(player);
    if (battle.shieldActive) {
      reduction += 50;
      battle.shieldActive = false;
    }
    if (reduction > 0) dmg = Math.max(1, Math.round(dmg * (1 - Math.min(90, reduction) / 100)));
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

// One party member's own auto-hit — shared by the leader and every support
// companion in petAttacks below, so a full 5-pet party lands 5 separate
// hits each round instead of just the leader's one. Vampiric healing is
// checked against THIS pet's own ability (petOwnAbilityBonus), not the
// whole party's combined total, so one companion's hit can't double-count
// another's Vampiric.
function onePetAttack(battle, state, petId) {
  const player = state.player;
  const instance = findPetInstance(player, petId);
  const pet = instance && ALL_PET_DEFS[instance.key];
  if (!pet) return;
  const power = petEffectivePower(player, petId) * (1 + (charmPowerBonus(player) + petPowerSetBonus(player) + gearPetPowerBonus(player) + heldItemPetPowerBonus(player, petId)) / 100);
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * power));
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${petDisplayName(player, petId)} attacks ${battle.enemy.name} for ${dmg}!`);
  const vampiric = petOwnAbilityBonus(player, petId, 'vampiric');
  if (vampiric > 0 && player.hp < player.maxHp) {
    const healed = Math.min(player.maxHp - player.hp, Math.round(dmg * vampiric / 100));
    if (healed > 0) {
      player.hp += healed;
      pushLog(battle, `${pet.name}'s bite heals you for ${healed}!`);
    }
  }
  battle.petEnergy = Math.min(PET_ENERGY_MAX, (battle.petEnergy || 0) + PET_ENERGY_PER_HIT);
}

// Every party member (leader plus up to 4 support companions, see
// player.partyIds) lands its own auto-hit each round, stopping early if an
// earlier hit already finishes the enemy off.
function petAttacks(battle, state) {
  const player = state.player;
  const party = player.partyIds && player.partyIds.length > 0 ? player.partyIds : (player.activePetId ? [player.activePetId] : []);
  for (const petId of party) {
    if (checkEnemyDefeated(battle)) break;
    onePetAttack(battle, state, petId);
  }
}

// The hired Mercenary (see MERCENARIES in data.js) auto-attacks every round
// exactly like a pet does, stacking with whichever companion is also
// active — no XP/leveling of its own, just its hire tier plus whatever
// small Weapon it's carrying.
function mercAttacks(battle, state) {
  const player = state.player;
  if (player.mercTier < 0) return;
  const merc = MERCENARIES[player.mercTier];
  const weapon = MERC_WEAPONS[player.mercWeaponKey] || MERC_WEAPONS.none;
  const power = merc.power * (1 + mercPowerSetBonus(player) / 100);
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * power) + weapon.atkBonus);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${merc.name} strikes ${battle.enemy.name} for ${dmg}!`);
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

// A Leftovers-holding companion tops the player's HP back up each round,
// same cadence/shape as the Amulet's MP regen above.
function applyHeldItemRegen(battle, state) {
  const player = state.player;
  const regen = hpRegenPercent(player);
  if (regen <= 0 || player.hp >= player.maxHp) return;
  const healed = Math.min(player.maxHp - player.hp, Math.max(1, Math.round(player.maxHp * regen / 100)));
  if (healed > 0) {
    player.hp += healed;
    pushLog(battle, `You steadily recover, restoring ${healed} HP.`);
  }
}

// Shared tail end of a round once the pet's own contribution (if any) is
// settled — used both after a normal petAttacks and after the Companion
// Skill burst, which replaces petAttacks for that round instead of adding
// to it. The Mercenary always attacks here regardless of which path led in,
// since its own turn isn't affected by whichever choice you made for your
// companion.
function finishRound(battle, state) {
  if (checkEnemyDefeated(battle)) return;
  mercAttacks(battle, state);
  if (checkEnemyDefeated(battle)) return;
  applyMpRegen(battle, state);
  applyHeldItemRegen(battle, state);
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
// forgoing your own action that round. Each companion ability also flavors
// the Rally with its own extra effect (gated the same way the passive
// itself is — level 10+, via companionAbilityBonus) instead of it reading
// identically for every pet.
export function petActiveSkill(battle, state) {
  if (battle.over) return;
  const player = state.player;
  const petId = player.activePetId;
  const instance = findPetInstance(player, petId);
  const pet = instance && ALL_PET_DEFS[instance.key];
  if (!pet || (battle.petEnergy || 0) < PET_ENERGY_MAX) return;
  battle.petEnergy = 0;
  let power = petEffectivePower(player, petId) * (1 + (charmPowerBonus(player) + petPowerSetBonus(player) + gearPetPowerBonus(player) + heldItemPetPowerBonus(player, petId)) / 100) * PET_SKILL_MULTIPLIER;
  if (petOwnAbilityBonus(player, petId, 'berserker') > 0) power *= 1.5;
  const dmg = Math.max(1, Math.round(effectiveAtk(player) * power));
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  pushLog(battle, `${petDisplayName(player, petId)} unleashes a Rally on ${battle.enemy.name} for ${dmg}!`);

  const vampiric = petOwnAbilityBonus(player, petId, 'vampiric');
  if (vampiric > 0 && player.hp < player.maxHp) {
    const healed = Math.min(player.maxHp - player.hp, Math.round(dmg * (vampiric * 2) / 100));
    if (healed > 0) {
      player.hp += healed;
      pushLog(battle, `${pet.name}'s bite heals you for ${healed}!`);
    }
  }
  if (petOwnAbilityBonus(player, petId, 'guardian') > 0) {
    battle.shieldActive = true;
    pushLog(battle, `${pet.name} braces to shield your next hit!`);
  }
  if (petOwnAbilityBonus(player, petId, 'swift') > 0) {
    battle.guaranteedDodge = true;
    pushLog(battle, `${pet.name}'s speed guarantees your next dodge!`);
  }
  if (petOwnAbilityBonus(player, petId, 'blessed') > 0 && battle.enemy.hp <= 0) {
    const bonus = 30;
    player.gold += bonus;
    pushLog(battle, `${pet.name}'s luck finds an extra ${bonus}G!`);
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
  // Elemental effectiveness (see ELEMENT_ADVANTAGE in data.js) — resolved
  // against whichever zone the player is physically standing in when the
  // Skill is cast, not a per-enemy field, so Arena/Boss Rush/Rival fights
  // (fought from Town, which carries no element) stay neutral rather than
  // needing every reskinned/scaled enemy def to carry its own element too.
  const defendElement = (MAPS[state.mapId] && MAPS[state.mapId].element) || null;
  const baseElementMult = elementMultiplier(skill.element, defendElement);
  // Elementalist's Attunement amplifies an advantage further and softens a
  // disadvantage, rather than adding a flat stat — a 40% bonus turns 1.5x
  // into 1.7x and 0.67x into ~0.80x.
  const elementBonus = elementalBonusPercent(player) / 100;
  const elementMult = baseElementMult > 1 ? 1 + (baseElementMult - 1) * (1 + elementBonus)
    : baseElementMult < 1 ? 1 - (1 - baseElementMult) * Math.max(0, 1 - elementBonus)
    : 1;
  dmg = Math.max(2, Math.round(dmg * elementMult));
  const crit = rollCrit(player);
  if (crit) dmg *= 2;
  battle.enemy.hp = Math.max(0, battle.enemy.hp - dmg);
  const effectivenessTag = elementMult > 1 ? ' Super effective!' : elementMult < 1 ? ' Not very effective...' : '';
  pushLog(battle, `${crit ? 'Critical hit! ' : ''}${skill.name} hits ${battle.enemy.name} for ${dmg}!${effectivenessTag}`);
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
// current enemy as a brand-new companion INSTANCE instead of defeating it
// for the usual gold/XP/bestiary credit — catching is a genuine alternative
// to a kill, not a strictly-better bonus on top of one. Bosses can never be
// captured, so the boss-gated level chain is untouched by this system.
// Already owning a species never blocks a new attempt — an Elite or Shiny
// catch is worth going for even if you've already got a plain one, and each
// catch is its own permanent instance rather than a single "do you have
// this species" flag.
export function playerCapture(battle, state, itemKey) {
  if (battle.over) return;
  const player = state.player;
  const item = ITEMS[itemKey];
  if (!item || !item.capture || (player.inventory[itemKey] || 0) <= 0) return;
  if (battle.isBoss) {
    pushLog(battle, `${battle.enemy.name} is too powerful to capture!`);
    return;
  }
  player.inventory[itemKey] -= 1;
  const hpPercent = battle.enemy.hp / battle.enemy.maxHp;
  const chance = Math.min(0.95, item.captureBase + (1 - hpPercent) * item.captureHpBonus);
  if (Math.random() < chance) {
    const shiny = Math.random() < SHINY_CHANCE;
    const elite = !!battle.enemy.isElite;
    const instance = makePetInstance(battle.enemy.key, { shiny, elite });
    player.pets.push(instance);
    // Only auto-join the party for your very first-ever companion — later
    // captures just join the owned roster, added to the party by hand from
    // the Pet Tamer screen.
    if (player.partyIds.length === 0) {
      player.partyIds.push(instance.id);
      player.activePetId = instance.id;
    }
    battle.over = true;
    battle.result = 'captured';
    // battle.enemy.name is already "Elite <name>" when isElite is true (see
    // makeElite in data.js) — only Shiny needs a prefix of its own here, to
    // avoid saying "Elite" twice.
    const tag = shiny ? 'A Shiny ' : (elite ? 'An ' : '');
    pushLog(battle, tag ? `Gotcha! ${tag}${battle.enemy.name} was captured!` : `Gotcha! ${battle.enemy.name} was captured!`);
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

// Returns { leveledUp, levels, petLevelUps } describing how many level-ups
// occurred. Every party member (not just the leader) earns the exact same
// (already-boosted) XP as the player from this kill and levels on the exact
// same curve, so none of them lag behind as long as they've been in the
// party the whole way. Boots boost gold found and a helm boosts XP gained,
// both applied here since every kill (regular, boss, or Arena) funnels
// through this one function.
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

  const party = player.partyIds && player.partyIds.length > 0 ? player.partyIds : (player.activePetId ? [player.activePetId] : []);
  const petLevelUps = [];
  party.forEach((petId) => {
    const instance = findPetInstance(player, petId);
    if (!instance) return;
    instance.xp += xpWon;
    const petLevels = applyLevelUps(instance);
    if (petLevels > 0) petLevelUps.push({ petId, key: instance.key, levels: petLevels, newLevel: instance.level });
  });

  return {
    goldWon, xpWon,
    leveledUp: levels > 0, levels,
    petLevelUps,
  };
}

const CHEST_CHANCE = 0.25;

// Chest gold scales with how deep the current zone is in the chain (0 =
// overworld, 13 = the Void Rift) — the same "found 15-40 gold" roll is worth
// noticeably more once you're deep in, and further scaled by the current
// Difficulty tier's reward multiplier.
function goldDrop(state, depth) {
  const rewardMult = difficultyByKey(state.player.difficulty).rewardMultiplier;
  const amount = Math.round(rand(15, 40) * (1 + depth * 0.2) * rewardMult);
  state.player.gold += amount;
  return amount;
}

// Rolls for a Legendary Item drop (see LEGENDARIES in data.js) after a boss
// kill — one specific boss per slot, and only if that slot hasn't already
// been earned. Returns the slot name on a hit, null otherwise.
export function rollLegendaryDrop(state, bossKey) {
  const player = state.player;
  const slot = Object.keys(LEGENDARIES).find((s) => LEGENDARIES[s].bossKey === bossKey && !player.ownedLegendaries.includes(s));
  if (!slot) return null;
  if (Math.random() >= LEGENDARY_DROP_CHANCE) return null;
  player.ownedLegendaries.push(slot);
  return slot;
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
  // A chest-found piece has a chance to come with a bonus Affix (see
  // AFFIXES in data.js) stuck to that slot+key permanently, revealed
  // alongside the piece itself once Deckard Cain identifies it.
  const affixKey = Math.random() < AFFIX_CHANCE ? AFFIX_ORDER[Math.floor(Math.random() * AFFIX_ORDER.length)] : null;
  player.unidentifiedItems.push({ slot, key, affixKey });
  return { type: 'gear', slot, key, affixKey };
}

// Gems are stackable (tracked in player.inventory just like potions/orbs)
// rather than owned-or-not — deeper zones skew toward bigger sizes instead
// of anchoring to a specific tier index the way gear/trinkets do.
function rollGem(state, depth) {
  const player = state.player;
  const sizeRoll = Math.random() + depth * 0.02;
  const size = sizeRoll < 0.6 ? 'Small' : sizeRoll < 0.9 ? 'Medium' : 'Large';
  const gemType = GEM_TYPE_KEYS[Math.floor(Math.random() * GEM_TYPE_KEYS.length)];
  const key = `${gemType}${size}`;
  player.inventory[key] = (player.inventory[key] || 0) + 1;
  return { type: 'gem', key };
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

  if (roll < 0.16) {
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.32) {
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

  if (roll < 0.48) {
    const gear = rollGear(state, depth);
    if (gear) return gear;
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.58) {
    const charm = rollCharm(state, depth);
    if (charm) return charm;
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.65) {
    const key = rollTrinket(state, depth, AMULET_ORDER, 'ownedAmulets');
    if (key) return { type: 'amulet', key };
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.72) {
    const key = rollTrinket(state, depth, RING_ORDER, 'ownedRings');
    if (key) return { type: 'ring', key };
    return { type: 'gold', amount: goldDrop(state, depth) };
  }

  if (roll < 0.82) {
    return rollGem(state, depth);
  }

  if (roll < 0.90) {
    const key = rollTrinket(state, depth, HELD_ITEM_ORDER, 'ownedHeldItems');
    if (key) return { type: 'helditem', key };
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
