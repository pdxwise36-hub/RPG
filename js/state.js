import { PLAYER_BASE, WEAPONS, ARMORS, HELMETS, GLOVES, BOOTS, AMULETS, RINGS, CHARMS, HELD_ITEMS, MERCENARIES, MERC_WEAPONS, MERC_ARMORS, AFFIXES, GEMS, socketCount, LEGENDARIES, COMPANION_ABILITIES, COMPANION_ABILITY_LEVEL, PET_EVOLVE_LEVEL, PET_EVOLVE_MULTIPLIER, SHINY_POWER_MULTIPLIER, SET_BONUSES, GEAR_SLOTS, ENCHANT_STATS, MAPS, ALL_PET_DEFS, LEVEL_GROWTH, PET_LEVEL_POWER_BONUS, LEVEL_CHAIN, ACHIEVEMENTS } from './data.js';
import { generateZoneGrid, getTownLayout } from './mapgen.js';

// Ensures state.layouts[mapId] exists, generating a fresh random layout when
// needed. Town's layout is fixed and never regenerates. Every other zone is
// a "level" that gets a brand new random layout each time you step into it
// (forceRegenerate), which is what makes arriving somewhere fresh instead of
// memorizing a fixed corridor.
export function ensureLayout(state, mapId, forceRegenerate = false) {
  if (mapId === 'town') {
    if (!state.layouts.town) state.layouts.town = getTownLayout();
    return state.layouts.town;
  }
  if (forceRegenerate || !state.layouts[mapId]) {
    const hasNextLevel = !!(MAPS[mapId] && MAPS[mapId].nextMap);
    state.layouts[mapId] = generateZoneGrid(hasNextLevel);
  }
  return state.layouts[mapId];
}

export function newGameState(heroName) {
  const player = structuredClone(PLAYER_BASE);
  const trimmed = (heroName || '').trim();
  if (trimmed) player.name = trimmed.slice(0, 12);
  const state = {
    player,
    mapId: 'town',
    pos: { x: 0, y: 0 },
    flags: {},
    layouts: {},
    // The level to return to when you exit town — town itself has no
    // levels/boss, so this always points at whichever level you're
    // actually progressing through.
    currentLevelId: 'overworld',
    // Every level id ever set foot in — lets the Town portal offer a Travel
    // menu to any of them, not just whichever one is "current."
    reachedLevels: ['overworld'],
    // Next Arena wave to fight. A loss or leaving both pick back up just
    // past your best cleared wave (player.arenaBestWave) rather than
    // resetting all the way to 1 — only the in-progress attempt is lost.
    arenaWave: 1,
  };
  const layout = ensureLayout(state, 'town');
  state.pos = { ...layout.startPos };
  return state;
}

// Starts a fresh New Game+ cycle: the level chain resets (flags, layouts,
// progress) so you walk it again from the outskirts, but the character
// itself — level, gear, pets, skills, gold, bestiary, achievements,
// enchants, bounty progress — carries over untouched. Enemy/boss stats
// (and their payout) scale up further with each cycle via ngPlusMultiplier.
export function startNewGamePlus(state) {
  const player = state.player;
  player.ngPlusLevel = (player.ngPlusLevel || 0) + 1;
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  state.flags = {};
  state.layouts = {};
  state.mapId = 'town';
  state.currentLevelId = 'overworld';
  state.reachedLevels = ['overworld'];
  const layout = ensureLayout(state, 'town');
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
    currentLevelId: state.currentLevelId,
    reachedLevels: state.reachedLevels,
    arenaWave: state.arenaWave,
  };
}

export function fromSaveObject(saved) {
  const player = {
    ...structuredClone(PLAYER_BASE),
    ...saved.player,
    inventory: { ...PLAYER_BASE.inventory, ...saved.player.inventory },
    // Saves predating the Helmet/Gloves/Boots Enchant expansion only have
    // weapon/armor keys here — a plain spread would otherwise wholesale
    // replace enchantLevels and drop the newer slots' empty defaults.
    enchantLevels: { ...PLAYER_BASE.enchantLevels, ...saved.player.enchantLevels },
  };
  // Migrate pre-Party saves: old shape only ever had a single activePetKey,
  // no partyKeys array at all — carry that one companion over as a 1-member
  // party rather than losing it. Newer saves already have their own
  // partyKeys, which the spread above preserved.
  if ((!player.partyKeys || player.partyKeys.length === 0) && saved.player.activePetKey) {
    player.partyKeys = [saved.player.activePetKey];
  }
  // activePetKey is always partyKeys[0] (or null) — reassert this on load in
  // case a save was hand-edited or predates the invariant.
  player.activePetKey = player.partyKeys.length > 0 ? player.partyKeys[0] : null;
  // Migrate pre-equipment saves: old shape had flat atk/def instead of
  // baseAtk/baseDef, and no weapon/armor keys. Carry the old totals over as
  // the new base stats so returning players don't get quietly nerfed.
  if (saved.player.baseAtk === undefined && saved.player.atk !== undefined) {
    player.baseAtk = saved.player.atk;
    player.baseDef = saved.player.def;
  }
  // Migrate pre-lockstep pet saves: old shape stored a flat cumulative XP
  // number per pet (under petXp) on a flat +50/level curve instead of the
  // current {level, xp, xpToNext} shape. Replay that cumulative total
  // through the current shared curve so an already-leveled pet keeps its
  // progress instead of getting quietly reset to level 1.
  if (saved.player.petXp && Object.keys(saved.player.petXp).length > 0
    && (!saved.player.petProgress || Object.keys(saved.player.petProgress).length === 0)) {
    const migrated = {};
    for (const [petKey, oldXp] of Object.entries(saved.player.petXp)) {
      const progress = { level: 1, xp: oldXp, xpToNext: PLAYER_BASE.xpToNext };
      applyLevelUps(progress);
      migrated[petKey] = progress;
    }
    player.petProgress = migrated;
  }
  return {
    player,
    // Older saves predate later zones/flags — default to the overworld.
    mapId: saved.mapId || 'overworld',
    pos: { ...saved.pos },
    flags: { ...saved.flags },
    layouts: { ...saved.layouts },
    // Pre-town saves predate this field entirely — whatever level they were
    // in (their old mapId) is exactly the level to remember returning to.
    currentLevelId: saved.currentLevelId || saved.mapId || 'overworld',
    // Pre-Travel-menu saves predate this field entirely — since the chain is
    // boss-gated, having reached currentLevelId means every level before it
    // in the chain was reached too, so reconstruct the list from that.
    reachedLevels: saved.reachedLevels && saved.reachedLevels.length > 0
      ? saved.reachedLevels
      : reachedLevelsUpTo(saved.currentLevelId || saved.mapId || 'overworld'),
    arenaWave: saved.arenaWave || 1,
  };
}

function reachedLevelsUpTo(mapId) {
  const idx = LEVEL_CHAIN.indexOf(mapId);
  return idx === -1 ? ['overworld'] : LEVEL_CHAIN.slice(0, idx + 1);
}

// How many pieces of `set` are currently equipped (not just owned) — used
// both to find the applicable cumulative threshold and to show progress in
// the UI even when a set isn't fully worn yet. Exported so the Status
// screen's full Sets catalog can show worn-count for every set, not just
// ones already past the 2-piece minimum (see activeSetProgress below).
export function setWornCount(player, set) {
  return Object.entries(set.pieces).filter(([slot, key]) => player[GEAR_SLOTS[slot].equipField] === key).length;
}

// The bonus object for whichever threshold `set` currently qualifies for
// (the highest one at or below the worn count), or null below the 2-piece
// minimum. Thresholds store the full cumulative bonus at that count, not a
// delta, so a 4th piece is a strict upgrade over 3.
function activeThreshold(set, wornCount) {
  const keys = Object.keys(set.thresholds).map(Number).filter((n) => n <= wornCount).sort((a, b) => b - a);
  return keys.length > 0 ? set.thresholds[keys[0]] : null;
}

// Every set with at least a 2-piece bonus currently active, most useful for
// the Status screen ("which sets am I benefiting from right now").
export function activeSetProgress(player) {
  return SET_BONUSES.map((set) => {
    const wornCount = setWornCount(player, set);
    return { set, wornCount, bonus: activeThreshold(set, wornCount) };
  }).filter((entry) => entry.bonus);
}

// Sums `statKey` across every currently-active set bonus — a player could
// have pieces of more than one set equipped at once (one slot each), so
// this is a sum, not a single lookup.
function setBonusValue(player, statKey) {
  return activeSetProgress(player).reduce((sum, { bonus }) => sum + (bonus[statKey] || 0), 0);
}

export function enchantLevel(player, slot, key) {
  return (player.enchantLevels && player.enchantLevels[slot] && player.enchantLevels[slot][key]) || 0;
}

// The enchant bonus for one specific stat field on whichever piece is
// currently equipped in `slot` — 0 if that slot's ENCHANT_STATS doesn't
// touch that field at all.
function enchantStatBonus(player, slot, equippedKey, statKey) {
  const perLevel = (ENCHANT_STATS[slot] && ENCHANT_STATS[slot][statKey]) || 0;
  return perLevel * enchantLevel(player, slot, equippedKey);
}

// The Affix bonus (see AFFIXES in data.js) for one specific stat, stuck to
// whichever piece is CURRENTLY EQUIPPED in `slot` — an affix belongs to a
// slot+key, not a live roll, so this is just an equipped-key lookup.
function affixStatBonus(player, slot, statKey) {
  const key = player[GEAR_SLOTS[slot].equipField];
  const affixKey = player.gearAffixes && player.gearAffixes[slot] && player.gearAffixes[slot][key];
  const affix = affixKey && AFFIXES[affixKey];
  return affix && affix.statKey === statKey ? affix.value : 0;
}

// Same shape as affixStatBonus but for a socketed Gem (see GEMS/socketCount
// in data.js).
function gemStatBonus(player, slot, statKey) {
  const key = player[GEAR_SLOTS[slot].equipField];
  const gemKey = player.socketedGems && player.socketedGems[slot] && player.socketedGems[slot][key];
  const gem = gemKey && GEMS[gemKey];
  return gem && gem.statKey === statKey ? gem.value : 0;
}

// Same shape as affixStatBonus/gemStatBonus but for a Legendary (see
// LEGENDARIES in data.js) — a slot's Legendary only contributes once it's
// both been earned (in player.ownedLegendaries) AND its specific key is
// currently equipped in that slot.
function legendaryStatBonus(player, slot, statKey) {
  const leg = LEGENDARIES[slot];
  if (!leg || !player.ownedLegendaries.includes(slot) || player[GEAR_SLOTS[slot].equipField] !== leg.key) return 0;
  return leg.statKey === statKey ? leg.value : 0;
}

// A Gem's type (Ruby=atk, Sapphire=def, ...) is independent of which of the
// five slots it happens to be socketed into, so unlike Enchant (always the
// slot's own native stat) this sums affix+gem+legendary contributions to
// `statKey` across ALL five slots — a Ruby socketed into your Boots still
// boosts ATK.
function gearBonusAcrossSlots(player, statKey) {
  return Object.keys(GEAR_SLOTS).reduce((sum, slot) => sum + affixStatBonus(player, slot, statKey) + gemStatBonus(player, slot, statKey) + legendaryStatBonus(player, slot, statKey), 0);
}

export function effectiveAtk(player) {
  const weapon = WEAPONS[player.weaponKey] || WEAPONS.rustySword;
  return player.baseAtk + weapon.atkBonus + enchantStatBonus(player, 'weapon', player.weaponKey, 'atkBonus') + setBonusValue(player, 'atk') + gearBonusAcrossSlots(player, 'atk');
}

export function effectiveDef(player) {
  const armor = ARMORS[player.armorKey] || ARMORS.clothTunic;
  return player.baseDef + armor.defBonus + enchantStatBonus(player, 'armor', player.armorKey, 'defBonus') + setBonusValue(player, 'def') + gearBonusAcrossSlots(player, 'def');
}

// Held Items (see HELD_ITEMS in data.js) stick to one specific companion
// permanently — this reads whichever item (if any) `petKey` holds, 0 if it
// doesn't touch `statKey`.
export function heldItemBonus(player, petKey, statKey) {
  const itemKey = player.heldItems && player.heldItems[petKey];
  const item = itemKey && HELD_ITEMS[itemKey];
  return item && item.statKey === statKey ? item.value : 0;
}

// Convenience for the player-facing stat accessors below: the held-item
// bonus for whichever companion is CURRENTLY active, 0 if none — Held
// Items only apply "while this companion is active," same condition as a
// Companion Charm.
function activeHeldItemBonus(player, statKey) {
  return player.activePetKey ? heldItemBonus(player, player.activePetKey, statKey) : 0;
}

// Helmets, Gloves, and Boots each carry their own unique mechanic instead of
// flat ATK/DEF — these read the equipped piece the same way effectiveAtk/Def
// read the weapon/armor, each also picking up its own slot's Enchant bonus,
// any Affix/Gem bonus to that same stat regardless of which slot it's on,
// and (where it makes sense) the active companion's Held Item.
export function mpCostReduction(player) {
  return (HELMETS[player.helmKey] || HELMETS.clothCap).mpCostReduction + enchantStatBonus(player, 'helmet', player.helmKey, 'mpCostReduction') + setBonusValue(player, 'mpCostReduction') + gearBonusAcrossSlots(player, 'mpCostReduction');
}

export function xpBonusPercent(player) {
  return (HELMETS[player.helmKey] || HELMETS.clothCap).xpBonusPercent + enchantStatBonus(player, 'helmet', player.helmKey, 'xpBonusPercent') + setBonusValue(player, 'xpBonusPercent') + gearBonusAcrossSlots(player, 'xpBonusPercent') + activeHeldItemBonus(player, 'xpBonusPercent');
}

export function critChance(player) {
  return (GLOVES[player.glovesKey] || GLOVES.clothWraps).critChance + enchantStatBonus(player, 'gloves', player.glovesKey, 'critChance') + setBonusValue(player, 'critChance') + gearBonusAcrossSlots(player, 'critChance') + activeHeldItemBonus(player, 'critChance');
}

export function dodgeChance(player) {
  return (BOOTS[player.bootsKey] || BOOTS.wornSandals).dodgeChance + enchantStatBonus(player, 'boots', player.bootsKey, 'dodgeChance') + setBonusValue(player, 'dodgeChance') + gearBonusAcrossSlots(player, 'dodgeChance') + activeHeldItemBonus(player, 'dodgeChance');
}

export function goldBonusPercent(player) {
  return (BOOTS[player.bootsKey] || BOOTS.wornSandals).goldBonusPercent + enchantStatBonus(player, 'boots', player.bootsKey, 'goldBonusPercent') + setBonusValue(player, 'goldBonusPercent') + gearBonusAcrossSlots(player, 'goldBonusPercent') + activeHeldItemBonus(player, 'goldBonusPercent');
}

// petPowerBonus isn't tied to any one slot's own mechanic (unlike the
// above), so this is the Affix/Gem equivalent of petPowerSetBonus below —
// summed across all five slots the same way gearBonusAcrossSlots works.
export function gearPetPowerBonus(player) {
  return gearBonusAcrossSlots(player, 'petPowerBonus');
}

// The Held Item multiplier on one specific companion's OWN power (distinct
// from petPowerSetBonus/charmPowerBonus/gearPetPowerBonus, which all boost
// "whichever companion is active" instead) — applied in battle.js's
// petAttacks alongside those.
export function heldItemPetPowerBonus(player, petKey) {
  return heldItemBonus(player, petKey, 'petPower');
}

// Per-turn HP regen, combining Leftovers (the active companion's Held Item,
// see applyHeldItemRegen in battle.js) with Warden's Bulwark's own set
// bonus — both feed the same stat, so callers read this one combined total
// instead of picking a single source.
export function hpRegenPercent(player) {
  return activeHeldItemBonus(player, 'hpRegenPercent') + setBonusValue(player, 'hpRegenPercent');
}

// The hireable Mercenary's own contribution — no XP/leveling, just its tier
// (see MERCENARIES) plus whatever small Weapon/Armor it's wearing. Armor's
// defBonus converts into a modest, capped damage-reduction on incoming
// hits (stacking with a Guardian companion's own %) instead of doing
// nothing, so buying Mercenary Armor is a real choice, not just flavor.
export function mercEffectivePower(player) {
  return player.mercTier >= 0 ? MERCENARIES[player.mercTier].power : 0;
}
export function mercWeaponAtkBonus(player) {
  return (MERC_WEAPONS[player.mercWeaponKey] || MERC_WEAPONS.none).atkBonus;
}
export function mercDamageReduction(player) {
  if (player.mercTier < 0) return 0;
  const armor = MERC_ARMORS[player.mercArmorKey] || MERC_ARMORS.none;
  return Math.min(25, Math.round(armor.defBonus * 0.6));
}
// Warlord's Vanguard's own set bonus — a flat % boost to the Mercenary's
// power, applied in battle.js's mercAttacks alongside its own tier/weapon.
export function mercPowerSetBonus(player) {
  return setBonusValue(player, 'mercPowerBonus');
}

// Elementalist's Attunement's own set bonus — amplifies the elemental
// effectiveness triangle's swing (see elementMultiplier in data.js) rather
// than adding a flat stat, applied in battle.js's playerSkill.
export function elementalBonusPercent(player) {
  return setBonusValue(player, 'elementalBonusPercent');
}

// The Amulet slowly restores MP each of your turns (see applyMpRegen in
// battle.js) — chest-only, not part of GEAR_SLOTS/SET_BONUSES.
export function mpRegenPercent(player) {
  return (AMULETS[player.amuletKey] || AMULETS.none).mpRegenPercent;
}

// Both Ring slots share the same RINGS registry and stack — reflects a % of
// incoming damage back at the attacker (see enemyStrikes in battle.js).
export function reflectPercent(player) {
  const r1 = (RINGS[player.ring1Key] || RINGS.none).reflectPercent;
  const r2 = (RINGS[player.ring2Key] || RINGS.none).reflectPercent;
  return r1 + r2;
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

// Level-scaling plus the flat evolution multiplier once a companion hits
// PET_EVOLVE_LEVEL — this is each pet's own intrinsic power, independent of
// whether it's the currently-active one, so it's safe to show for any owned
// companion (e.g. browsing the Tamer's roster). The Charm bonus is
// deliberately NOT folded in here since it only affects whichever companion
// is actually out (see charmPowerBonus below, applied at the real damage
// call sites instead).
export function petEffectivePower(player, petKey) {
  const pet = ALL_PET_DEFS[petKey];
  if (!pet) return 0;
  const level = petLevel(player, petKey);
  let power = pet.power * (1 + (level - 1) * PET_LEVEL_POWER_BONUS);
  if (level >= PET_EVOLVE_LEVEL) power *= PET_EVOLVE_MULTIPLIER;
  if (petIsShiny(player, petKey)) power *= SHINY_POWER_MULTIPLIER;
  const fusion = player.fusionBonus && player.fusionBonus[petKey];
  if (fusion && fusion.power) power *= (1 + fusion.power / 100);
  return power;
}

export function petIsEvolved(player, petKey) {
  return petLevel(player, petKey) >= PET_EVOLVE_LEVEL;
}

export function petIsShiny(player, petKey) {
  return !!(player.shinyPets && player.shinyPets.includes(petKey));
}

export function petDisplayName(player, petKey) {
  const pet = ALL_PET_DEFS[petKey];
  if (!pet) return '';
  const shiny = petIsShiny(player, petKey) ? 'Shiny ' : '';
  const evolved = petIsEvolved(player, petKey) ? 'Evolved ' : '';
  return `${shiny}${evolved}${pet.name}`;
}

// The Companion Charm boosts whichever pet is currently active — it's a
// player-side upgrade, not a property of any one companion, so (unlike
// petEffectivePower) it's applied only at the actual combat/display call
// sites for the active pet, not baked into every companion's own number.
export function charmPowerBonus(player) {
  return (CHARMS[player.charmKey] || CHARMS.none).petPowerBonus;
}

// Beastmaster's Regalia stacks on top of the Charm bonus at the same call
// sites (battle.js petAttacks, the Status screen's Pet Damage row) rather
// than being folded into petEffectivePower, for the same reason charms
// aren't: it's a player-side upgrade to "whichever companion is active,"
// not a property of any one companion.
export function petPowerSetBonus(player) {
  return setBonusValue(player, 'petPowerBonus');
}

// Fortune Hunter's Garb — added directly onto the chest-appearance chance
// in battle.js's rollChest.
export function itemFindBonus(player) {
  return setBonusValue(player, 'itemFindBonus');
}

// Battlemage's Focus — a % multiplier on skill damage, applied in
// battle.js's playerSkill alongside its own mpCostReduction bonus.
export function skillPowerBonus(player) {
  return setBonusValue(player, 'skillPowerBonus');
}

// The % value of `abilityKey` for one SPECIFIC companion (own ability, or
// gained through fusion) if it's reached COMPANION_ABILITY_LEVEL — 0
// otherwise. Used for on-hit effects that belong to whichever single
// companion actually landed the hit (Vampiric's heal, Blessed's Rally gold
// bonus) rather than the whole party's combined total.
export function petOwnAbilityBonus(player, petKey, abilityKey) {
  const pet = petKey && ALL_PET_DEFS[petKey];
  if (!pet) return 0;
  const fusion = player.fusionBonus && player.fusionBonus[petKey];
  const hasAbility = pet.ability === abilityKey || (fusion && fusion.extraAbilities && fusion.extraAbilities.includes(abilityKey));
  if (!hasAbility) return 0;
  if (petLevel(player, petKey) < COMPANION_ABILITY_LEVEL) return 0;
  return COMPANION_ABILITIES[abilityKey].value;
}

// Sums `abilityKey`'s value across every companion CURRENTLY in the party
// (not just the leader) who's learned it — a full team of Guardians/Swifts/
// Berserkers/Blessed genuinely adds up, since these all feed player-facing
// rolls (dodge, crit, damage reduction, gold/XP find) rather than being tied
// to one specific hit. On-hit effects (Vampiric heal, Blessed's Rally
// bonus) intentionally use petOwnAbilityBonus above instead, so a hit from
// one companion doesn't double-count another's.
export function companionAbilityBonus(player, abilityKey) {
  const keys = (player.partyKeys && player.partyKeys.length > 0) ? player.partyKeys : (player.activePetKey ? [player.activePetKey] : []);
  return keys.reduce((sum, key) => sum + petOwnAbilityBonus(player, key, abilityKey), 0);
}

// Every distinct ability a companion currently has — its own assigned one
// plus anything gained through fusion — for display purposes.
export function petAbilities(player, petKey) {
  const pet = ALL_PET_DEFS[petKey];
  if (!pet) return [];
  const fusion = player.fusionBonus && player.fusionBonus[petKey];
  const keys = [pet.ability, ...(fusion && fusion.extraAbilities ? fusion.extraAbilities : [])];
  return [...new Set(keys)];
}

// Progress toward the pet's next level, for rendering an XP bar.
export function petXpProgress(player, petKey) {
  const progress = player.petProgress && player.petProgress[petKey];
  if (!progress) return { level: 1, xpIntoLevel: 0, xpNeeded: PLAYER_BASE.xpToNext };
  return { level: progress.level, xpIntoLevel: progress.xp, xpNeeded: progress.xpToNext };
}

// A handful of the harder Achievements grant a cosmetic title (see the
// `title` field in ACHIEVEMENTS) instead of just a one-time gold payout —
// this is every title the player has actually earned, for the Achievements
// tab's picker to choose among.
export function unlockedTitles(player) {
  return ACHIEVEMENTS.filter((a) => a.title && player.achievements[a.key]).map((a) => a.title);
}

// The player's name plus whichever earned title they've chosen to display
// (or just the bare name if none is selected, or the selected one was
// somehow never actually earned) — read by the HUD and the Status header.
export function playerDisplayName(player) {
  if (player.selectedTitle && unlockedTitles(player).includes(player.selectedTitle)) {
    return `${player.name} ${player.selectedTitle}`;
  }
  return player.name;
}
