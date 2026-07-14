import { ITEMS, SKILLS, WEAPONS, ARMORS, AMULETS, AMULET_ORDER, RINGS, RING_ORDER, GEAR_SLOTS, PETS, ALL_PET_DEFS, CAPTURE_ITEMS, CAPTURABLE_KEYS, CAPTURABLE_MONSTERS, CHARMS, CHARM_ORDER, HELD_ITEMS, HELD_ITEM_ORDER, MERCENARIES, MERC_WEAPONS, MERC_ARMORS, MERC_WEAPON_ORDER, MERC_ARMOR_ORDER, MERC_SPRITE, AFFIXES, GEMS, GEM_ORDER, GEM_UPGRADE, GEM_COMBINE_COUNT, socketCount, LEGENDARIES, COMPANION_ABILITIES, COMPANION_ABILITY_LEVEL, PET_EVOLVE_LEVEL, PET_ENERGY_MAX, PARTY_SIZE, SHINY_CHANCE, ELITE_CHANCE, makeElite, SET_BONUSES, ENCHANT_STATS, setForPiece, fusionPowerGain, RIVAL_TEAM, scaleRivalOpponent, SKILL_TREES, skillTreeInfo, HERO_SPRITE, MAPS, LEVEL_CHAIN, ACHIEVEMENTS, ENCHANT_MAX_LEVEL, enchantCost, BOUNTY_TEMPLATES, ngPlusMultiplier, DIFFICULTIES, difficultyByKey, CONSUMABLE_ITEMS, IDENTIFY_COST, SKILL_ORDER } from './data.js';
import { newGameState, toSaveObject, fromSaveObject, ensureLayout, effectiveAtk, effectiveDef, activeSetProgress, setWornCount, petLevel, petEffectivePower, petIsEvolved, petIsShiny, petIsElite, petIsLocked, petDisplayName, petAbilities, findPetInstance, makePetInstance, charmPowerBonus, petPowerSetBonus, gearPetPowerBonus, heldItemBonus, heldItemPetPowerBonus, mercEffectivePower, mercWeaponAtkBonus, mercDamageReduction, petXpProgress, enchantLevel, startNewGamePlus, mpCostReduction, xpBonusPercent, critChance, dodgeChance, goldBonusPercent, mpRegenPercent, reflectPercent, unlockedTitles, playerDisplayName } from './state.js';
import { hasSave, loadSave, writeSave, clearSave } from './save.js';
import { drawMap, tryMove, heroImage, bossImages, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { createBattle, pickRandomEnemy, pickArenaEnemy, playerAttack, playerSkill, playerItem, playerCapture, petActiveSkill, playerRun, grantRewards, rollChest, consumeItem, scaleForNGPlus, scaleForDifficulty, rollLegendaryDrop } from './battle.js';

let state = null;
let battle = null;
let prevPos = null;
let bossRush = null;
let rivalBattle = null;

// Pet Tamer sub-navigation: 'list' (species roster + Adopt/Charm/Held
// Items/Mercenary), 'species' (every owned instance of one species), or
// the two-step Fusion picker ('fusionBase' then 'fusionMaterial'). Kept as
// simple module state (like battle/bossRush above) rather than in the save
// — it's pure navigation, reset every time the modal is (re)opened.
let tamerView = 'list';
let tamerSpeciesKey = null;
let fusionBaseId = null;

const el = (id) => document.getElementById(id);

const screens = {
  title: el('screen-title'),
  map: el('screen-map'),
  battle: el('screen-battle'),
  gameover: el('screen-gameover'),
  victory: el('screen-victory'),
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

function showModal(id) { el(id).classList.remove('hidden'); }
function hideModal(id) { el(id).classList.add('hidden'); }

let toastTimer = null;
function showToast(msg, ms = 1600) {
  const toast = el('map-toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), ms);
}

function pct(cur, max) {
  return Math.max(0, Math.min(100, Math.round((cur / max) * 100)));
}

// Every enemy/boss def a battle can start with passes through both scaling
// axes — New Game+ and the current Difficulty tier — in one place instead
// of each battle-trigger site chaining the two calls by hand.
function scaleEnemy(enemyDef) {
  return scaleForDifficulty(scaleForNGPlus(enemyDef, state.player.ngPlusLevel), state.player.difficulty);
}

// ---------- Map screen ----------
let ctx = null;

function initCanvas() {
  const canvas = el('map-canvas');
  canvas.width = MAP_COLS * TILE_SIZE;
  canvas.height = MAP_ROWS * TILE_SIZE;
  ctx = canvas.getContext('2d');
  heroImage.addEventListener('load', () => { if (state) redrawMap(); });
  Object.values(bossImages).forEach((img) => {
    img.addEventListener('load', () => { if (state) redrawMap(); });
  });
}

function redrawMap() {
  drawMap(ctx, state);
}

function updateHud() {
  const p = state.player;
  el('hud-name').textContent = playerDisplayName(p);
  el('hud-level').textContent = `Lv. ${p.level}`;
  el('hud-gold').textContent = `${p.gold} G`;
  el('hud-hp-fill').style.width = `${pct(p.hp, p.maxHp)}%`;
  el('hud-hp-text').textContent = `${p.hp}/${p.maxHp}`;
  el('hud-mp-fill').style.width = `${pct(p.mp, p.maxMp)}%`;
  el('hud-mp-text').textContent = `${p.mp}/${p.maxMp}`;
}

function goToMap() {
  updateHud();
  redrawMap();
  showScreen('map');
}

function autosave() {
  checkAchievements();
  writeSave(toSaveObject(state));
}

// Runs on every autosave — permanent once earned, so a later state change
// (spending gold, losing a fight) never un-earns anything.
function checkAchievements() {
  const p = state.player;
  ACHIEVEMENTS.forEach((ach) => {
    if (p.achievements[ach.key]) return;
    if (!ach.check(state)) return;
    p.achievements[ach.key] = true;
    if (ach.rewardGold > 0) p.gold += ach.rewardGold;
    showToast(`Achievement unlocked: ${ach.name}!${ach.rewardGold > 0 ? ` +${ach.rewardGold}G` : ''}`, 3200);
  });
}

function handleMove(dir) {
  const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const [dx, dy] = deltas[dir];
  prevPos = { ...state.pos };
  const result = tryMove(state, dx, dy);
  redrawMap();

  if (result.type === 'blocked') return;
  if (result.type === 'moved') return;
  if (result.type === 'town') {
    autosave();
    el('btn-town-ngplus').classList.toggle('hidden', !state.player.achievements.trueEnding);
    el('btn-town-abyss').classList.toggle('hidden', !state.player.achievements.trueEnding);
    el('btn-town-feral').classList.toggle('hidden', !state.flags.secretZoneUnlocked);
    el('btn-town-difficulty').textContent = `Difficulty: ${difficultyByKey(state.player.difficulty).name}`;
    showModal('modal-town');
    return;
  }
  if (result.type === 'boss') {
    const map = MAPS[state.mapId];
    const alreadyBeaten = !!state.flags[map.bossFlag];
    el('boss-modal-title').textContent = alreadyBeaten
      ? `${map.bossEnemy.name} awaits a rematch`
      : `${map.bossEnemy.name} blocks the way`;
    el('boss-modal-sub').textContent = alreadyBeaten
      ? 'Already beaten once — fight again for more loot and XP?'
      : 'There is no running from this fight. Are you ready?';
    showModal('modal-boss');
    return;
  }
  if (result.type === 'locked') {
    showToast('The way onward is sealed — defeat the boss first.', 2200);
    return;
  }
  if (result.type === 'knight') {
    renderKnight();
    showModal('modal-knight');
    return;
  }
  if (result.type === 'mage') {
    renderMage();
    showModal('modal-mage');
    return;
  }
  if (result.type === 'tamer') {
    tamerView = 'list';
    tamerSpeciesKey = null;
    fusionBaseId = null;
    renderTamer();
    showModal('modal-tamer');
    return;
  }
  if (result.type === 'arena') {
    renderArena();
    showModal('modal-arena');
    return;
  }
  if (result.type === 'bossrush') {
    renderBossRush();
    showModal('modal-bossrush');
    return;
  }
  if (result.type === 'identifier') {
    renderCain();
    showModal('modal-cain');
    return;
  }
  if (result.type === 'rival') {
    renderRival();
    showModal('modal-rival');
    return;
  }
  if (result.type === 'townExit') {
    renderLevelSelect();
    showModal('modal-levelselect');
    return;
  }
  if (result.type === 'portal') {
    // Every level gets a brand new random layout each time you step into
    // it — arriving via a portal is always a fresh start. Town's layout is
    // fixed and never regenerates.
    state.mapId = result.mapId;
    const layout = ensureLayout(state, state.mapId, state.mapId !== 'town');
    state.pos = { ...layout.startPos };
    // Remember the level we just arrived in, so town's exit (and Town
    // Scrolls) can send us back to actual progress instead of level one.
    if (state.mapId !== 'town') {
      state.currentLevelId = state.mapId;
      if (!state.reachedLevels.includes(state.mapId)) state.reachedLevels.push(state.mapId);
    }
    autosave();
    goToMap();
    showToast(`You arrive in ${MAPS[state.mapId].name}.`, 2200);
    return;
  }
  if (result.type === 'encounter') {
    let enemy = scaleEnemy(pickRandomEnemy(MAPS[state.mapId].enemyPool));
    if (Math.random() < ELITE_CHANCE) enemy = makeElite(enemy);
    startBattle(enemy, false);
  }
}

// ---------- Battle screen ----------
function renderBattle() {
  const p = state.player;
  el('enemy-name').textContent = battle.enemy.name;
  el('enemy-hp-fill').style.width = `${pct(battle.enemy.hp, battle.enemy.maxHp)}%`;
  el('enemy-hp-text').textContent = `${battle.enemy.hp}/${battle.enemy.maxHp}`;
  el('enemy-sprite').style.backgroundImage = battle.enemy.sprite ? `url('${battle.enemy.sprite}')` : '';
  el('enemy-sprite').classList.toggle('boss-sprite', battle.isBoss);
  el('enemy-sprite').classList.toggle('enemy-elite', !!battle.enemy.isElite);
  el('battle-player-name').textContent = `${playerDisplayName(p)} (Lv. ${p.level})`;
  el('battle-hp-fill').style.width = `${pct(p.hp, p.maxHp)}%`;
  el('battle-hp-text').textContent = `${p.hp}/${p.maxHp}`;
  el('battle-mp-fill').style.width = `${pct(p.mp, p.maxMp)}%`;
  el('battle-mp-text').textContent = `${p.mp}/${p.maxMp}`;
  el('battle-log').innerHTML = battle.log.map((l) => `<div>${l}</div>`).join('');

  const petEl = el('pet-sprite');
  const energyTrack = el('pet-energy-track');
  const leaderInstance = p.activePetId ? findPetInstance(p, p.activePetId) : null;
  if (leaderInstance) {
    petEl.style.backgroundImage = `url('${ALL_PET_DEFS[leaderInstance.key].sprite}')`;
    petEl.classList.remove('hidden');
    petEl.classList.toggle('pet-evolved', petIsEvolved(p, p.activePetId));
    petEl.classList.toggle('pet-shiny', petIsShiny(p, p.activePetId));
    petEl.classList.toggle('pet-elite', petIsElite(p, p.activePetId));
    energyTrack.classList.remove('hidden');
    const energy = battle.petEnergy || 0;
    el('pet-energy-fill').style.width = `${pct(energy, PET_ENERGY_MAX)}%`;
    el('pet-energy-text').textContent = `${energy}/${PET_ENERGY_MAX}`;
  } else {
    petEl.classList.add('hidden');
    energyTrack.classList.add('hidden');
  }

  // Support party members (partyIds[1+]) each get a small icon of their
  // own alongside the leader's main pet-sprite — every one of them lands
  // its own hit each round (see petAttacks in battle.js), not just the
  // leader.
  const partyEl = el('party-sprites');
  partyEl.innerHTML = '';
  p.partyIds.slice(1).forEach((petId) => {
    const instance = findPetInstance(p, petId);
    const pet = instance && ALL_PET_DEFS[instance.key];
    if (!pet) return;
    const icon = document.createElement('div');
    icon.className = 'sprite party-pet-sprite';
    icon.style.backgroundImage = `url('${pet.sprite}')`;
    icon.classList.toggle('pet-evolved', petIsEvolved(p, petId));
    icon.classList.toggle('pet-shiny', petIsShiny(p, petId));
    icon.classList.toggle('pet-elite', petIsElite(p, petId));
    partyEl.appendChild(icon);
  });

  const mercEl = el('merc-sprite');
  if (p.mercTier >= 0) {
    mercEl.style.backgroundImage = `url('${MERC_SPRITE}')`;
    mercEl.classList.remove('hidden');
  } else {
    mercEl.classList.add('hidden');
  }

  const menuMain = el('battle-menu-main');
  const menuItems = el('battle-menu-items');
  const menuSkills = el('battle-menu-skills');
  const continueBtn = el('btn-battle-continue');

  // The selected Capture Orb gets its own battle button (see the Status
  // screen's Items section for picking which one) instead of living in the
  // Item submenu — one tap instead of Item -> scroll -> tap.
  const captureBtn = el('btn-capture');
  const captureItem = ITEMS[p.selectedCaptureOrb];
  const captureCount = captureItem ? (p.inventory[captureItem.key] || 0) : 0;
  // Already owning a species no longer blocks capturing another copy of
  // it — an Elite or Shiny catch is always worth going for.
  if (battle.isBoss) captureBtn.textContent = "Can't Capture";
  else captureBtn.textContent = captureItem ? `Capture (${captureCount})` : 'Capture (none selected)';
  captureBtn.disabled = !captureItem || battle.isBoss || captureCount <= 0;

  // The Companion Skill button charges from the pet's own normal auto-hits
  // (see PET_ENERGY_PER_HIT in data.js) and spends the full bar on one big
  // burst that replaces the pet's hit for that round instead of adding to
  // your own action.
  const skillBtn = el('btn-companion-skill');
  const energyReady = p.activePetId && (battle.petEnergy || 0) >= PET_ENERGY_MAX;
  skillBtn.textContent = !p.activePetId ? 'No Companion' : energyReady ? 'Companion Skill!' : `Charging (${battle.petEnergy || 0}/${PET_ENERGY_MAX})`;
  skillBtn.disabled = !energyReady;

  if (battle.over) {
    menuMain.classList.add('hidden');
    menuItems.classList.add('hidden');
    menuSkills.classList.add('hidden');
    continueBtn.classList.remove('hidden');
  } else {
    continueBtn.classList.add('hidden');
  }
}

function startBattle(enemyDef, isBoss, isArena = false, isBossRush = false, isRival = false) {
  battle = createBattle(enemyDef, isBoss);
  battle.isArena = isArena;
  battle.isBossRush = isBossRush;
  battle.isRival = isRival;
  el('battle-menu-main').classList.remove('hidden');
  el('battle-menu-items').classList.add('hidden');
  el('battle-menu-skills').classList.add('hidden');
  showScreen('battle');
  renderBattle();
}

function resolveBattleEnd() {
  const p = state.player;
  if (battle.result === 'win') {
    const rewards = grantRewards(state, battle.enemy);
    let msg = `Won ${rewards.goldWon}G and ${rewards.xpWon} XP.`;
    if (rewards.leveledUp) msg += ` Level up! Now Lv. ${p.level}.`;
    // Every party member levels from the same kill (see grantRewards), so
    // this announces each one that leveled up, not just the leader.
    rewards.petLevelUps.forEach(({ petId, key, levels, newLevel }) => {
      const pet = ALL_PET_DEFS[key];
      msg += ` ${pet.name} is now Lv. ${newLevel}!`;
      if (newLevel >= PET_EVOLVE_LEVEL && newLevel - levels < PET_EVOLVE_LEVEL) {
        msg += ` ${pet.name} evolved into ${petDisplayName(p, petId)}!`;
      }
    });
    if (battle.isBossRush) {
      // Boss Rush reuses boss defs but skips per-level unlock/victory logic
      // entirely — it's a separate challenge mode, not real progression.
      p.bountyProgress.bossWins += 1;
      bossRush.index += 1;
      if (bossRush.index >= bossRush.order.length) {
        const bonus = Math.round(bossRush.order.length * 250 * ngPlusMultiplier(p.ngPlusLevel) * difficultyByKey(p.difficulty).rewardMultiplier);
        p.gold += bonus;
        bossRush = null;
        autosave();
        showToast(`${msg} Boss Rush complete! Bonus: ${bonus}G!`, 3600);
        goToMap();
      } else {
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        const nextMapId = bossRush.order[bossRush.index];
        showToast(`${msg} ${bossRush.index}/${bossRush.order.length} bosses down!`, 2600);
        startBattle(scaleEnemy(MAPS[nextMapId].bossEnemy), true, false, true);
      }
      return;
    }
    if (battle.isRival) {
      // Reuses isBoss=true on the underlying battle so capture/run are
      // blocked (you can't catch or flee a rival's companion), but skips
      // the zone-boss unlock/victory logic entirely — same separation as
      // Boss Rush above.
      rivalBattle.index += 1;
      if (rivalBattle.index >= RIVAL_TEAM.length) {
        const bonus = Math.round(RIVAL_TEAM.length * 150 * ngPlusMultiplier(p.ngPlusLevel) * difficultyByKey(p.difficulty).rewardMultiplier);
        p.gold += bonus;
        state.flags.rivalDefeated = true;
        rivalBattle = null;
        autosave();
        showToast(`${msg} You bested your rival! Bonus: ${bonus}G!`, 3600);
        goToMap();
      } else {
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        const next = RIVAL_TEAM[rivalBattle.index];
        showToast(`${msg} ${rivalBattle.index}/${RIVAL_TEAM.length} rival companions down!`, 2600);
        startBattle(scaleForDifficulty(scaleRivalOpponent(next, p.level), p.difficulty), true, false, false, true);
      }
      return;
    }
    if (battle.isBoss) {
      const map = MAPS[state.mapId];
      // Bosses are farmable — the flag only gates the one-time unlock/
      // victory beat, never the fight itself, which is why we check it
      // before setting it just below.
      const firstTime = !state.flags[map.bossFlag];
      state.flags[map.bossFlag] = true;
      // The true final boss (no nextMap) clearing Nightmare/Hell unlocks
      // the next Difficulty tier — checked on every win, not just the
      // first, since a repeat clear still proves it.
      if (!map.nextMap) {
        if (p.difficulty === 'nightmare') state.flags.nightmareCleared = true;
        if (p.difficulty === 'hell') state.flags.hellCleared = true;
      }
      p.bountyProgress.bossWins += 1;
      const legendarySlot = rollLegendaryDrop(state, battle.enemy.key);
      if (legendarySlot) msg += ` A Legendary item gleams among the remains: ${LEGENDARIES[legendarySlot].name}!`;
      autosave();
      if (firstTime) {
        if (map.nextMap) {
          // A path onward opens beside the boss — no full "the end" screen yet.
          showToast(`${msg} The way onward has opened!`, 2800);
          goToMap();
        } else {
          el('victory-title').textContent = `${battle.enemy.name} falls!`;
          showScreen('victory');
        }
      } else {
        showToast(msg, 2400);
        goToMap();
      }
      return;
    }
    if (battle.isArena) {
      p.bountyProgress.arenaWins += 1;
      // No chest roll here — the Arena already pays out extra gold/XP per
      // wave. Winning re-opens the Arena modal for the next wave instead of
      // returning to free-roam, keeping the "how far can you go" loop tight.
      if (state.arenaWave > p.arenaBestWave) p.arenaBestWave = state.arenaWave;
      state.arenaWave += 1;
      autosave();
      showToast(msg, 2000);
      goToMap();
      renderArena();
      showModal('modal-arena');
      return;
    }
    // Elite kills always drop a chest, on top of their own bigger gold/XP.
    const chest = rollChest(state, !!battle.enemy.isElite);
    showToast(msg, 2400);
    autosave();
    goToMap();
    if (chest) {
      renderChest(chest);
      showModal('modal-chest');
    }
  } else if (battle.result === 'lose') {
    // A loss only costs you the in-progress attempt, not your progress —
    // next time you fight, you pick back up just past your best cleared
    // wave instead of re-grinding from wave 1 every time.
    if (battle.isArena) state.arenaWave = p.arenaBestWave + 1;
    // A Boss Rush loss ends the run with no completion bonus — you keep
    // whatever gold/XP each individual boss along the way already paid out.
    if (battle.isBossRush) bossRush = null;
    // Same for a Rival duel loss — no bonus, but you keep what each rival
    // companion beaten so far already paid out.
    if (battle.isRival) rivalBattle = null;
    showScreen('gameover');
  } else if (battle.result === 'captured') {
    const pet = ALL_PET_DEFS[battle.enemy.key];
    autosave();
    goToMap();
    showToast(`Gotcha! ${pet.name} joined your team!`, 2800);
  } else {
    goToMap();
  }
}

function respawnAfterDefeat() {
  const p = state.player;
  p.gold = Math.floor(p.gold * 0.8);
  p.hp = p.maxHp;
  p.mp = p.maxMp;
  // currentLevelId is left untouched — dying doesn't lose your place, it
  // just sends you back to town to patch up before trying that level again.
  state.mapId = 'town';
  state.pos = { ...ensureLayout(state, 'town').startPos };
  autosave();
  goToMap();
  showToast('You limp back to town, a little poorer.', 2400);
}

// ---------- Item submenu ----------
function renderItemMenu() {
  const p = state.player;
  const menu = el('battle-menu-items');
  menu.innerHTML = '';
  CONSUMABLE_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-battle';
    btn.textContent = `${item.name} (${p.inventory[item.key] || 0})`;
    btn.disabled = !(p.inventory[item.key] > 0);
    btn.addEventListener('click', () => {
      playerItem(battle, state, item.key);
      menu.classList.add('hidden');
      el('battle-menu-main').classList.remove('hidden');
      renderBattle();
    });
    menu.appendChild(btn);
  });
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-battle';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    el('battle-menu-main').classList.remove('hidden');
  });
  menu.appendChild(backBtn);
}

// ---------- Skill submenu (battle) ----------
// Only the three elements that actually form the effectiveness triangle
// (see ELEMENT_ADVANTAGE in data.js) get a visible tag — 'physical'/'void'
// never trigger a bonus or penalty, so labeling them would just be noise.
const ELEMENT_LABELS = { fire: 'Fire', ice: 'Ice', nature: 'Nature' };

function renderSkillMenu() {
  const p = state.player;
  const menu = el('battle-menu-skills');
  menu.innerHTML = '';
  SKILL_ORDER.filter((key) => p.knownSkills.includes(key)).forEach((key) => {
    const skill = SKILLS[key];
    const elementTag = ELEMENT_LABELS[skill.element] ? ` [${ELEMENT_LABELS[skill.element]}]` : '';
    const btn = document.createElement('button');
    btn.className = 'btn btn-battle';
    btn.textContent = `${skill.name} (${skill.mpCost} MP)${elementTag}`;
    btn.disabled = p.mp < skill.mpCost;
    btn.addEventListener('click', () => {
      playerSkill(battle, state, key);
      el('battle-menu-skills').classList.add('hidden');
      el('battle-menu-main').classList.remove('hidden');
      renderBattle();
    });
    menu.appendChild(btn);
  });
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-battle';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', () => {
    el('battle-menu-skills').classList.add('hidden');
    el('battle-menu-main').classList.remove('hidden');
  });
  menu.appendChild(backBtn);
}

// ---------- Shop ----------
function renderShop() {
  el('shop-gold').textContent = state.player.gold;
  const list = el('shop-list');
  list.innerHTML = '';
  Object.values(ITEMS).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${item.name}</span>
        <span class="shop-item-desc">${item.desc} — ${item.price}G</span>
      </div>
      <button class="btn btn-small" data-buy="${item.key}">Buy</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-buy');
      const item = ITEMS[key];
      if (state.player.gold >= item.price) {
        state.player.gold -= item.price;
        state.player.inventory[key] = (state.player.inventory[key] || 0) + 1;
        autosave();
        renderShop();
      }
    });
  });
}

// ---------- Chest ----------
function renderChest(chest) {
  let desc;
  if (chest.type === 'gold') {
    desc = `You found ${chest.amount} gold!`;
  } else if (chest.type === 'item') {
    desc = `You found a ${ITEMS[chest.itemKey].name}!`;
  } else if (chest.type === 'gear') {
    desc = chest.affixKey
      ? `You found an Unidentified ${GEAR_SLOTS[chest.slot].label} that feels unusually powerful! Bring it to Deckard Cain in Town to find out what it is.`
      : `You found an Unidentified ${GEAR_SLOTS[chest.slot].label}! Bring it to Deckard Cain in Town to find out what it is.`;
  } else if (chest.type === 'charm') {
    desc = `You found a ${CHARMS[chest.key].name}! Equip it on your active companion from the Pet Tamer.`;
  } else if (chest.type === 'amulet') {
    desc = `You found an ${AMULETS[chest.key].name}! Equip it from your Inventory.`;
  } else if (chest.type === 'ring') {
    desc = `You found a ${RINGS[chest.key].name}! Equip it from your Inventory.`;
  } else if (chest.type === 'gem') {
    desc = `You found a ${GEMS[chest.key].name}! Socket it into a gear piece with an open socket from the Armory.`;
  } else if (chest.type === 'helditem') {
    desc = `You found a ${HELD_ITEMS[chest.key].name}! Give it to a companion from the Pet Tamer.`;
  } else {
    desc = `You found a Scroll of ${SKILLS[chest.skillKey].name} and learned it!`;
  }
  el('chest-desc').textContent = desc;
}

// ---------- Status ----------
function sectionHeading(text) {
  const h = document.createElement('h3');
  h.className = 'armory-section';
  h.textContent = text;
  return h;
}

const STATUS_TABS = { status: 'status-body', party: 'party-body', bestiary: 'bestiary-body', achievements: 'achievements-body', legacy: 'legacy-body', sets: 'sets-body', abilities: 'abilities-body', codex: 'codex-body' };
function showStatusTab(tab) {
  Object.entries(STATUS_TABS).forEach(([key, bodyId]) => {
    el(`tab-${key}`).classList.toggle('tab-active', key === tab);
    el(bodyId).classList.toggle('hidden', key !== tab);
  });
  if (tab === 'party') renderParty();
  if (tab === 'bestiary') renderBestiary();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'legacy') renderLegacy();
  if (tab === 'sets') renderSets();
  if (tab === 'abilities') renderAbilities();
  if (tab === 'codex') renderCodex();
}

// Weapon/Armor add flat ATK/DEF; Helmet/Gloves/Boots each carry their own
// unique mechanic instead (see battle.js) — this is the one place that
// knows how to describe any of the five in a shop/inventory row.
function gearStatLabel(slot, item) {
  switch (slot) {
    case 'weapon': return `+${item.atkBonus} ATK`;
    case 'armor': return `+${item.defBonus} DEF`;
    case 'helmet': return `-${item.mpCostReduction}% Skill Cost, +${item.xpBonusPercent}% XP`;
    case 'gloves': return `${item.critChance}% Crit Chance`;
    case 'boots': return `${item.dodgeChance}% Dodge, +${item.goldBonusPercent}% Gold`;
    default: return '';
  }
}

// Turns a SET_BONUSES threshold's bonus object into a readable summary —
// e.g. { atk: 15, def: 15, critChance: 10 } -> "+15 ATK, +15 DEF, +10% Crit".
const SET_STAT_LABELS = {
  atk: (v) => `+${v} ATK`,
  def: (v) => `+${v} DEF`,
  critChance: (v) => `+${v}% Crit`,
  dodgeChance: (v) => `+${v}% Dodge`,
  mpCostReduction: (v) => `-${v}% Skill Cost`,
  xpBonusPercent: (v) => `+${v}% XP`,
  goldBonusPercent: (v) => `+${v}% Gold`,
  petPowerBonus: (v) => `+${v}% Pet Damage`,
  itemFindBonus: (v) => `+${v}% Item Find`,
  skillPowerBonus: (v) => `+${v}% Skill Power`,
  elementalBonusPercent: (v) => `+${v}% Elemental Power`,
  mercPowerBonus: (v) => `+${v}% Mercenary Power`,
  hpRegenPercent: (v) => `+${v}% HP Regen/turn`,
};
function describeSetBonus(bonus) {
  return Object.entries(bonus).map(([key, value]) => (SET_STAT_LABELS[key] ? SET_STAT_LABELS[key](value) : '')).filter(Boolean).join(', ');
}

// Items are usable right here — no need to be in battle or visit town.
function buildStatusItemRow(itemKey) {
  const p = state.player;
  const item = ITEMS[itemKey];
  const count = p.inventory[itemKey] || 0;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${item.desc} — Have ${count}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Use';
  btn.disabled = count <= 0;
  btn.addEventListener('click', () => {
    const msg = consumeItem(p, itemKey);
    if (msg) showToast(msg, 2000);
    autosave();
    updateHud();
    renderStatus();
  });
  row.appendChild(btn);
  return row;
}

// Teleports back to town — unlike potions/ethers this changes your
// location, so using it also closes the Status screen. Disabled (rather
// than hidden) while already in town, since there's nowhere to go.
function buildTownScrollRow() {
  const p = state.player;
  const item = ITEMS.townScroll;
  const count = p.inventory.townScroll || 0;
  const inTown = state.mapId === 'town';
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${item.desc} — Have ${count}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (inTown) {
    btn.textContent = 'In Town';
    btn.disabled = true;
  } else {
    btn.textContent = 'Use';
    btn.disabled = count <= 0;
    btn.addEventListener('click', () => {
      p.inventory.townScroll -= 1;
      hideModal('modal-status');
      state.mapId = 'town';
      const layout = ensureLayout(state, 'town');
      state.pos = { ...layout.startPos };
      autosave();
      goToMap();
      showToast('You use a Town Scroll and return to town!', 2200);
    });
  }
  row.appendChild(btn);
  return row;
}


// Capture Orbs need a live enemy to target, so unlike potions/ethers there's
// no "Use" button here — instead, pick which one the battle screen's
// dedicated Capture button should use, so there's no Item-submenu digging
// mid-fight.
function buildStatusCaptureRow(itemKey) {
  const p = state.player;
  const item = ITEMS[itemKey];
  const count = p.inventory[itemKey] || 0;
  const isSelected = p.selectedCaptureOrb === itemKey;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${item.desc} — Have ${count}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (isSelected) {
    btn.textContent = 'Selected';
    btn.disabled = true;
  } else {
    btn.textContent = 'Select';
    btn.addEventListener('click', () => {
      p.selectedCaptureOrb = itemKey;
      autosave();
      renderStatus();
    });
  }
  row.appendChild(btn);
  return row;
}

function renderStatus() {
  const p = state.player;
  const weapon = WEAPONS[p.weaponKey];
  const armor = ARMORS[p.armorKey];
  el('status-name').textContent = `${playerDisplayName(p)} — Lv. ${p.level}`;
  const body = el('status-body');

  // Everything companion-specific (party roster, per-pet damage/ability/XP,
  // Companion Charm, Mercenary) now lives in its own Party tab instead of
  // crowding this one — see renderParty below.
  body.innerHTML = `
    <div class="status-row"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="status-row"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
    <div class="status-row"><span>Attack</span><span>${effectiveAtk(p)} (${p.baseAtk}+${weapon.atkBonus})</span></div>
    <div class="status-row"><span>Defense</span><span>${effectiveDef(p)} (${p.baseDef}+${armor.defBonus})</span></div>
    <div class="status-row"><span>Crit Chance</span><span>${critChance(p)}%</span></div>
    <div class="status-row"><span>Dodge Chance</span><span>${dodgeChance(p)}%</span></div>
    <div class="status-row"><span>Skill Cost / XP / Gold</span><span>-${mpCostReduction(p)}% / +${xpBonusPercent(p)}% / +${goldBonusPercent(p)}%</span></div>
    <div class="status-row"><span>MP Regen / Reflect</span><span>+${mpRegenPercent(p)}% per turn / ${reflectPercent(p)}%</span></div>
    <div class="status-row"><span>XP</span><span>${p.xp}/${p.xpToNext}</span></div>
    <div class="status-row"><span>Gold</span><span>${p.gold}</span></div>
    <div class="status-row"><span>Unidentified Items</span><span>${p.unidentifiedItems.length} (see Deckard Cain)</span></div>
    <div class="status-row"><span>Difficulty</span><span>${difficultyByKey(p.difficulty).name}${p.ngPlusLevel > 0 ? ` (NG+${p.ngPlusLevel})` : ''}</span></div>
    <div class="status-row"><span>Arena Best</span><span>Wave ${p.arenaBestWave}</span></div>
    <div class="status-row"><span>Skills</span><span>${SKILL_ORDER.filter((k) => p.knownSkills.includes(k)).map((k) => SKILLS[k].name).join(', ')}</span></div>
    <div class="status-row"><span>Monsters Caught</span><span>${[...new Set(p.pets.map((i) => i.key))].filter((k) => CAPTURABLE_KEYS.has(k)).length}/${CAPTURABLE_MONSTERS.length}</span></div>
  `;

  const activeSets = activeSetProgress(p);
  if (activeSets.length > 0) {
    body.appendChild(sectionHeading('Set Bonuses'));
    activeSets.forEach(({ set, wornCount, bonus }) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      row.innerHTML = `<span>${set.name} (${wornCount}/5)</span><span>${describeSetBonus(bonus)}</span>`;
      body.appendChild(row);
    });
  }

  body.appendChild(sectionHeading('Items'));
  CONSUMABLE_ITEMS.forEach((item) => body.appendChild(buildStatusItemRow(item.key)));
  body.appendChild(buildTownScrollRow());
  CAPTURE_ITEMS.forEach((item) => body.appendChild(buildStatusCaptureRow(item.key)));
}

// ---------- Party tab ----------
// One card per party member (Leader first, then Support), each showing its
// own level/XP/damage/ability/held item — pulled out of the main Status tab
// so that one isn't crowded with per-pet detail, especially now that up to
// PARTY_SIZE companions can be active at once instead of just one.
function renderParty() {
  const p = state.player;
  const body = el('party-body');
  body.innerHTML = '';

  body.appendChild(sectionHeading(`Party (${p.partyIds.length}/${PARTY_SIZE})`));
  if (p.partyIds.length === 0) {
    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = '<span>No companions in your party.</span><span>See the Pet Tamer in Town.</span>';
    body.appendChild(row);
  } else {
    p.partyIds.forEach((petId, i) => body.appendChild(buildPartyMemberCard(petId, i === 0)));
  }

  body.appendChild(sectionHeading('Companion Charm'));
  const charmSummary = document.createElement('div');
  charmSummary.className = 'status-row';
  charmSummary.innerHTML = `<span>Equipped</span><span>${CHARMS[p.charmKey].name}${charmPowerBonus(p) > 0 ? ` (+${charmPowerBonus(p)}% pet damage, whole party)` : ''}</span>`;
  body.appendChild(charmSummary);
  CHARM_ORDER.filter((key) => p.ownedCharms.includes(key)).forEach((key) => body.appendChild(buildCharmRow(CHARMS[key], renderParty)));

  body.appendChild(sectionHeading('Mercenary'));
  const mercRow = document.createElement('div');
  mercRow.className = 'status-row';
  mercRow.innerHTML = `<span>Hired</span><span>${p.mercTier >= 0 ? `${MERCENARIES[p.mercTier].name} (+${Math.round(mercEffectivePower(p) * 100)}% ATK per turn)` : 'None'}</span>`;
  body.appendChild(mercRow);
}

// One party member's full card: sprite, name (with Leader tag/Shiny/Evolved
// styling), level, per-hit damage, ability (locked or unlocked), any Held
// Item, any Fusion bonus, and its own XP bar.
function buildPartyMemberCard(petId, isLeader) {
  const p = state.player;
  const instance = findPetInstance(p, petId);
  const pet = instance && ALL_PET_DEFS[instance.key];
  if (!pet) return document.createElement('div');
  const level = petLevel(p, petId);
  const evolved = petIsEvolved(p, petId);
  const shiny = petIsShiny(p, petId);
  const elite = petIsElite(p, petId);
  const power = petEffectivePower(p, petId) * (1 + (charmPowerBonus(p) + petPowerSetBonus(p) + gearPetPowerBonus(p) + heldItemPetPowerBonus(p, petId)) / 100);
  const dmg = Math.max(1, Math.round(effectiveAtk(p) * power));
  const abilities = petAbilities(p, petId).map((k) => COMPANION_ABILITIES[k]);
  const abilityUnlocked = level >= COMPANION_ABILITY_LEVEL;
  const abilityLabel = abilities.length > 0
    ? (abilityUnlocked ? abilities.map((a) => a.name).join(', ') : `${abilities.map((a) => a.name).join(', ')} (unlocks at Lv. ${COMPANION_ABILITY_LEVEL})`)
    : null;
  const heldItemKey = p.heldItems[petId];
  const fusion = p.fusionBonus && p.fusionBonus[petId];
  const progress = petXpProgress(p, petId);

  const card = document.createElement('div');
  card.className = 'shop-item';
  const iconClass = `${evolved ? ' pet-evolved' : ''}${shiny ? ' pet-shiny' : ''}${elite ? ' pet-elite' : ''}`;
  card.innerHTML = `
    <div class="shop-item-icon${iconClass}" style="background-image:url('${pet.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${petDisplayName(p, petId)}${isLeader ? ' <span class="bestiary-caught">(Leader)</span>' : ''}</span>
      <span class="shop-item-desc">Lv. ${level} — ${dmg} dmg/hit (+${Math.round(power * 100)}% ATK)${abilityLabel ? ` — ${abilityLabel}` : ''}${heldItemKey ? ` — Holding ${HELD_ITEMS[heldItemKey].name}` : ''}${fusion && fusion.power ? ` — +${fusion.power}% from Fusion` : ''}</span>
      <div class="bar-track pet-xp">
        <div class="bar-fill" style="width:${Math.round((progress.xpIntoLevel / progress.xpNeeded) * 100)}%"></div>
        <span class="bar-text">${progress.xpIntoLevel}/${progress.xpNeeded} XP</span>
      </div>
    </div>
  `;
  return card;
}

// Diablo-style paper doll: every functional slot always shows what's
// currently equipped, and the backpack grid below shows everything else you
// own across all slots (tier-ordered) — tap a backpack piece to swap it in.
function renderInventoryModal() {
  const p = state.player;
  el('inventory-name').textContent = `${p.name} — Lv. ${p.level}`;

  const grid = el('backpack-grid');
  grid.innerHTML = '';
  Object.entries(GEAR_SLOTS).forEach(([slot, cfg]) => {
    const equippedKey = p[cfg.equipField];
    const item = cfg.registry[equippedKey];
    const slotEl = el(`slot-${slot}`);
    slotEl.style.backgroundImage = `url('${item.sprite}')`;
    slotEl.title = `${item.name} — ${gearStatLabel(slot, item)}`;

    cfg.order.filter((key) => p[cfg.ownedField].includes(key) && key !== equippedKey)
      .forEach((key) => grid.appendChild(buildInventoryTile(cfg.registry[key], slot)));
  });

  // Amulet and both Rings are chest-only finds (see rollChest in battle.js)
  // — no Buy flow, so they're wired up separately from the five GEAR_SLOTS
  // above instead of folding them in (which the Armory and the "Fully
  // Geared" achievement both assume is a fully-buyable set of slots).
  const amulet = AMULETS[p.amuletKey];
  el('slot-amulet').style.backgroundImage = `url('${amulet.sprite}')`;
  el('slot-amulet').title = p.amuletKey === 'none' ? 'No Amulet' : `${amulet.name} — ${amuletStatLabel(amulet)} (tap to unequip)`;
  AMULET_ORDER.filter((key) => key !== 'none' && p.ownedAmulets.includes(key) && key !== p.amuletKey)
    .forEach((key) => grid.appendChild(buildAmuletTile(AMULETS[key])));

  const ring1 = RINGS[p.ring1Key];
  const ring2 = RINGS[p.ring2Key];
  el('slot-ring1').style.backgroundImage = `url('${ring1.sprite}')`;
  el('slot-ring1').title = p.ring1Key === 'none' ? 'No Ring' : `${ring1.name} — ${ringStatLabel(ring1)} (tap to unequip)`;
  el('slot-ring2').style.backgroundImage = `url('${ring2.sprite}')`;
  el('slot-ring2').title = p.ring2Key === 'none' ? 'No Ring' : `${ring2.name} — ${ringStatLabel(ring2)} (tap to unequip)`;
  RING_ORDER.filter((key) => key !== 'none' && p.ownedRings.includes(key))
    .forEach((key) => grid.appendChild(buildRingTile(RINGS[key])));
}

function amuletStatLabel(amulet) { return `${amulet.mpRegenPercent}% MP Regen/turn`; }
function ringStatLabel(ring) { return `${ring.reflectPercent}% Damage Reflect`; }

function buildInventoryTile(gear, slot) {
  const p = state.player;
  const cfg = GEAR_SLOTS[slot];
  const tile = document.createElement('button');
  tile.className = 'inventory-tile';
  const qualityClass = itemQualityClass(slot, gear.key, p);
  tile.innerHTML = `
    <div class="inventory-tile-icon" style="background-image:url('${gear.sprite}')"></div>
    <span class="inventory-tile-name ${qualityClass}">${gear.name}</span>
    <span class="inventory-tile-stat">${gearStatLabel(slot, gear)}</span>
  `;
  tile.addEventListener('click', () => {
    p[cfg.equipField] = gear.key;
    autosave();
    updateHud();
    renderInventoryModal();
  });
  return tile;
}

function buildAmuletTile(amulet) {
  const p = state.player;
  const tile = document.createElement('button');
  tile.className = 'inventory-tile';
  tile.innerHTML = `
    <div class="inventory-tile-icon" style="background-image:url('${amulet.sprite}')"></div>
    <span class="inventory-tile-name">${amulet.name}</span>
    <span class="inventory-tile-stat">${amuletStatLabel(amulet)}</span>
  `;
  tile.addEventListener('click', () => {
    p.amuletKey = amulet.key;
    autosave();
    updateHud();
    renderInventoryModal();
  });
  return tile;
}

// Both Ring slots share this one pool, so a backpack ring tile offers a
// button per slot instead of the single whole-tile click the other
// gear/amulet tiles use — equipping into one slot auto-clears the other if
// it happened to hold the exact same physical ring, so one found ring can
// never double-count its own bonus across both slots.
function buildRingTile(ring) {
  const p = state.player;
  const tile = document.createElement('div');
  tile.className = 'inventory-tile inventory-tile-ring';
  tile.innerHTML = `
    <div class="inventory-tile-icon" style="background-image:url('${ring.sprite}')"></div>
    <span class="inventory-tile-name">${ring.name}</span>
    <span class="inventory-tile-stat">${ringStatLabel(ring)}</span>
    <div class="inventory-tile-ring-btns">
      <button class="btn btn-small" data-ring="1">Ring 1</button>
      <button class="btn btn-small" data-ring="2">Ring 2</button>
    </div>
  `;
  tile.querySelector('[data-ring="1"]').addEventListener('click', () => {
    p.ring1Key = ring.key;
    if (p.ring2Key === ring.key) p.ring2Key = 'none';
    autosave();
    updateHud();
    renderInventoryModal();
  });
  tile.querySelector('[data-ring="2"]').addEventListener('click', () => {
    p.ring2Key = ring.key;
    if (p.ring1Key === ring.key) p.ring1Key = 'none';
    autosave();
    updateHud();
    renderInventoryModal();
  });
  return tile;
}

// Lists every level's monsters and boss, in chain order, with a strikethrough
// on anything already killed at least once — a simple kill-tracking log.
function renderBestiary() {
  const p = state.player;
  const body = el('bestiary-body');
  body.innerHTML = '';
  LEVEL_CHAIN.forEach((mapId) => {
    const map = MAPS[mapId];
    body.appendChild(sectionHeading(map.name));
    Object.values(map.enemyPool).forEach((enemy) => {
      const row = document.createElement('div');
      row.className = 'status-row';
      const killed = !!p.bestiary[enemy.key];
      const caught = p.pets.some((i) => i.key === enemy.key);
      row.innerHTML = `<span class="${killed ? 'bestiary-killed' : ''}">${enemy.name}</span>${caught ? '<span class="bestiary-caught">Caught</span>' : ''}`;
      body.appendChild(row);
    });
    const bossRow = document.createElement('div');
    bossRow.className = 'status-row';
    const bossKilled = !!state.flags[map.bossFlag];
    bossRow.innerHTML = `<span class="${bossKilled ? 'bestiary-killed' : ''}">${map.bossEnemy.name} (Boss)</span>`;
    body.appendChild(bossRow);
  });
}

function renderAchievements() {
  const p = state.player;
  const body = el('achievements-body');
  body.innerHTML = '';

  const titles = unlockedTitles(p);
  if (titles.length > 0) {
    body.appendChild(sectionHeading('Titles'));
    const noneRow = document.createElement('div');
    noneRow.className = 'shop-item';
    noneRow.innerHTML = `<div class="shop-item-info"><span class="shop-item-name">No Title</span></div>`;
    const noneBtn = document.createElement('button');
    noneBtn.className = 'btn btn-small';
    if (!p.selectedTitle) { noneBtn.textContent = 'Selected'; noneBtn.disabled = true; }
    else {
      noneBtn.textContent = 'Select';
      noneBtn.addEventListener('click', () => { p.selectedTitle = null; autosave(); updateHud(); renderAchievements(); });
    }
    noneRow.appendChild(noneBtn);
    body.appendChild(noneRow);
    titles.forEach((title) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `<div class="shop-item-info"><span class="shop-item-name">${title}</span></div>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      if (p.selectedTitle === title) { btn.textContent = 'Selected'; btn.disabled = true; }
      else {
        btn.textContent = 'Select';
        btn.addEventListener('click', () => { p.selectedTitle = title; autosave(); updateHud(); renderAchievements(); });
      }
      row.appendChild(btn);
      body.appendChild(row);
    });
    body.appendChild(sectionHeading('Achievements'));
  }

  ACHIEVEMENTS.forEach((ach) => {
    const unlocked = !!p.achievements[ach.key];
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name ${unlocked ? 'bestiary-killed' : ''}">${ach.name}</span>
        <span class="shop-item-desc">${ach.desc}${ach.rewardGold > 0 ? ` — Reward: ${ach.rewardGold}G` : ''}${ach.title ? ` — Title: "${ach.title}"` : ''}</span>
      </div>
      <span class="achievement-status">${unlocked ? 'Unlocked' : 'Locked'}</span>
    `;
    body.appendChild(row);
  });
}

// ---------- Sets catalog ----------
// Unlike the main Status tab's "Set Bonuses" section (which only shows
// sets you're already at 2+ pieces on), this lists all six sets always —
// what each one does, which 5 pieces it needs (with a checkmark on any
// you're currently wearing), and both the current and next-tier bonus —
// the "how do I even find out about these" answer.
function renderSets() {
  const p = state.player;
  const body = el('sets-body');
  body.innerHTML = '';
  SET_BONUSES.forEach((set) => {
    const wornCount = setWornCount(p, set);
    const pieceList = Object.entries(set.pieces).map(([slot, key]) => {
      const name = GEAR_SLOTS[slot].registry[key].name;
      const equipped = p[GEAR_SLOTS[slot].equipField] === key;
      return `${equipped ? '✓ ' : ''}${name}`;
    }).join(', ');
    const tierKeys = Object.keys(set.thresholds).map(Number).sort((a, b) => a - b);
    const nextTier = tierKeys.find((t) => t > wornCount);
    const currentTier = [...tierKeys].reverse().find((t) => t <= wornCount);

    let bonusLine;
    if (currentTier) {
      bonusLine = `Active: ${describeSetBonus(set.thresholds[currentTier])}`;
      if (nextTier) bonusLine += ` — Next at ${nextTier}/5: ${describeSetBonus(set.thresholds[nextTier])}`;
    } else {
      bonusLine = `Wear ${tierKeys[0]}+ pieces for: ${describeSetBonus(set.thresholds[tierKeys[0]])}`;
    }

    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${set.name} (${wornCount}/5)</span>
        <span class="shop-item-desc">${set.desc}</span>
        <span class="shop-item-desc">${pieceList}</span>
        <span class="shop-item-desc">${bonusLine}</span>
      </div>
    `;
    body.appendChild(row);
  });
}

// ---------- Beast Abilities catalog ----------
// The five passive abilities pulled from COMPANION_ABILITIES's shared pool
// (see data.js) are named in a lot of places -- the active pet's Status
// row, the Tamer's roster, fusion confirms -- but never explained. This
// tab spells out what each one actually does, at its real numeric value.
const ABILITY_DETAIL = {
  vampiric: (v) => `Heals you for ${v}% of your pet's hit damage as HP, every time it lands a hit.`,
  guardian: (v) => `Reduces all incoming damage to you by ${v}%.`,
  berserker: (v) => `Adds ${v}% to your own crit chance.`,
  swift: (v) => `Adds ${v}% to your own dodge chance.`,
  blessed: (v) => `Boosts gold and XP found by ${v}%.`,
};
function renderAbilities() {
  const body = el('abilities-body');
  body.innerHTML = '';
  Object.values(COMPANION_ABILITIES).forEach((ability) => {
    const tamerPets = Object.values(PETS).filter((pet) => pet.ability === ability.key).map((pet) => pet.name);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${ability.name}</span>
        <span class="shop-item-desc">${ABILITY_DETAIL[ability.key](ability.value)}</span>
        <span class="shop-item-desc">Unlocks at Lv. ${COMPANION_ABILITY_LEVEL}, and only while that companion is active.</span>
        <span class="shop-item-desc">Tamer pets with it: ${tamerPets.join(', ')}</span>
      </div>
    `;
    body.appendChild(row);
  });
}

// ---------- Codex (zone lore) ----------
// A short flavor blurb per zone (see `lore` in each MAPS entry), unlocked
// as you actually reach that zone (reusing state.reachedLevels, already
// tracked for the World Map) instead of spoiling the whole chain up front.
function renderCodex() {
  const body = el('codex-body');
  body.innerHTML = '';
  LEVEL_CHAIN.forEach((mapId) => {
    const map = MAPS[mapId];
    const reached = state.reachedLevels.includes(mapId);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name${reached ? '' : ' bestiary-killed'}">${reached ? map.name : '???'}</span>
        <span class="shop-item-desc">${reached ? map.lore : 'Not yet reached.'}</span>
      </div>
    `;
    body.appendChild(row);
  });
}

// ---------- Hall of Legacy ----------
// A single aggregated "how far have you gotten" screen, mostly derived
// from state already tracked elsewhere (bestiary, achievements, flags,
// pets/Charms) plus two new lifetime counters (kills, gold earned) that —
// unlike bountyProgress — never reset.
function renderLegacy() {
  const p = state.player;
  const body = el('legacy-body');
  const bossesDefeated = LEVEL_CHAIN.filter((id) => state.flags[MAPS[id].bossFlag]).length;
  const totalMonsters = LEVEL_CHAIN.reduce((sum, id) => sum + Object.keys(MAPS[id].enemyPool).length, 0);
  const monstersKilled = LEVEL_CHAIN.reduce((sum, id) => sum + Object.keys(MAPS[id].enemyPool).filter((k) => p.bestiary[k]).length, 0);
  const achievementsUnlocked = ACHIEVEMENTS.filter((a) => p.achievements[a.key]).length;
  const totalCompanions = Object.keys(ALL_PET_DEFS).length;
  const speciesOwned = new Set(p.pets.map((i) => i.key)).size;
  const shinyCount = p.pets.filter((i) => i.shiny).length;
  const eliteCount = p.pets.filter((i) => i.elite).length;
  const totalCharms = CHARM_ORDER.length - 1; // "No Charm" doesn't count as a find

  body.innerHTML = `
    <div class="status-row"><span>Character</span><span>Lv. ${p.level}${p.ngPlusLevel > 0 ? ` (NG+${p.ngPlusLevel})` : ''}</span></div>
    <div class="status-row"><span>Lifetime Kills</span><span>${p.lifetimeKills || 0}</span></div>
    <div class="status-row"><span>Lifetime Gold Earned</span><span>${p.lifetimeGoldEarned || 0}</span></div>
    <div class="status-row"><span>Elites Defeated</span><span>${p.lifetimeElites || 0}</span></div>
    <div class="status-row"><span>Gold on Hand</span><span>${p.gold}</span></div>
    <div class="status-row"><span>Bosses Defeated</span><span>${bossesDefeated}/${LEVEL_CHAIN.length}</span></div>
    <div class="status-row"><span>Bestiary</span><span>${monstersKilled}/${totalMonsters}</span></div>
    <div class="status-row"><span>Companion Species Owned</span><span>${speciesOwned}/${totalCompanions}</span></div>
    <div class="status-row"><span>Total Companions Caught</span><span>${p.pets.length}</span></div>
    <div class="status-row"><span>Shiny Companions</span><span>${shinyCount}</span></div>
    <div class="status-row"><span>Elite Companions</span><span>${eliteCount}</span></div>
    <div class="status-row"><span>Charms Found</span><span>${Math.max(0, p.ownedCharms.length - 1)}/${totalCharms}</span></div>
    <div class="status-row"><span>Achievements</span><span>${achievementsUnlocked}/${ACHIEVEMENTS.length}</span></div>
    <div class="status-row"><span>Arena Best</span><span>Wave ${p.arenaBestWave}</span></div>
  `;
}

// ---------- Armory ----------
function renderArmory() {
  const p = state.player;
  el('armory-gold').textContent = p.gold;
  const list = el('armory-list');
  list.innerHTML = '';
  Object.entries(GEAR_SLOTS).forEach(([slot, cfg]) => {
    list.appendChild(sectionHeading(cfg.label));
    Object.values(cfg.registry).forEach((item) => list.appendChild(buildArmoryRow(item, slot)));
  });

  // Every slot can be enchanted now — Weapon/Armor get flat ATK/DEF,
  // Helmet/Gloves/Boots get a smaller top-up on whichever percent stat(s)
  // that slot already carries (see ENCHANT_STATS in data.js).
  const anyOwnedGear = Object.values(GEAR_SLOTS).some((cfg) => p[cfg.ownedField].length > 0);
  if (anyOwnedGear) {
    list.appendChild(sectionHeading('Enchant'));
    Object.entries(GEAR_SLOTS).forEach(([slot, cfg]) => {
      cfg.order.filter((key) => p[cfg.ownedField].includes(key)).forEach((key) => list.appendChild(buildEnchantRow(cfg.registry[key], slot)));
    });
  }

  renderGemSockets(list);
}

// Only the top three tiers of any slot come with a socket (see socketCount
// in data.js) — this lists every OWNED piece with one, whether or not it's
// currently equipped, since the socket belongs to that slot+key (same
// "sticks to the key" model as Affixes), not the live equip state.
function renderGemSockets(list) {
  const p = state.player;
  const socketable = [];
  Object.entries(GEAR_SLOTS).forEach(([slot, cfg]) => {
    cfg.order.forEach((key) => {
      if (socketCount(slot, key) > 0 && p[cfg.ownedField].includes(key)) socketable.push({ slot, key, item: cfg.registry[key] });
    });
  });
  if (socketable.length === 0) return;
  list.appendChild(sectionHeading('Gem Sockets'));
  socketable.forEach(({ slot, key, item }) => list.appendChild(buildGemSocketRow(slot, key, item)));
}

function buildGemSocketRow(slot, key, item) {
  const p = state.player;
  const gemKey = p.socketedGems[slot] && p.socketedGems[slot][key];
  const gem = gemKey && GEMS[gemKey];
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${gem ? `Socketed: ${gem.name} (${SET_STAT_LABELS[gem.statKey](gem.value)})` : 'Empty socket'}</span>
    </div>
  `;
  if (gem) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = 'Remove';
    btn.addEventListener('click', () => {
      p.socketedGems[slot][key] = null;
      p.inventory[gemKey] = (p.inventory[gemKey] || 0) + 1;
      autosave();
      renderArmory();
    });
    row.appendChild(btn);
  } else {
    const ownedGemKeys = GEM_ORDER.filter((k) => (p.inventory[k] || 0) > 0);
    if (ownedGemKeys.length === 0) {
      const note = document.createElement('span');
      note.className = 'achievement-status';
      note.textContent = 'No Gems';
      row.appendChild(note);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'inventory-tile-ring-btns';
      ownedGemKeys.forEach((gk) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small';
        btn.textContent = `${GEMS[gk].name} (${p.inventory[gk]})`;
        btn.addEventListener('click', () => {
          p.socketedGems[slot][key] = gk;
          p.inventory[gk] -= 1;
          autosave();
          renderArmory();
        });
        wrap.appendChild(btn);
      });
      row.appendChild(wrap);
    }
  }
  return row;
}

// Human-readable labels for every field ENCHANT_STATS might touch — mirrors
// gearStatLabel/SET_STAT_LABELS' shape but keyed by the gear object's own
// raw field names (atkBonus/defBonus/...) rather than the summarized ones.
const ENCHANT_STAT_LABELS = {
  atkBonus: (v) => `+${v} ATK`,
  defBonus: (v) => `+${v} DEF`,
  mpCostReduction: (v) => `-${v}% Skill Cost`,
  xpBonusPercent: (v) => `+${v}% XP`,
  critChance: (v) => `+${v}% Crit`,
  dodgeChance: (v) => `+${v}% Dodge`,
  goldBonusPercent: (v) => `+${v}% Gold`,
};

// A stat bonus (see ENCHANT_STATS) per owned gear key, stacked regardless of
// which piece is currently equipped — a gold sink and a reason to keep
// favorite gear instead of only ever buying the next tier.
// A quick color-coded way to tell a piece's quality at a glance, classic
// ARPG-style, without having to read its full description every time —
// derived entirely from existing signals (no new data needed): Legendary
// (its LEGENDARIES slot+key, once earned) beats Set (belongs to a
// SET_BONUSES piece list) beats Magic (has a rolled Affix) beats Normal
// (none of the above). A piece can genuinely be more than one at once (e.g.
// a Legendary weapon that's also a Set piece) — Legendary is called out as
// the rarest, matching how buildArmoryRow already prioritizes its name.
function itemQualityClass(slot, key, player) {
  const isLegendary = LEGENDARIES[slot] && LEGENDARIES[slot].key === key && player.ownedLegendaries.includes(slot);
  if (isLegendary) return 'item-quality-legendary';
  if (setForPiece(key)) return 'item-quality-set';
  if (player.gearAffixes[slot] && player.gearAffixes[slot][key]) return 'item-quality-magic';
  return 'item-quality-normal';
}

function buildEnchantRow(item, slot) {
  const p = state.player;
  const level = enchantLevel(p, slot, item.key);
  const maxed = level >= ENCHANT_MAX_LEVEL;
  const statLine = Object.entries(ENCHANT_STATS[slot])
    .map(([statKey, perLevel]) => ENCHANT_STAT_LABELS[statKey](level * perLevel))
    .join(', ');
  const qualityClass = itemQualityClass(slot, item.key, p);

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name ${qualityClass}">${item.name}</span>
      <span class="shop-item-desc">${statLine} (${level}/${ENCHANT_MAX_LEVEL})</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (maxed) {
    btn.textContent = 'Maxed';
    btn.disabled = true;
  } else {
    const cost = enchantCost(level);
    btn.textContent = `Enchant (${cost}G)`;
    btn.disabled = p.gold < cost;
    btn.addEventListener('click', () => {
      if (p.gold < cost) return;
      p.gold -= cost;
      p.enchantLevels[slot][item.key] = level + 1;
      autosave();
      renderArmory();
    });
  }
  row.appendChild(btn);
  return row;
}

function buildArmoryRow(item, slot) {
  const p = state.player;
  const cfg = GEAR_SLOTS[slot];
  const equippedKey = p[cfg.equipField];
  const owned = p[cfg.ownedField].includes(item.key);
  const isEquipped = equippedKey === item.key;

  const row = document.createElement('div');
  row.className = 'shop-item';
  const priceLabel = item.price > 0 ? `${item.price}G` : 'Free';
  const set = setForPiece(item.key);
  const affixKey = p.gearAffixes[slot] && p.gearAffixes[slot][item.key];
  const affix = affixKey && AFFIXES[affixKey];
  const sockets = socketCount(slot, item.key);
  const legendary = LEGENDARIES[slot] && LEGENDARIES[slot].key === item.key && p.ownedLegendaries.includes(slot) ? LEGENDARIES[slot] : null;
  const qualityClass = itemQualityClass(slot, item.key, p);
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name ${qualityClass}">${legendary ? legendary.name : item.name}${affix ? ` ${affix.name}` : ''}${set ? ` <span class="bestiary-caught">(${set.name})</span>` : ''}</span>
      <span class="shop-item-desc">${gearStatLabel(slot, item)}${affix ? `, ${SET_STAT_LABELS[affix.statKey](affix.value)}` : ''}${legendary ? `, ${SET_STAT_LABELS[legendary.statKey](legendary.value)}` : ''}${sockets > 0 ? ` — ${sockets} Socket` : ''} — ${owned ? 'Owned' : priceLabel}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (isEquipped) {
    btn.textContent = 'Equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Equip';
    btn.addEventListener('click', () => {
      p[cfg.equipField] = item.key;
      autosave();
      renderArmory();
    });
  } else {
    btn.textContent = 'Buy';
    btn.disabled = p.gold < item.price;
    btn.addEventListener('click', () => {
      if (p.gold < item.price) return;
      p.gold -= item.price;
      p[cfg.ownedField].push(item.key);
      p[cfg.equipField] = item.key;
      autosave();
      renderArmory();
    });
  }
  row.appendChild(btn);
  return row;
}

// ---------- Deckard Cain (item identification) ----------
// Gear chests drop unidentified — this is where you learn (and finally own)
// what you actually found, for a flat fee per item, including any Affix it
// came with. Also home to two special interactions unrelated to
// identification: combining 3 of a kind Gem into the next size up, and the
// secret Feral Pastures unlock.
function renderCain() {
  const p = state.player;
  el('cain-gold').textContent = p.gold;
  const list = el('cain-list');
  list.innerHTML = '';

  if (p.unidentifiedItems.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'modal-sub';
    empty.textContent = 'Nothing to identify right now — go find some chests.';
    list.appendChild(empty);
  } else {
    p.unidentifiedItems.forEach((unident, idx) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      const cfg = GEAR_SLOTS[unident.slot];
      row.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-name">Unidentified ${cfg.label}${unident.affixKey ? ' (feels powerful)' : ''}</span>
          <span class="shop-item-desc">${IDENTIFY_COST}G to identify</span>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Identify';
      btn.disabled = p.gold < IDENTIFY_COST;
      btn.addEventListener('click', () => {
        if (p.gold < IDENTIFY_COST) return;
        p.gold -= IDENTIFY_COST;
        p.unidentifiedItems.splice(idx, 1);
        const gear = cfg.registry[unident.key];
        p[cfg.ownedField].push(unident.key);
        let revealName = gear.name;
        if (unident.affixKey) {
          p.gearAffixes[unident.slot][unident.key] = unident.affixKey;
          revealName += ` ${AFFIXES[unident.affixKey].name}`;
        }
        autosave();
        showToast(`It's a ${revealName}!`, 2600);
        renderCain();
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  // Combine Gems — 3 of the same type+size becomes 1 of the next size up
  // (Large has nowhere further to go), a Horadric-Cube-style sink for
  // duplicate gems instead of them just piling up unused.
  const combinable = GEM_ORDER.filter((key) => GEM_UPGRADE[key] && (p.inventory[key] || 0) >= GEM_COMBINE_COUNT);
  if (combinable.length > 0) {
    list.appendChild(sectionHeading('Combine Gems'));
    combinable.forEach((key) => {
      const gem = GEMS[key];
      const nextKey = GEM_UPGRADE[key];
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-name">${GEM_COMBINE_COUNT}x ${gem.name}</span>
          <span class="shop-item-desc">Combine into 1 ${GEMS[nextKey].name} — Have ${p.inventory[key]}</span>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Combine';
      btn.addEventListener('click', () => {
        p.inventory[key] -= GEM_COMBINE_COUNT;
        p.inventory[nextKey] = (p.inventory[nextKey] || 0) + 1;
        autosave();
        renderCain();
      });
      row.appendChild(btn);
      list.appendChild(row);
    });
  }

  // The Feral Pastures — a true secret zone, unlocked (not consumed) by
  // simply owning the Celestial tier of Charm/Amulet/Ring all at once.
  if (!state.flags.secretZoneUnlocked) {
    const hasAll = p.ownedCharms.includes('celestialCharm') && p.ownedAmulets.includes('celestialAmulet') && p.ownedRings.includes('celestialRing');
    if (hasAll) {
      list.appendChild(sectionHeading('???'));
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-name">Something stirs...</span>
          <span class="shop-item-desc">Three Celestial relics, all in your hands at once. Cain's eyes widen.</span>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Investigate';
      btn.addEventListener('click', () => {
        state.flags.secretZoneUnlocked = true;
        autosave();
        showToast('A hidden path has opened in Town...', 3000);
        renderCain();
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
  }
}

// ---------- Arena ----------
function renderArena() {
  const p = state.player;
  el('arena-sub').textContent = `Wave ${state.arenaWave} — Best: Wave ${p.arenaBestWave}`;
  el('btn-arena-fight').textContent = `Fight Wave ${state.arenaWave}`;
}

// ---------- Boss Rush ----------
// Fights every boss you've already beaten at least once, back-to-back, with
// a full heal between each — an endurance tour rather than a hard grind,
// paying a single big bonus only on a full clear.
function renderBossRush() {
  const order = LEVEL_CHAIN.filter((id) => state.flags[MAPS[id].bossFlag]);
  const startBtn = el('btn-bossrush-start');
  if (order.length === 0) {
    el('bossrush-sub').textContent = 'Defeat at least one boss first to unlock the Rush.';
    startBtn.disabled = true;
    startBtn.textContent = 'Start';
  } else {
    el('bossrush-sub').textContent = `Fight all ${order.length} bosses you've beaten, back-to-back, with a full heal between each. Full clear pays a big bonus.`;
    startBtn.disabled = false;
    startBtn.textContent = `Start (${order.length} bosses)`;
  }
}

function startBossRush() {
  const order = LEVEL_CHAIN.filter((id) => state.flags[MAPS[id].bossFlag]);
  if (order.length === 0) return;
  bossRush = { order, index: 0 };
  hideModal('modal-bossrush');
  startBattle(scaleEnemy(MAPS[order[0]].bossEnemy), true, false, true);
}

// ---------- Rival Duel ----------
// A fixed 3-companion team, fought back-to-back with a full heal between
// each, scaled to the player's own level — freely repeatable, same
// endurance-tour shape as Boss Rush, distinct from wild encounters/bosses.
function renderRival() {
  el('rival-sub').textContent = `Face all ${RIVAL_TEAM.length} of your rival's companions back-to-back, with a full heal between each. Neither of you can flee or capture the other's team. Full clear pays a bonus; a loss keeps whatever you earned along the way.`;
}

function startRivalBattle() {
  rivalBattle = { index: 0 };
  hideModal('modal-rival');
  startBattle(scaleForDifficulty(scaleRivalOpponent(RIVAL_TEAM[0], state.player.level), state.player.difficulty), true, false, false, true);
}

// ---------- Bounty Board ----------
// Three objectives roll fresh every real-world day. Progress is tracked in
// player.bountyProgress (incremented in battle.js/resolveBattleEnd) and
// compared against each bounty's own frozen target at render time.
function todayString() {
  return new Date().toDateString();
}

function ensureBounties() {
  const p = state.player;
  if (p.bountyDate === todayString() && p.bounties.length > 0) return;
  p.bountyDate = todayString();
  p.bountyProgress = { kills: 0, gold: 0, arenaWins: 0, bossWins: 0 };
  const templates = [...BOUNTY_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);
  p.bounties = templates.map((t) => {
    const target = t.targets[Math.floor(Math.random() * t.targets.length)];
    return { type: t.type, target, label: t.label(target), rewardGold: t.rewardGold(target), claimed: false };
  });
  // Persist immediately — otherwise a fresh board generated this visit could
  // be lost (and silently re-rolled) if the app closes before anything else
  // triggers an autosave.
  autosave();
}

function renderBounty() {
  ensureBounties();
  const p = state.player;
  const list = el('bounty-list');
  list.innerHTML = '';
  p.bounties.forEach((bounty, idx) => {
    const progress = Math.min(bounty.target, p.bountyProgress[bounty.type] || 0);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${bounty.label}</span>
        <span class="shop-item-desc">${bounty.claimed ? 'Completed' : `${progress}/${bounty.target}`} — Reward: ${bounty.rewardGold}G</span>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    if (bounty.claimed) {
      btn.textContent = 'Claimed';
      btn.disabled = true;
    } else if (progress >= bounty.target) {
      btn.textContent = 'Claim';
      btn.addEventListener('click', () => {
        bounty.claimed = true;
        p.gold += bounty.rewardGold;
        autosave();
        updateHud();
        renderBounty();
      });
    } else {
      btn.textContent = 'Claim';
      btn.disabled = true;
    }
    row.appendChild(btn);
    list.appendChild(row);
  });
}

// ---------- Difficulty ----------
// Diablo-style tiers, independent of New Game+ (see DIFFICULTIES in
// data.js) — Nightmare unlocks once you've beaten the true final boss;
// Hell unlocks once you've beaten it again specifically while on
// Nightmare (state.flags.nightmareCleared, set in resolveBattleEnd).
function renderDifficulty() {
  const p = state.player;
  const list = el('difficulty-list');
  list.innerHTML = '';
  DIFFICULTIES.forEach((d) => {
    const unlocked = !d.unlockFlag || !!state.flags[d.unlockFlag];
    const active = p.difficulty === d.key;
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${d.name}</span>
        <span class="shop-item-desc">${d.desc}${d.enemyMultiplier > 1 ? ` (${Math.round((d.enemyMultiplier - 1) * 100)}% tougher enemies, +${Math.round((d.rewardMultiplier - 1) * 100)}% gold/XP)` : ''}</span>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    if (!unlocked) {
      btn.textContent = 'Locked';
      btn.disabled = true;
    } else if (active) {
      btn.textContent = 'Active';
      btn.disabled = true;
    } else {
      btn.textContent = 'Select';
      btn.addEventListener('click', () => {
        p.difficulty = d.key;
        autosave();
        renderDifficulty();
      });
    }
    row.appendChild(btn);
    list.appendChild(row);
  });
}

// ---------- World Map (level select + progress overview) ----------
// Lists every zone in the game, in chain order — not just the ones you've
// reached — each with a boss/bestiary progress readout, so it doubles as a
// "how much of the game have I seen" overview and not just a travel menu.
// Unreached zones show their progress as locked instead of a Travel button.
function renderLevelSelect() {
  const p = state.player;
  const list = el('levelselect-list');
  list.innerHTML = '';
  LEVEL_CHAIN.forEach((mapId) => {
    const map = MAPS[mapId];
    const reached = state.reachedLevels.includes(mapId);
    const bossDown = !!state.flags[map.bossFlag];
    const pool = Object.keys(map.enemyPool);
    const killed = pool.filter((k) => p.bestiary[k]).length;

    const row = document.createElement('div');
    row.className = 'shop-item';
    const statusBits = reached
      ? `Boss: ${bossDown ? 'Defeated' : 'Not yet'} — Bestiary ${killed}/${pool.length}${mapId === state.currentLevelId ? ' — current' : ''}`
      : 'Not yet reached';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name${reached ? '' : ' bestiary-killed'}">${map.name}</span>
        <span class="shop-item-desc">Depth ${map.depth} — ${statusBits}</span>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    if (reached) {
      btn.textContent = 'Travel';
      btn.addEventListener('click', () => travelToLevel(mapId));
    } else {
      btn.textContent = 'Locked';
      btn.disabled = true;
    }
    row.appendChild(btn);
    list.appendChild(row);
  });
}

function travelToLevel(mapId) {
  hideModal('modal-levelselect');
  state.mapId = mapId;
  const layout = ensureLayout(state, mapId, true);
  state.pos = { ...layout.startPos };
  state.currentLevelId = mapId;
  autosave();
  goToMap();
  showToast(`You arrive in ${MAPS[mapId].name}.`, 2200);
}

// ---------- Pet Tamer ----------
// The Tamer modal has three sub-views, toggled via the module-level
// tamerView/tamerSpeciesKey/fusionBaseId state (reset to 'list' whenever
// the modal is (re)opened — see the 'tamer' map-tile handler): the main
// roster ('list'), one species' full instance roster ('species', opened by
// tapping a species row — since you can now own more than one of the same
// monster), and the two-step Fusion picker ('fusionBase' then
// 'fusionMaterial').
function renderTamer() {
  if (tamerView === 'species') return renderTamerSpecies();
  if (tamerView === 'fusionBase') return renderTamerFusionBase();
  if (tamerView === 'fusionMaterial') return renderTamerFusionMaterial();
  renderTamerList();
}

function renderTamerList() {
  const p = state.player;
  el('tamer-title').textContent = 'The Pet Tamer';
  el('tamer-gold').textContent = p.gold;
  const list = el('tamer-list');
  list.innerHTML = '';

  const noneRow = document.createElement('div');
  noneRow.className = 'shop-item';
  noneRow.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">No Party</span>
      <span class="shop-item-desc">Fight alone — up to ${PARTY_SIZE} companions can fight together (${p.partyIds.length}/${PARTY_SIZE} in your party)</span>
    </div>
  `;
  const noneBtn = document.createElement('button');
  noneBtn.className = 'btn btn-small';
  if (p.partyIds.length === 0) {
    noneBtn.textContent = 'Active';
    noneBtn.disabled = true;
  } else {
    noneBtn.textContent = 'Clear Party';
    noneBtn.addEventListener('click', () => {
      p.partyIds = [];
      p.activePetId = null;
      autosave();
      renderTamer();
    });
  }
  noneRow.appendChild(noneBtn);
  list.appendChild(noneRow);

  // Companions can come from the Tamer's own catalog or from capturing wild
  // monsters in battle — every owned copy of every species lives in
  // player.pets, so this groups them by species (tap a row to see and
  // manage every instance of it) rather than listing every single copy
  // flat here.
  const speciesKeys = [...new Set(p.pets.map((i) => i.key))];
  if (speciesKeys.length > 0) {
    list.appendChild(sectionHeading('Your Companions'));
    speciesKeys
      .map((key) => ALL_PET_DEFS[key])
      .filter(Boolean)
      .sort((a, b) => a.power - b.power)
      .forEach((pet) => list.appendChild(buildSpeciesRow(pet)));
  }

  list.appendChild(sectionHeading('Fusion'));
  list.appendChild(buildFusionEntryRow());

  // Adopting is always available, even for a species you already own —
  // building a whole team of the same starter is just as valid as
  // spreading across every species.
  list.appendChild(sectionHeading('Adopt a Pet'));
  Object.values(PETS).forEach((pet) => list.appendChild(buildTamerRow(pet)));

  // Charms are chest-only finds, never sold here — just an Equip list over
  // whatever you've already picked up (the free "No Charm" is always owned).
  list.appendChild(sectionHeading('Companion Charm'));
  CHARM_ORDER.filter((key) => p.ownedCharms.includes(key)).forEach((key) => list.appendChild(buildCharmRow(CHARMS[key], renderTamer)));

  // Held Items (chest-only) stick to one SPECIFIC companion instance
  // permanently, unlike a Charm which boosts the whole party.
  if (p.ownedHeldItems.length > 0) {
    list.appendChild(sectionHeading('Held Items'));
    HELD_ITEM_ORDER.filter((key) => p.ownedHeldItems.includes(key)).forEach((key) => list.appendChild(buildHeldItemRow(key)));
  }

  renderMercenaryCamp(list);
}

// A back-navigation row, shared by every Tamer sub-view.
function buildTamerBackRow(label, onClick) {
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `<div class="shop-item-info"><span class="shop-item-name">${label}</span></div>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Back';
  btn.addEventListener('click', onClick);
  row.appendChild(btn);
  return row;
}

// One row per SPECIES you own at least one copy of — tapping "Manage"
// opens the species view listing every individual instance (each with its
// own level/Shiny/Elite status) instead of cramming every copy into this
// top-level list.
function buildSpeciesRow(pet) {
  const p = state.player;
  const instances = p.pets.filter((i) => i.key === pet.key);
  const bestLevel = Math.max(...instances.map((i) => i.level));
  const shinyCount = instances.filter((i) => i.shiny).length;
  const eliteCount = instances.filter((i) => i.elite).length;
  const inPartyCount = instances.filter((i) => p.partyIds.includes(i.id)).length;
  const badges = `${shinyCount > 0 ? ` <span class="bestiary-caught">${shinyCount} Shiny</span>` : ''}${eliteCount > 0 ? ` <span class="bestiary-caught">${eliteCount} Elite</span>` : ''}`;

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${pet.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${pet.name}${badges}</span>
      <span class="shop-item-desc">${instances.length} owned — best Lv. ${bestLevel}${inPartyCount > 0 ? ` — ${inPartyCount} in party` : ''}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Manage';
  btn.addEventListener('click', () => {
    tamerView = 'species';
    tamerSpeciesKey = pet.key;
    renderTamer();
  });
  row.appendChild(btn);

  // A direct Fuse shortcut right on the species summary row — so it's
  // visible at a glance instead of only appearing after tapping Manage.
  // Defaults to this species' own best (highest-level) copy as the Base,
  // protecting it automatically; picking a specific other instance to keep
  // instead is still possible via Manage.
  if (p.pets.length >= 2) {
    const fuseBtn = document.createElement('button');
    fuseBtn.className = 'btn btn-small';
    fuseBtn.textContent = 'Fuse';
    fuseBtn.addEventListener('click', () => {
      const best = instances.slice().sort((a, b) => b.level - a.level)[0];
      fusionBaseId = best.id;
      tamerView = 'fusionMaterial';
      renderTamer();
    });
    row.appendChild(fuseBtn);
  }
  return row;
}

// Every owned instance of one species (Leader/In Party/Add to Party/Remove
// controls per copy, same as the old flat companion list, just scoped to
// one species at a time now that there can be several copies of it).
function renderTamerSpecies() {
  const p = state.player;
  const speciesDef = ALL_PET_DEFS[tamerSpeciesKey];
  el('tamer-title').textContent = speciesDef ? speciesDef.name : 'Companions';
  el('tamer-gold').textContent = p.gold;
  const list = el('tamer-list');
  list.innerHTML = '';
  list.appendChild(buildTamerBackRow('← Back to Companions', () => {
    tamerView = 'list';
    tamerSpeciesKey = null;
    renderTamer();
  }));

  const instances = p.pets.filter((i) => i.key === tamerSpeciesKey).sort((a, b) => b.level - a.level);
  if (instances.length === 0) {
    tamerView = 'list';
    tamerSpeciesKey = null;
    renderTamer();
    return;
  }

  instances.forEach((instance) => list.appendChild(buildInstanceRow(instance, { showPartyControls: true })));
}

// A single owned companion instance's row — used both in the per-species
// view (with party controls) and the Fusion picker (with a plain Select
// button instead). Shows everything about that ONE copy: level, per-hit
// power, ability, Held Item, Fusion bonus, and its own XP bar.
function buildInstanceRow(instance, opts = {}) {
  const p = state.player;
  const pet = ALL_PET_DEFS[instance.key];
  const level = instance.level;
  const evolved = petIsEvolved(p, instance.id);
  const powerPct = Math.round(petEffectivePower(p, instance.id) * 100);
  const abilityNames = petAbilities(p, instance.id).map((k) => COMPANION_ABILITIES[k].name);
  const abilityLabel = abilityNames.length > 0
    ? (level >= COMPANION_ABILITY_LEVEL ? abilityNames.join(', ') : `${abilityNames.join(', ')} at Lv. ${COMPANION_ABILITY_LEVEL}`)
    : null;
  const fusion = p.fusionBonus && p.fusionBonus[instance.id];
  const fusionLabel = fusion && fusion.power ? ` — +${fusion.power}% from Fusion` : '';
  const heldItemKey = p.heldItems[instance.id];
  const heldLabel = heldItemKey ? ` — Holding ${HELD_ITEMS[heldItemKey].name}` : '';
  const isLeader = p.activePetId === instance.id;
  const inParty = p.partyIds.includes(instance.id);
  const partyLabel = opts.showPartyControls ? (isLeader ? ' — Leader' : inParty ? ' — In Party' : '') : '';
  const lockLabel = instance.locked ? ' — 🔒 Locked' : '';
  const progress = petXpProgress(p, instance.id);

  const row = document.createElement('div');
  row.className = 'shop-item';
  const iconClass = `${evolved ? ' pet-evolved' : ''}${instance.shiny ? ' pet-shiny' : ''}${instance.elite ? ' pet-elite' : ''}`;
  row.innerHTML = `
    <div class="shop-item-icon${iconClass}" style="background-image:url('${pet.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${petDisplayName(p, instance.id)}</span>
      <span class="shop-item-desc">Lv. ${level} — +${powerPct}% ATK per turn${abilityLabel ? ` — ${abilityLabel}` : ''}${heldLabel}${fusionLabel}${partyLabel}${lockLabel}</span>
      <div class="bar-track pet-xp">
        <div class="bar-fill" style="width:${Math.round((progress.xpIntoLevel / progress.xpNeeded) * 100)}%"></div>
        <span class="bar-text">${progress.xpIntoLevel}/${progress.xpNeeded} XP</span>
      </div>
    </div>
  `;

  if (opts.onSelect) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = opts.selectLabel || 'Select';
    btn.addEventListener('click', () => opts.onSelect(instance.id));
    row.appendChild(btn);
    return row;
  }

  if (opts.showPartyControls) {
    if (isLeader) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = 'Leader';
      btn.disabled = true;
      row.appendChild(btn);
    } else if (inParty) {
      const leaderBtn = document.createElement('button');
      leaderBtn.className = 'btn btn-small';
      leaderBtn.textContent = 'Make Leader';
      leaderBtn.addEventListener('click', () => {
        p.partyIds = [instance.id, ...p.partyIds.filter((id) => id !== instance.id)];
        p.activePetId = instance.id;
        autosave();
        renderTamer();
      });
      row.appendChild(leaderBtn);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-small';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        p.partyIds = p.partyIds.filter((id) => id !== instance.id);
        p.activePetId = p.partyIds[0] || null;
        autosave();
        renderTamer();
      });
      row.appendChild(removeBtn);
    } else {
      const partyFull = p.partyIds.length >= PARTY_SIZE;
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-small';
      addBtn.textContent = partyFull ? 'Party Full' : 'Add to Party';
      addBtn.disabled = partyFull;
      addBtn.addEventListener('click', () => {
        if (p.partyIds.length >= PARTY_SIZE) return;
        p.partyIds.push(instance.id);
        if (!p.activePetId) p.activePetId = p.partyIds[0];
        autosave();
        renderTamer();
      });
      row.appendChild(addBtn);
    }

    // A direct shortcut into Fusion for whichever companion you're already
    // looking at — this instance becomes the Base (the one that keeps
    // fighting), and the next screen picks a different owned companion
    // (same species duplicates and Tamer-bought pets both count) to
    // sacrifice as Material. The separate top-level "Fuse Companions" entry
    // still exists for starting from scratch instead.
    if (p.pets.length >= 2) {
      const fuseBtn = document.createElement('button');
      fuseBtn.className = 'btn btn-small';
      fuseBtn.textContent = 'Fuse';
      fuseBtn.addEventListener('click', () => {
        fusionBaseId = instance.id;
        tamerView = 'fusionMaterial';
        renderTamer();
      });
      row.appendChild(fuseBtn);
    }

    // Locking a companion permanently opts it out of ever being offered as
    // Fusion Material — a stronger safeguard than the Shiny/Elite warnings
    // for a catch you never want at risk of a misclick. Being chosen as a
    // Base is always safe (it's kept, not sacrificed), so locking doesn't
    // touch that.
    const lockBtn = document.createElement('button');
    lockBtn.className = 'btn btn-small';
    lockBtn.textContent = instance.locked ? 'Unlock' : 'Lock';
    lockBtn.addEventListener('click', () => {
      instance.locked = !instance.locked;
      autosave();
      renderTamer();
    });
    row.appendChild(lockBtn);
  }
  return row;
}

// A single entry point into the Fusion flow — pick a Base (the companion
// that keeps fighting and gains the bonus), then a different companion to
// sacrifice as Fusion Material.
function buildFusionEntryRow() {
  const p = state.player;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">Fuse Companions</span>
      <span class="shop-item-desc">Choose a Base to keep, then a different companion to sacrifice as Fusion Material.</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Open';
  btn.disabled = p.pets.length < 2;
  btn.addEventListener('click', () => {
    tamerView = 'fusionBase';
    fusionBaseId = null;
    renderTamer();
  });
  row.appendChild(btn);
  return row;
}

function renderTamerFusionBase() {
  const p = state.player;
  el('tamer-title').textContent = 'Fusion — Choose a Base';
  el('tamer-gold').textContent = p.gold;
  const list = el('tamer-list');
  list.innerHTML = '';
  list.appendChild(buildTamerBackRow('← Cancel Fusion', () => {
    tamerView = 'list';
    fusionBaseId = null;
    renderTamer();
  }));
  const info = document.createElement('div');
  info.className = 'shop-item';
  info.innerHTML = '<div class="shop-item-info"><span class="shop-item-desc">Pick the companion that will keep fighting — it gains the Fusion bonus.</span></div>';
  list.appendChild(info);
  // Skip any instance whose species definition no longer exists (a leftover
  // from a species removed from the game in an old save) — buildInstanceRow
  // can't display a name/sprite/power for one, and letting it crash mid-sort
  // would silently cut off every companion listed after it.
  p.pets.filter((i) => ALL_PET_DEFS[i.key]).sort((a, b) => b.level - a.level).forEach((instance) => {
    list.appendChild(buildInstanceRow(instance, {
      onSelect: (id) => {
        fusionBaseId = id;
        tamerView = 'fusionMaterial';
        renderTamer();
      },
      selectLabel: 'Choose as Base',
    }));
  });
}

function renderTamerFusionMaterial() {
  const p = state.player;
  const base = p.pets.find((i) => i.id === fusionBaseId && ALL_PET_DEFS[i.key]);
  if (!base) {
    tamerView = 'fusionBase';
    fusionBaseId = null;
    renderTamer();
    return;
  }
  el('tamer-title').textContent = 'Fusion — Choose Material';
  el('tamer-gold').textContent = p.gold;
  const list = el('tamer-list');
  list.innerHTML = '';
  list.appendChild(buildTamerBackRow('← Cancel Fusion', () => {
    tamerView = 'list';
    fusionBaseId = null;
    renderTamer();
  }));

  list.appendChild(sectionHeading('Base (kept)'));
  list.appendChild(buildInstanceRow(base, {}));

  // Locked companions (see the Lock/Unlock button on each instance row)
  // never appear as Material candidates at all — a stronger safeguard than
  // the Shiny/Elite warnings below for a catch you never want at risk.
  // Also skip any instance whose species definition no longer exists (a
  // leftover from a species removed from the game in an old save) — one of
  // these used to silently crash mid-render and cut off every companion
  // sorted after it, which is exactly what made real duplicates of an owned
  // species vanish from this list without any visible error.
  const others = p.pets.filter((i) => i.id !== base.id && ALL_PET_DEFS[i.key]).sort((a, b) => b.level - a.level);
  const lockedCount = others.filter((i) => i.locked).length;
  const candidates = others.filter((i) => !i.locked);

  if (candidates.length === 0) {
    list.appendChild(sectionHeading('Choose Material to Sacrifice'));
    const emptyRow = document.createElement('div');
    emptyRow.className = 'shop-item';
    emptyRow.innerHTML = `<div class="shop-item-info"><span class="shop-item-desc">${lockedCount > 0 ? 'All other companions are 🔒 Locked — unlock one from its Manage view first if you want to fuse it.' : 'No other companions to fuse in.'}</span></div>`;
    list.appendChild(emptyRow);
    return;
  }

  const buildMaterialRow = (instance) => buildInstanceRow(instance, {
    onSelect: (materialId) => {
      const material = p.pets.find((i) => i.id === materialId);
      const gain = fusionPowerGain(material.level);
      const baseAbility = ALL_PET_DEFS[base.key].ability;
      const materialAbility = ALL_PET_DEFS[material.key].ability;
      const gainsAbility = materialAbility !== baseAbility && !petAbilities(p, base.id).includes(materialAbility);
      // Extra-loud warning when the material about to be permanently
      // destroyed is Shiny or Elite, specifically so a Shiny/Elite catch is
      // never lost to a misclick.
      const specialWarning = (material.shiny || material.elite)
        ? `⚠ ${petDisplayName(p, material.id)} is ${material.shiny && material.elite ? 'Shiny AND Elite' : material.shiny ? 'Shiny' : 'Elite'} — this cannot be undone. `
        : '';
      const confirmMsg = `${specialWarning}Fuse ${petDisplayName(p, material.id)} (Lv. ${material.level}) into ${petDisplayName(p, base.id)}? This permanently removes ${ALL_PET_DEFS[material.key].name} from your team and grants +${gain}% power${gainsAbility ? ` plus the ${COMPANION_ABILITIES[materialAbility].name} ability` : ''}.`;
      if (!window.confirm(confirmMsg)) return;
      fuseCompanions(p, materialId, base.id);
      autosave();
      updateHud();
      tamerView = 'list';
      fusionBaseId = null;
      renderTamer();
    },
    selectLabel: 'Fuse',
  });

  // Plain copies are listed first (safe to fuse without a second thought);
  // any Shiny/Elite candidate is called out separately under its own loud
  // warning heading so it's never mixed in with — or mistaken for — an
  // ordinary duplicate.
  const plainCandidates = candidates.filter((i) => !i.shiny && !i.elite);
  const specialCandidates = candidates.filter((i) => i.shiny || i.elite);
  if (plainCandidates.length > 0) {
    list.appendChild(sectionHeading(`Choose Material to Sacrifice${lockedCount > 0 ? ` (${lockedCount} Locked companion${lockedCount > 1 ? 's' : ''} hidden)` : ''}`));
    plainCandidates.forEach((instance) => list.appendChild(buildMaterialRow(instance)));
  }
  if (specialCandidates.length > 0) {
    list.appendChild(sectionHeading('⚠ Shiny/Elite — fusing these away is permanent'));
    specialCandidates.forEach((instance) => list.appendChild(buildMaterialRow(instance)));
  }
}

// A held item can only be held by one companion instance at a time —
// "Give to Leader" reassigns it to the party leader, clearing whoever held
// it before.
function buildHeldItemRow(itemKey) {
  const p = state.player;
  const item = HELD_ITEMS[itemKey];
  const holderId = Object.entries(p.heldItems).find(([, held]) => held === itemKey)?.[0];
  const holderName = holderId ? petDisplayName(p, holderId) : null;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${item.desc}${holderName ? ` — Held by ${holderName}` : ' — Unassigned'}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (!p.activePetId) {
    btn.textContent = 'No Active Pet';
    btn.disabled = true;
  } else if (holderId === p.activePetId) {
    btn.textContent = 'Held';
    btn.disabled = true;
  } else {
    btn.textContent = 'Give to Leader';
    btn.addEventListener('click', () => {
      if (holderId) delete p.heldItems[holderId];
      p.heldItems[p.activePetId] = itemKey;
      autosave();
      renderTamer();
    });
  }
  row.appendChild(btn);
  return row;
}

// ---------- Mercenary Camp ----------
// A single hireable ally distinct from the Pet roster — no XP/leveling of
// its own, just an upgrade path (hire Rookie, later pay the difference up
// through Champion) plus its own small Weapon/Armor loadout.
function renderMercenaryCamp(list) {
  const p = state.player;
  list.appendChild(sectionHeading('Mercenary Camp'));

  const merc = p.mercTier >= 0 ? MERCENARIES[p.mercTier] : null;
  const next = MERCENARIES[p.mercTier + 1];
  const hireRow = document.createElement('div');
  hireRow.className = 'shop-item';
  hireRow.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${merc ? merc.name : 'No Mercenary'}</span>
      <span class="shop-item-desc">${merc ? `+${Math.round(merc.power * 100)}% ATK per turn` : 'Hire one to fight alongside your companion'}</span>
    </div>
  `;
  const hireBtn = document.createElement('button');
  hireBtn.className = 'btn btn-small';
  if (!next) {
    hireBtn.textContent = 'Max Tier';
    hireBtn.disabled = true;
  } else {
    hireBtn.textContent = `${merc ? 'Upgrade' : 'Hire'} (${next.price}G)`;
    hireBtn.disabled = p.gold < next.price;
    hireBtn.addEventListener('click', () => {
      if (p.gold < next.price) return;
      p.gold -= next.price;
      p.mercTier += 1;
      autosave();
      renderTamer();
    });
  }
  hireRow.appendChild(hireBtn);
  list.appendChild(hireRow);

  if (p.mercTier < 0) return;
  MERC_WEAPON_ORDER.filter((key) => key !== 'none').forEach((key) => list.appendChild(buildMercGearRow(MERC_WEAPONS[key], 'Weapon', p.ownedMercWeapons, 'ownedMercWeapons', 'mercWeaponKey')));
  MERC_ARMOR_ORDER.filter((key) => key !== 'none').forEach((key) => list.appendChild(buildMercGearRow(MERC_ARMORS[key], 'Armor', p.ownedMercArmors, 'ownedMercArmors', 'mercArmorKey')));
}

function buildMercGearRow(item, label, ownedList, ownedField, equipField) {
  const p = state.player;
  const owned = ownedList.includes(item.key);
  const isEquipped = p[equipField] === item.key;
  const stat = item.atkBonus !== undefined ? `+${item.atkBonus} ATK` : `+${item.defBonus} DEF (damage reduction)`;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name} <span class="bestiary-caught">(Mercenary ${label})</span></span>
      <span class="shop-item-desc">${stat} — ${owned ? 'Owned' : `${item.price}G`}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (isEquipped) {
    btn.textContent = 'Equipped';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Equip';
    btn.addEventListener('click', () => {
      p[equipField] = item.key;
      autosave();
      renderTamer();
    });
  } else {
    btn.textContent = 'Buy';
    btn.disabled = p.gold < item.price;
    btn.addEventListener('click', () => {
      if (p.gold < item.price) return;
      p.gold -= item.price;
      p[ownedField].push(item.key);
      p[equipField] = item.key;
      autosave();
      renderTamer();
    });
  }
  row.appendChild(btn);
  return row;
}

// Permanently sacrifices the instance sacrificeId into targetId: a flat
// power bump scaling with how leveled the sacrifice was, plus its ability
// if the target doesn't already have it. The sacrifice instance is deleted
// outright (unlike the old species-keyed model, there's no "re-acquiring"
// it later — it's simply gone).
function fuseCompanions(p, sacrificeId, targetId) {
  const sacrifice = p.pets.find((i) => i.id === sacrificeId);
  if (!sacrifice) return;
  const sacrificeDef = ALL_PET_DEFS[sacrifice.key];
  const gain = fusionPowerGain(sacrifice.level);
  if (!p.fusionBonus[targetId]) p.fusionBonus[targetId] = { power: 0, extraAbilities: [] };
  const fusion = p.fusionBonus[targetId];
  fusion.power += gain;
  if (!petAbilities(p, targetId).includes(sacrificeDef.ability) && !fusion.extraAbilities.includes(sacrificeDef.ability)) {
    fusion.extraAbilities.push(sacrificeDef.ability);
  }
  p.pets = p.pets.filter((i) => i.id !== sacrificeId);
  delete p.fusionBonus[sacrificeId];
  delete p.heldItems[sacrificeId];
  p.partyIds = (p.partyIds || []).filter((id) => id !== sacrificeId);
  if (p.activePetId === sacrificeId) {
    // The sacrifice was the party Leader — the base being fused into takes
    // over leadership, moved to the front of the party if it wasn't
    // already a member.
    p.partyIds = p.partyIds.includes(targetId) ? [targetId, ...p.partyIds.filter((id) => id !== targetId)] : [targetId, ...p.partyIds];
    p.activePetId = targetId;
  } else if (!p.activePetId && p.partyIds.length > 0) {
    p.activePetId = p.partyIds[0];
  }
  p.fusionCount = (p.fusionCount || 0) + 1;
}

// Charms are never bought — Equip/Equipped only, over whatever's been found.
// `onEquip` re-renders whichever screen the row lives in — both the Tamer
// and the Status screen list owned charms, so equipping one works from
// wherever the player happens to be, not just a trip to Town.
function buildCharmRow(charm, onEquip) {
  const p = state.player;
  const isEquipped = p.charmKey === charm.key;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${charm.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${charm.name}</span>
      <span class="shop-item-desc">+${charm.petPowerBonus}% pet damage</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (isEquipped) {
    btn.textContent = 'Equipped';
    btn.disabled = true;
  } else {
    btn.textContent = 'Equip';
    btn.addEventListener('click', () => {
      p.charmKey = charm.key;
      autosave();
      onEquip();
    });
  }
  row.appendChild(btn);
  return row;
}

// Only called for pets not yet owned — always the "Adopt" flow.
function buildTamerRow(pet) {
  const p = state.player;
  const owned = p.pets.filter((i) => i.key === pet.key).length;
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${pet.name}</span>
      <span class="shop-item-desc">+${Math.round(pet.power * 100)}% ATK per turn — ${pet.price}G${owned > 0 ? ` — ${owned} owned` : ''}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Adopt';
  btn.disabled = p.gold < pet.price;
  btn.addEventListener('click', () => {
    if (p.gold < pet.price) return;
    p.gold -= pet.price;
    const shiny = Math.random() < SHINY_CHANCE;
    const instance = makePetInstance(pet.key, { shiny });
    p.pets.push(instance);
    if (p.partyIds.length < PARTY_SIZE) {
      p.partyIds.push(instance.id);
      if (!p.activePetId) p.activePetId = p.partyIds[0];
    }
    autosave();
    if (shiny) showToast(`It's Shiny! ${petDisplayName(p, instance.id)} joined your team!`, 2800);
    renderTamer();
  });
  row.appendChild(btn);
  return row;
}

// ---------- Knight / Mage skill trees ----------
// Each vendor's 12 skills are laid out as two 6-skill branches (see
// SKILL_TREES in data.js) — a row per skill, grouped under its branch
// heading in tier order, locked until its prerequisite (the previous skill
// in the SAME branch) is known and the character has reached that tier's
// level requirement.
function renderVendor(vendorKey, goldElId, listElId) {
  const p = state.player;
  el(goldElId).textContent = p.gold;
  const list = el(listElId);
  list.innerHTML = '';
  Object.values(SKILL_TREES[vendorKey].branches).forEach((branch) => {
    list.appendChild(sectionHeading(branch.name));
    branch.skills.forEach((skillKey) => list.appendChild(buildSkillTreeRow(skillKey, vendorKey, goldElId, listElId)));
  });
}

function buildSkillTreeRow(skillKey, vendorKey, goldElId, listElId) {
  const p = state.player;
  const skill = SKILLS[skillKey];
  const info = skillTreeInfo(skillKey);
  const known = p.knownSkills.includes(skillKey);
  const prereqMet = !info.prereqKey || p.knownSkills.includes(info.prereqKey);
  const levelMet = p.level >= info.levelReq;

  let statusText;
  if (known) statusText = 'Known';
  else if (!prereqMet) statusText = `Requires ${SKILLS[info.prereqKey].name}`;
  else if (!levelMet) statusText = `Requires Lv. ${info.levelReq}`;
  else statusText = `${skill.price}G`;

  const elementTag = ELEMENT_LABELS[skill.element] ? ` [${ELEMENT_LABELS[skill.element]}]` : '';
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${skill.name}${elementTag}</span>
      <span class="shop-item-desc">${skill.mpCost} MP, power ${skill.power}x — ${statusText}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (known) {
    btn.textContent = 'Known';
    btn.disabled = true;
  } else if (!prereqMet || !levelMet) {
    btn.textContent = 'Locked';
    btn.disabled = true;
  } else {
    btn.textContent = 'Learn';
    btn.disabled = p.gold < skill.price;
    btn.addEventListener('click', () => {
      if (p.gold < skill.price) return;
      p.gold -= skill.price;
      p.knownSkills.push(skillKey);
      autosave();
      renderVendor(vendorKey, goldElId, listElId);
    });
  }
  row.appendChild(btn);
  return row;
}

function renderKnight() { renderVendor('knight', 'knight-gold', 'knight-list'); }
function renderMage() { renderVendor('mage', 'mage-gold', 'mage-list'); }

// ---------- Wiring ----------
function wireEvents() {
  el('btn-new-game').addEventListener('click', () => {
    state = newGameState(el('hero-name-input').value);
    autosave();
    goToMap();
  });

  el('btn-continue').addEventListener('click', () => {
    const saved = loadSave();
    if (!saved) return;
    state = fromSaveObject(saved);
    // Resuming reuses whatever layout was saved — only very old saves that
    // predate procedural generation would be missing one.
    ensureLayout(state, state.mapId, false);
    // Persist immediately so migrations (like pruning a pet instance whose
    // species no longer exists) are reflected on disk right away, not only
    // after the next unrelated action happens to autosave.
    autosave();
    goToMap();
  });

  document.querySelectorAll('.dpad-btn').forEach((btn) => {
    btn.addEventListener('click', () => handleMove(btn.getAttribute('data-dir')));
  });

  window.addEventListener('keydown', (e) => {
    if (screens.map.classList.contains('hidden')) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const dir = map[e.key];
    if (dir) { e.preventDefault(); handleMove(dir); }
  });

  el('btn-status').addEventListener('click', () => {
    renderStatus();
    showStatusTab('status');
    showModal('modal-status');
  });
  el('btn-status-close').addEventListener('click', () => hideModal('modal-status'));
  el('tab-status').addEventListener('click', () => showStatusTab('status'));
  el('tab-party').addEventListener('click', () => showStatusTab('party'));
  el('tab-bestiary').addEventListener('click', () => showStatusTab('bestiary'));
  el('tab-achievements').addEventListener('click', () => showStatusTab('achievements'));
  el('tab-legacy').addEventListener('click', () => showStatusTab('legacy'));
  el('tab-sets').addEventListener('click', () => showStatusTab('sets'));
  el('tab-abilities').addEventListener('click', () => showStatusTab('abilities'));
  el('tab-codex').addEventListener('click', () => showStatusTab('codex'));

  el('btn-character').addEventListener('click', () => {
    renderInventoryModal();
    showModal('modal-inventory');
  });
  el('btn-inventory-close').addEventListener('click', () => hideModal('modal-inventory'));

  // Amulet/Ring slots have no "always some piece equipped" starter gear
  // like Weapon/Armor/etc do, so tapping the doll slot itself unequips
  // back to 'none' — the backpack tiles handle equipping.
  el('slot-amulet').addEventListener('click', () => {
    if (state.player.amuletKey === 'none') return;
    state.player.amuletKey = 'none';
    autosave();
    updateHud();
    renderInventoryModal();
  });
  el('slot-ring1').addEventListener('click', () => {
    if (state.player.ring1Key === 'none') return;
    state.player.ring1Key = 'none';
    autosave();
    updateHud();
    renderInventoryModal();
  });
  el('slot-ring2').addEventListener('click', () => {
    if (state.player.ring2Key === 'none') return;
    state.player.ring2Key = 'none';
    autosave();
    updateHud();
    renderInventoryModal();
  });

  el('btn-levelselect-back').addEventListener('click', () => hideModal('modal-levelselect'));

  el('btn-chest-close').addEventListener('click', () => {
    hideModal('modal-chest');
    updateHud();
  });

  // Town modal
  el('btn-town-rest').addEventListener('click', () => {
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    autosave();
    updateHud();
    showToast('You feel fully rested.');
  });
  el('btn-town-shop').addEventListener('click', () => {
    hideModal('modal-town');
    renderShop();
    showModal('modal-shop');
  });
  el('btn-town-armory').addEventListener('click', () => {
    hideModal('modal-town');
    renderArmory();
    showModal('modal-armory');
  });
  el('btn-town-bounty').addEventListener('click', () => {
    hideModal('modal-town');
    renderBounty();
    showModal('modal-bounty');
  });
  el('btn-town-difficulty').addEventListener('click', () => {
    hideModal('modal-town');
    renderDifficulty();
    showModal('modal-difficulty');
  });
  el('btn-difficulty-back').addEventListener('click', () => {
    hideModal('modal-difficulty');
    showModal('modal-town');
  });
  el('btn-town-ngplus').addEventListener('click', () => {
    hideModal('modal-town');
    showModal('modal-ngplus-confirm');
  });
  el('btn-town-abyss').addEventListener('click', () => {
    hideModal('modal-town');
    travelToLevel('abyssaldepths');
  });
  el('btn-town-feral').addEventListener('click', () => {
    hideModal('modal-town');
    travelToLevel('feralpastures');
  });
  el('btn-town-leave').addEventListener('click', () => {
    hideModal('modal-town');
    updateHud();
  });
  el('btn-shop-back').addEventListener('click', () => {
    hideModal('modal-shop');
    showModal('modal-town');
  });
  el('btn-armory-back').addEventListener('click', () => {
    hideModal('modal-armory');
    showModal('modal-town');
    updateHud();
  });

  // Knight / Mage vendors (standalone map tiles, not inside the town)
  el('btn-knight-back').addEventListener('click', () => {
    hideModal('modal-knight');
    updateHud();
  });
  el('btn-mage-back').addEventListener('click', () => {
    hideModal('modal-mage');
    updateHud();
  });
  el('btn-tamer-back').addEventListener('click', () => {
    hideModal('modal-tamer');
    updateHud();
  });

  // Arena
  el('btn-arena-fight').addEventListener('click', () => {
    hideModal('modal-arena');
    startBattle(scaleEnemy(pickArenaEnemy(state.arenaWave)), false, true);
  });
  el('btn-arena-leave').addEventListener('click', () => {
    // Banking out preserves progress — next visit still starts just past
    // your best cleared wave, same as a loss does, instead of wave 1.
    state.arenaWave = state.player.arenaBestWave + 1;
    hideModal('modal-arena');
    autosave();
    updateHud();
  });

  // Boss modal
  el('btn-boss-fight').addEventListener('click', () => {
    hideModal('modal-boss');
    startBattle(scaleEnemy(MAPS[state.mapId].bossEnemy), true);
  });
  el('btn-boss-retreat').addEventListener('click', () => {
    hideModal('modal-boss');
    if (prevPos) { state.pos = { ...prevPos }; redrawMap(); }
  });

  // Boss Rush
  el('btn-bossrush-start').addEventListener('click', () => startBossRush());
  el('btn-bossrush-back').addEventListener('click', () => hideModal('modal-bossrush'));

  // Rival Duel
  el('btn-rival-start').addEventListener('click', () => startRivalBattle());
  el('btn-rival-back').addEventListener('click', () => hideModal('modal-rival'));

  // Deckard Cain
  el('btn-cain-back').addEventListener('click', () => hideModal('modal-cain'));

  // Bounty Board
  el('btn-bounty-back').addEventListener('click', () => {
    hideModal('modal-bounty');
    showModal('modal-town');
  });

  // New Game+
  el('btn-victory-ngplus').addEventListener('click', () => {
    showScreen('map'); // underlying screen for the confirm modal to sit over
    showModal('modal-ngplus-confirm');
  });
  el('btn-ngplus-confirm').addEventListener('click', () => {
    hideModal('modal-ngplus-confirm');
    startNewGamePlus(state);
    autosave();
    goToMap();
    showToast(`New Game+ ${state.player.ngPlusLevel} begins — everything hits harder, and pays more.`, 3200);
  });
  el('btn-ngplus-cancel').addEventListener('click', () => hideModal('modal-ngplus-confirm'));

  // Battle menu
  el('btn-attack').addEventListener('click', () => { playerAttack(battle, state); renderBattle(); });
  el('btn-skill').addEventListener('click', () => {
    renderSkillMenu();
    el('battle-menu-main').classList.add('hidden');
    el('battle-menu-skills').classList.remove('hidden');
  });
  el('btn-run').addEventListener('click', () => { playerRun(battle, state); renderBattle(); });
  el('btn-capture').addEventListener('click', () => {
    if (state.player.selectedCaptureOrb) playerCapture(battle, state, state.player.selectedCaptureOrb);
    renderBattle();
  });
  el('btn-companion-skill').addEventListener('click', () => {
    petActiveSkill(battle, state);
    renderBattle();
  });
  el('btn-item').addEventListener('click', () => {
    renderItemMenu();
    el('battle-menu-main').classList.add('hidden');
    el('battle-menu-items').classList.remove('hidden');
  });
  el('btn-battle-continue').addEventListener('click', () => resolveBattleEnd());

  el('btn-gameover-continue').addEventListener('click', () => respawnAfterDefeat());
  el('btn-victory-continue').addEventListener('click', () => goToMap());
}

export function init() {
  initCanvas();
  wireEvents();
  el('player-sprite').style.backgroundImage = `url('${HERO_SPRITE}')`;
  el('btn-continue').disabled = !hasSave();
  showScreen('title');
}
