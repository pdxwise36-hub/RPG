import { ITEMS, SKILLS, WEAPONS, ARMORS, GEAR_SLOTS, PETS, ALL_PET_DEFS, CAPTURE_ITEMS, CAPTURABLE_KEYS, CAPTURABLE_MONSTERS, CHARMS, CHARM_ORDER, COMPANION_ABILITIES, COMPANION_ABILITY_LEVEL, PET_EVOLVE_LEVEL, SHINY_CHANCE, SET_BONUSES, setForPiece, fusionPowerGain, RIVAL_TEAM, scaleRivalOpponent, SKILL_TREES, skillTreeInfo, HERO_SPRITE, MAPS, LEVEL_CHAIN, ACHIEVEMENTS, ENCHANT_MAX_LEVEL, ENCHANT_BONUS_PER_LEVEL, enchantCost, BOUNTY_TEMPLATES, ngPlusMultiplier, CONSUMABLE_ITEMS, IDENTIFY_COST, SKILL_ORDER } from './data.js';
import { newGameState, toSaveObject, fromSaveObject, ensureLayout, effectiveAtk, effectiveDef, activeSetProgress, setWornCount, petLevel, petEffectivePower, petIsEvolved, petIsShiny, petDisplayName, petAbilities, charmPowerBonus, petPowerSetBonus, petXpProgress, enchantLevel, startNewGamePlus, mpCostReduction, xpBonusPercent, critChance, dodgeChance, goldBonusPercent } from './state.js';
import { hasSave, loadSave, writeSave, clearSave } from './save.js';
import { drawMap, tryMove, heroImage, bossImages, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { createBattle, pickRandomEnemy, pickArenaEnemy, playerAttack, playerSkill, playerItem, playerCapture, playerRun, grantRewards, rollChest, consumeItem, scaleForNGPlus } from './battle.js';

let state = null;
let battle = null;
let prevPos = null;
let bossRush = null;
let rivalBattle = null;

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
  el('hud-name').textContent = p.name;
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
    startBattle(scaleForNGPlus(pickRandomEnemy(MAPS[state.mapId].enemyPool), state.player.ngPlusLevel), false);
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
  el('battle-player-name').textContent = `${p.name} (Lv. ${p.level})`;
  el('battle-hp-fill').style.width = `${pct(p.hp, p.maxHp)}%`;
  el('battle-hp-text').textContent = `${p.hp}/${p.maxHp}`;
  el('battle-mp-fill').style.width = `${pct(p.mp, p.maxMp)}%`;
  el('battle-mp-text').textContent = `${p.mp}/${p.maxMp}`;
  el('battle-log').innerHTML = battle.log.map((l) => `<div>${l}</div>`).join('');

  const petEl = el('pet-sprite');
  if (p.activePetKey) {
    petEl.style.backgroundImage = `url('${ALL_PET_DEFS[p.activePetKey].sprite}')`;
    petEl.classList.remove('hidden');
    petEl.classList.toggle('pet-evolved', petIsEvolved(p, p.activePetKey));
    petEl.classList.toggle('pet-shiny', petIsShiny(p, p.activePetKey));
  } else {
    petEl.classList.add('hidden');
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
  const alreadyOwned = captureItem && p.ownedPets.includes(battle.enemy.key);
  if (battle.isBoss) captureBtn.textContent = "Can't Capture";
  else if (alreadyOwned) captureBtn.textContent = 'Already Caught';
  else captureBtn.textContent = captureItem ? `Capture (${captureCount})` : 'Capture (none selected)';
  captureBtn.disabled = !captureItem || battle.isBoss || alreadyOwned || captureCount <= 0;

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
    if (rewards.petLeveledUp) {
      const pet = ALL_PET_DEFS[p.activePetKey];
      const newLevel = petLevel(p, p.activePetKey);
      msg += ` ${pet.name} is now Lv. ${newLevel}!`;
      if (newLevel >= PET_EVOLVE_LEVEL && newLevel - rewards.petLevels < PET_EVOLVE_LEVEL) {
        msg += ` ${pet.name} evolved into ${petDisplayName(p, p.activePetKey)}!`;
      }
    }
    if (battle.isBossRush) {
      // Boss Rush reuses boss defs but skips per-level unlock/victory logic
      // entirely — it's a separate challenge mode, not real progression.
      p.bountyProgress.bossWins += 1;
      bossRush.index += 1;
      if (bossRush.index >= bossRush.order.length) {
        const bonus = Math.round(bossRush.order.length * 250 * ngPlusMultiplier(p.ngPlusLevel));
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
        startBattle(scaleForNGPlus(MAPS[nextMapId].bossEnemy, p.ngPlusLevel), true, false, true);
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
        const bonus = Math.round(RIVAL_TEAM.length * 150 * ngPlusMultiplier(p.ngPlusLevel));
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
        startBattle(scaleRivalOpponent(next, p.level), true, false, false, true);
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
      p.bountyProgress.bossWins += 1;
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
    const chest = rollChest(state);
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
function renderSkillMenu() {
  const p = state.player;
  const menu = el('battle-menu-skills');
  menu.innerHTML = '';
  SKILL_ORDER.filter((key) => p.knownSkills.includes(key)).forEach((key) => {
    const skill = SKILLS[key];
    const btn = document.createElement('button');
    btn.className = 'btn btn-battle';
    btn.textContent = `${skill.name} (${skill.mpCost} MP)`;
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
    desc = `You found an Unidentified ${GEAR_SLOTS[chest.slot].label}! Bring it to Deckard Cain in Town to find out what it is.`;
  } else if (chest.type === 'charm') {
    desc = `You found a ${CHARMS[chest.key].name}! Equip it on your active companion from the Pet Tamer.`;
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

const STATUS_TABS = { status: 'status-body', bestiary: 'bestiary-body', achievements: 'achievements-body', legacy: 'legacy-body', sets: 'sets-body', abilities: 'abilities-body' };
function showStatusTab(tab) {
  Object.entries(STATUS_TABS).forEach(([key, bodyId]) => {
    el(`tab-${key}`).classList.toggle('tab-active', key === tab);
    el(bodyId).classList.toggle('hidden', key !== tab);
  });
  if (tab === 'bestiary') renderBestiary();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'legacy') renderLegacy();
  if (tab === 'sets') renderSets();
  if (tab === 'abilities') renderAbilities();
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
  el('status-name').textContent = `${p.name} — Lv. ${p.level}`;
  const body = el('status-body');

  const petProgress = p.activePetKey ? petXpProgress(p, p.activePetKey) : null;
  const activePetPower = p.activePetKey ? petEffectivePower(p, p.activePetKey) * (1 + (charmPowerBonus(p) + petPowerSetBonus(p)) / 100) : 0;
  const petDamageRow = p.activePetKey ? `
    <div class="status-row"><span>Pet Damage</span><span>${Math.max(1, Math.round(effectiveAtk(p) * activePetPower))} per hit (+${Math.round(activePetPower * 100)}% ATK)</span></div>
  ` : '';
  // Fusion can grant a companion more than one ability, so this lists all
  // of them (its own plus anything fused in) rather than just the one.
  const activeAbilities = p.activePetKey ? petAbilities(p, p.activePetKey).map((k) => COMPANION_ABILITIES[k]) : [];
  const abilityUnlocked = p.activePetKey && petLevel(p, p.activePetKey) >= COMPANION_ABILITY_LEVEL;
  const petAbilityRow = activeAbilities.length > 0 ? `
    <div class="status-row"><span>Pet Abilit${activeAbilities.length > 1 ? 'ies' : 'y'}</span><span>${abilityUnlocked ? activeAbilities.map((a) => a.name).join(', ') : `${activeAbilities.map((a) => a.name).join(', ')} (unlocks at Lv. ${COMPANION_ABILITY_LEVEL})`}</span></div>
  ` : '';
  const petBar = petProgress ? `
    <div class="bar-track pet-xp">
      <div class="bar-fill" style="width:${Math.round((petProgress.xpIntoLevel / petProgress.xpNeeded) * 100)}%"></div>
      <span class="bar-text">${petProgress.xpIntoLevel}/${petProgress.xpNeeded} XP</span>
    </div>
  ` : '';
  body.innerHTML = `
    <div class="status-row"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="status-row"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
    <div class="status-row"><span>Attack</span><span>${effectiveAtk(p)} (${p.baseAtk}+${weapon.atkBonus})</span></div>
    <div class="status-row"><span>Defense</span><span>${effectiveDef(p)} (${p.baseDef}+${armor.defBonus})</span></div>
    <div class="status-row"><span>Crit Chance</span><span>${critChance(p)}%</span></div>
    <div class="status-row"><span>Dodge Chance</span><span>${dodgeChance(p)}%</span></div>
    <div class="status-row"><span>Skill Cost / XP / Gold</span><span>-${mpCostReduction(p)}% / +${xpBonusPercent(p)}% / +${goldBonusPercent(p)}%</span></div>
    <div class="status-row"><span>XP</span><span>${p.xp}/${p.xpToNext}</span></div>
    <div class="status-row"><span>Gold</span><span>${p.gold}</span></div>
    <div class="status-row"><span>Unidentified Items</span><span>${p.unidentifiedItems.length} (see Deckard Cain)</span></div>
    <div class="status-row"><span>Arena Best</span><span>Wave ${p.arenaBestWave}</span></div>
    <div class="status-row"><span>Skills</span><span>${SKILL_ORDER.filter((k) => p.knownSkills.includes(k)).map((k) => SKILLS[k].name).join(', ')}</span></div>
    <div class="status-row"><span>Pet</span><span>${p.activePetKey ? `${petDisplayName(p, p.activePetKey)} (Lv. ${petLevel(p, p.activePetKey)})` : 'None'}</span></div>
    ${petDamageRow}
    ${petAbilityRow}
    ${petBar}
    <div class="status-row"><span>Companion Charm</span><span>${CHARMS[p.charmKey].name}${charmPowerBonus(p) > 0 ? ` (+${charmPowerBonus(p)}% pet damage)` : ''}</span></div>
    <div class="status-row"><span>Monsters Caught</span><span>${p.ownedPets.filter((k) => CAPTURABLE_KEYS.has(k)).length}/${CAPTURABLE_MONSTERS.length}</span></div>
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

  // Charms can be swapped right here — no trip to the Pet Tamer needed.
  body.appendChild(sectionHeading('Companion Charm'));
  CHARM_ORDER.filter((key) => p.ownedCharms.includes(key)).forEach((key) => body.appendChild(buildCharmRow(CHARMS[key], renderStatus)));
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
}

function buildInventoryTile(gear, slot) {
  const p = state.player;
  const cfg = GEAR_SLOTS[slot];
  const tile = document.createElement('button');
  tile.className = 'inventory-tile';
  tile.innerHTML = `
    <div class="inventory-tile-icon" style="background-image:url('${gear.sprite}')"></div>
    <span class="inventory-tile-name">${gear.name}</span>
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
      const caught = p.ownedPets.includes(enemy.key);
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
  ACHIEVEMENTS.forEach((ach) => {
    const unlocked = !!p.achievements[ach.key];
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name ${unlocked ? 'bestiary-killed' : ''}">${ach.name}</span>
        <span class="shop-item-desc">${ach.desc}${ach.rewardGold > 0 ? ` — Reward: ${ach.rewardGold}G` : ''}</span>
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

// ---------- Hall of Legacy ----------
// A single aggregated "how far have you gotten" screen, mostly derived
// from state already tracked elsewhere (bestiary, achievements, flags,
// ownedPets/Charms) plus two new lifetime counters (kills, gold earned)
// that — unlike bountyProgress — never reset.
function renderLegacy() {
  const p = state.player;
  const body = el('legacy-body');
  const bossesDefeated = LEVEL_CHAIN.filter((id) => state.flags[MAPS[id].bossFlag]).length;
  const totalMonsters = LEVEL_CHAIN.reduce((sum, id) => sum + Object.keys(MAPS[id].enemyPool).length, 0);
  const monstersKilled = LEVEL_CHAIN.reduce((sum, id) => sum + Object.keys(MAPS[id].enemyPool).filter((k) => p.bestiary[k]).length, 0);
  const achievementsUnlocked = ACHIEVEMENTS.filter((a) => p.achievements[a.key]).length;
  const totalCompanions = Object.keys(ALL_PET_DEFS).length;
  const totalCharms = CHARM_ORDER.length - 1; // "No Charm" doesn't count as a find

  body.innerHTML = `
    <div class="status-row"><span>Character</span><span>Lv. ${p.level}${p.ngPlusLevel > 0 ? ` (NG+${p.ngPlusLevel})` : ''}</span></div>
    <div class="status-row"><span>Lifetime Kills</span><span>${p.lifetimeKills || 0}</span></div>
    <div class="status-row"><span>Lifetime Gold Earned</span><span>${p.lifetimeGoldEarned || 0}</span></div>
    <div class="status-row"><span>Gold on Hand</span><span>${p.gold}</span></div>
    <div class="status-row"><span>Bosses Defeated</span><span>${bossesDefeated}/${LEVEL_CHAIN.length}</span></div>
    <div class="status-row"><span>Bestiary</span><span>${monstersKilled}/${totalMonsters}</span></div>
    <div class="status-row"><span>Companions Owned</span><span>${p.ownedPets.length}/${totalCompanions}</span></div>
    <div class="status-row"><span>Shiny Companions</span><span>${(p.shinyPets || []).length}</span></div>
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

  // Enchanting only makes sense for Weapon/Armor's flat ATK/DEF bonus — the
  // other three slots carry percent-based mechanics instead.
  if (p.ownedWeapons.length > 0 || p.ownedArmors.length > 0) {
    list.appendChild(sectionHeading('Enchant'));
    GEAR_SLOTS.weapon.order.filter((key) => p.ownedWeapons.includes(key)).forEach((key) => list.appendChild(buildEnchantRow(WEAPONS[key], 'weapon')));
    GEAR_SLOTS.armor.order.filter((key) => p.ownedArmors.includes(key)).forEach((key) => list.appendChild(buildEnchantRow(ARMORS[key], 'armor')));
  }
}

// A flat stat bonus per owned gear key, stacked regardless of which piece
// is currently equipped — a gold sink and a reason to keep favorite gear.
function buildEnchantRow(item, slot) {
  const p = state.player;
  const level = enchantLevel(p, slot, item.key);
  const maxed = level >= ENCHANT_MAX_LEVEL;
  const statLabel = slot === 'weapon' ? 'ATK' : 'DEF';

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">+${level * ENCHANT_BONUS_PER_LEVEL} ${statLabel} (${level}/${ENCHANT_MAX_LEVEL})</span>
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
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}${set ? ` <span class="bestiary-caught">(${set.name})</span>` : ''}</span>
      <span class="shop-item-desc">${gearStatLabel(slot, item)} — ${owned ? 'Owned' : priceLabel}</span>
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
// what you actually found, for a flat fee per item.
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
    return;
  }
  p.unidentifiedItems.forEach((unident, idx) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const cfg = GEAR_SLOTS[unident.slot];
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">Unidentified ${cfg.label}</span>
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
      autosave();
      showToast(`It's a ${gear.name}!`, 2600);
      renderCain();
    });
    row.appendChild(btn);
    list.appendChild(row);
  });
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
  startBattle(scaleForNGPlus(MAPS[order[0]].bossEnemy, state.player.ngPlusLevel), true, false, true);
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
  startBattle(scaleRivalOpponent(RIVAL_TEAM[0], state.player.level), true, false, false, true);
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
function renderTamer() {
  const p = state.player;
  el('tamer-gold').textContent = p.gold;
  const list = el('tamer-list');
  list.innerHTML = '';

  const noneRow = document.createElement('div');
  noneRow.className = 'shop-item';
  noneRow.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">No Pet</span>
      <span class="shop-item-desc">Fight alone</span>
    </div>
  `;
  const noneBtn = document.createElement('button');
  noneBtn.className = 'btn btn-small';
  if (!p.activePetKey) {
    noneBtn.textContent = 'Active';
    noneBtn.disabled = true;
  } else {
    noneBtn.textContent = 'Select';
    noneBtn.addEventListener('click', () => {
      p.activePetKey = null;
      autosave();
      renderTamer();
    });
  }
  noneRow.appendChild(noneBtn);
  list.appendChild(noneRow);

  // Companions can come from the Tamer's own catalog or from capturing wild
  // monsters in battle — both live in the same ownedPets list, so this
  // section lists whichever ones you actually have before the shop catalog
  // of ones you don't.
  if (p.ownedPets.length > 0) {
    list.appendChild(sectionHeading('Your Companions'));
    p.ownedPets
      .map((key) => ALL_PET_DEFS[key])
      .filter(Boolean)
      .sort((a, b) => a.power - b.power)
      .forEach((pet) => list.appendChild(buildCompanionRow(pet)));
  }

  list.appendChild(sectionHeading('Adopt a Pet'));
  Object.values(PETS).filter((pet) => !p.ownedPets.includes(pet.key)).forEach((pet) => list.appendChild(buildTamerRow(pet)));

  // Charms are chest-only finds, never sold here — just an Equip list over
  // whatever you've already picked up (the free "No Charm" is always owned).
  list.appendChild(sectionHeading('Companion Charm'));
  CHARM_ORDER.filter((key) => p.ownedCharms.includes(key)).forEach((key) => list.appendChild(buildCharmRow(CHARMS[key], renderTamer)));
}

// Any owned companion (bought or caught) — Select/Active only, no buy flow.
function buildCompanionRow(pet) {
  const p = state.player;
  const isActive = p.activePetKey === pet.key;
  const level = petLevel(p, pet.key);
  const evolved = petIsEvolved(p, pet.key);
  const shiny = petIsShiny(p, pet.key);
  const powerPct = Math.round(petEffectivePower(p, pet.key) * 100);
  const abilityNames = petAbilities(p, pet.key).map((k) => COMPANION_ABILITIES[k].name);
  const abilityLabel = abilityNames.length > 0
    ? (level >= COMPANION_ABILITY_LEVEL ? abilityNames.join(', ') : `${abilityNames.join(', ')} at Lv. ${COMPANION_ABILITY_LEVEL}`)
    : null;
  const fusion = p.fusionBonus && p.fusionBonus[pet.key];
  const fusionLabel = fusion && fusion.power ? ` — +${fusion.power}% from Fusion` : '';

  const row = document.createElement('div');
  row.className = 'shop-item';
  const iconClass = `${evolved ? ' pet-evolved' : ''}${shiny ? ' pet-shiny' : ''}`;
  row.innerHTML = `
    <div class="shop-item-icon${iconClass}" style="background-image:url('${pet.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${petDisplayName(p, pet.key)}</span>
      <span class="shop-item-desc">Lv. ${level} — +${powerPct}% ATK per turn${pet.zoneName ? ` (caught in ${pet.zoneName})` : ''}${abilityLabel ? ` — ${abilityLabel}` : ''}${fusionLabel}</span>
    </div>
  `;
  if (isActive) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = 'Active';
    btn.disabled = true;
    row.appendChild(btn);
  } else {
    const selectBtn = document.createElement('button');
    selectBtn.className = 'btn btn-small';
    selectBtn.textContent = 'Select';
    selectBtn.addEventListener('click', () => {
      p.activePetKey = pet.key;
      autosave();
      renderTamer();
    });
    row.appendChild(selectBtn);

    if (p.activePetKey) {
      const fuseBtn = document.createElement('button');
      fuseBtn.className = 'btn btn-small';
      fuseBtn.textContent = 'Fuse';
      fuseBtn.addEventListener('click', () => {
        const activeName = petDisplayName(p, p.activePetKey);
        const gain = fusionPowerGain(level);
        const activeAbility = ALL_PET_DEFS[p.activePetKey].ability;
        const gainsAbility = pet.ability !== activeAbility && !petAbilities(p, p.activePetKey).includes(pet.ability);
        const confirmMsg = `Fuse ${petDisplayName(p, pet.key)} (Lv. ${level}) into ${activeName}? This permanently removes ${pet.name} from your team and grants +${gain}% power${gainsAbility ? ` plus the ${COMPANION_ABILITIES[pet.ability].name} ability` : ''}.`;
        if (!window.confirm(confirmMsg)) return;
        fuseCompanions(p, pet.key, p.activePetKey);
        autosave();
        updateHud();
        renderTamer();
      });
      row.appendChild(fuseBtn);
    }
  }
  return row;
}

// Permanently sacrifices sacrificeKey into targetKey: a flat power bump
// scaling with how leveled the sacrifice was, plus its ability if the
// target doesn't already have it. The sacrifice's own level/XP resets on
// re-acquisition later since its progress record is cleared here.
function fuseCompanions(p, sacrificeKey, targetKey) {
  const sacrifice = ALL_PET_DEFS[sacrificeKey];
  const gain = fusionPowerGain(petLevel(p, sacrificeKey));
  if (!p.fusionBonus[targetKey]) p.fusionBonus[targetKey] = { power: 0, extraAbilities: [] };
  const fusion = p.fusionBonus[targetKey];
  fusion.power += gain;
  if (!petAbilities(p, targetKey).includes(sacrifice.ability) && !fusion.extraAbilities.includes(sacrifice.ability)) {
    fusion.extraAbilities.push(sacrifice.ability);
  }
  p.ownedPets = p.ownedPets.filter((k) => k !== sacrificeKey);
  delete p.petProgress[sacrificeKey];
  if (p.activePetKey === sacrificeKey) p.activePetKey = targetKey;
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
  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${pet.name}</span>
      <span class="shop-item-desc">+${Math.round(pet.power * 100)}% ATK per turn — ${pet.price}G</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  btn.textContent = 'Adopt';
  btn.disabled = p.gold < pet.price;
  btn.addEventListener('click', () => {
    if (p.gold < pet.price) return;
    p.gold -= pet.price;
    p.ownedPets.push(pet.key);
    const shiny = Math.random() < SHINY_CHANCE;
    if (shiny) p.shinyPets.push(pet.key);
    p.activePetKey = pet.key;
    autosave();
    if (shiny) showToast(`It's Shiny! ${petDisplayName(p, pet.key)} joined your team!`, 2800);
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

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${skill.name}</span>
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
  el('tab-bestiary').addEventListener('click', () => showStatusTab('bestiary'));
  el('tab-achievements').addEventListener('click', () => showStatusTab('achievements'));
  el('tab-legacy').addEventListener('click', () => showStatusTab('legacy'));
  el('tab-sets').addEventListener('click', () => showStatusTab('sets'));
  el('tab-abilities').addEventListener('click', () => showStatusTab('abilities'));

  el('btn-character').addEventListener('click', () => {
    renderInventoryModal();
    showModal('modal-inventory');
  });
  el('btn-inventory-close').addEventListener('click', () => hideModal('modal-inventory'));

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
  el('btn-town-ngplus').addEventListener('click', () => {
    hideModal('modal-town');
    showModal('modal-ngplus-confirm');
  });
  el('btn-town-abyss').addEventListener('click', () => {
    hideModal('modal-town');
    travelToLevel('abyssaldepths');
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
    startBattle(scaleForNGPlus(pickArenaEnemy(state.arenaWave), state.player.ngPlusLevel), false, true);
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
    startBattle(scaleForNGPlus(MAPS[state.mapId].bossEnemy, state.player.ngPlusLevel), true);
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
