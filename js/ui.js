import { ITEMS, SKILLS, WEAPONS, ARMORS, GEAR_SLOTS, PETS, HERO_SPRITE, MAPS, LEVEL_CHAIN, ACHIEVEMENTS, ENCHANT_MAX_LEVEL, ENCHANT_BONUS_PER_LEVEL, enchantCost, BOUNTY_TEMPLATES, ngPlusMultiplier, CONSUMABLE_ITEMS, IDENTIFY_COST, SKILL_ORDER } from './data.js';
import { newGameState, toSaveObject, fromSaveObject, ensureLayout, effectiveAtk, effectiveDef, petLevel, petEffectivePower, petXpProgress, enchantLevel, startNewGamePlus, mpCostReduction, xpBonusPercent, critChance, dodgeChance, goldBonusPercent } from './state.js';
import { hasSave, loadSave, writeSave, clearSave } from './save.js';
import { drawMap, tryMove, heroImage, bossImages, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { createBattle, pickRandomEnemy, pickArenaEnemy, playerAttack, playerSkill, playerItem, playerRun, grantRewards, rollChest, consumeItem, scaleForNGPlus } from './battle.js';

let state = null;
let battle = null;
let prevPos = null;
let bossRush = null;

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
    petEl.style.backgroundImage = `url('${PETS[p.activePetKey].sprite}')`;
    petEl.classList.remove('hidden');
  } else {
    petEl.classList.add('hidden');
  }

  const menuMain = el('battle-menu-main');
  const menuItems = el('battle-menu-items');
  const menuSkills = el('battle-menu-skills');
  const continueBtn = el('btn-battle-continue');

  if (battle.over) {
    menuMain.classList.add('hidden');
    menuItems.classList.add('hidden');
    menuSkills.classList.add('hidden');
    continueBtn.classList.remove('hidden');
  } else {
    continueBtn.classList.add('hidden');
  }
}

function startBattle(enemyDef, isBoss, isArena = false, isBossRush = false) {
  battle = createBattle(enemyDef, isBoss);
  battle.isArena = isArena;
  battle.isBossRush = isBossRush;
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
      const pet = PETS[p.activePetKey];
      msg += ` ${pet.name} is now Lv. ${petLevel(p, p.activePetKey)}!`;
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
    showScreen('gameover');
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

const STATUS_TABS = { status: 'status-body', bestiary: 'bestiary-body', achievements: 'achievements-body' };
function showStatusTab(tab) {
  Object.entries(STATUS_TABS).forEach(([key, bodyId]) => {
    el(`tab-${key}`).classList.toggle('tab-active', key === tab);
    el(bodyId).classList.toggle('hidden', key !== tab);
  });
  if (tab === 'bestiary') renderBestiary();
  if (tab === 'achievements') renderAchievements();
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


function renderStatus() {
  const p = state.player;
  const weapon = WEAPONS[p.weaponKey];
  const armor = ARMORS[p.armorKey];
  el('status-name').textContent = `${p.name} — Lv. ${p.level}`;
  const body = el('status-body');

  const petProgress = p.activePetKey ? petXpProgress(p, p.activePetKey) : null;
  const petDamageRow = p.activePetKey ? `
    <div class="status-row"><span>Pet Damage</span><span>${Math.max(1, Math.round(effectiveAtk(p) * petEffectivePower(p, p.activePetKey)))} per hit (+${Math.round(petEffectivePower(p, p.activePetKey) * 100)}% ATK)</span></div>
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
    <div class="status-row"><span>Pet</span><span>${p.activePetKey ? `${PETS[p.activePetKey].name} (Lv. ${petLevel(p, p.activePetKey)})` : 'None'}</span></div>
    ${petDamageRow}
    ${petBar}
  `;

  body.appendChild(sectionHeading('Items'));
  CONSUMABLE_ITEMS.forEach((item) => body.appendChild(buildStatusItemRow(item.key)));
  body.appendChild(buildTownScrollRow());
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
      row.innerHTML = `<span class="${killed ? 'bestiary-killed' : ''}">${enemy.name}</span>`;
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
  row.innerHTML = `
    <div class="shop-item-icon" style="background-image:url('${item.sprite}')"></div>
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
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

// ---------- Travel (level select) ----------
// Lists every level ever reached, in chain order, so you can jump straight
// to any of them from Town instead of only ever landing back on whichever
// one is "current" — free exploration/backtracking without walking it.
function renderLevelSelect() {
  const list = el('levelselect-list');
  list.innerHTML = '';
  LEVEL_CHAIN.filter((id) => state.reachedLevels.includes(id)).forEach((mapId) => {
    const map = MAPS[mapId];
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `
      <div class="shop-item-info">
        <span class="shop-item-name">${map.name}</span>
        <span class="shop-item-desc">Depth ${map.depth}${mapId === state.currentLevelId ? ' — current' : ''}</span>
      </div>
    `;
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = 'Travel';
    btn.addEventListener('click', () => travelToLevel(mapId));
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

  Object.values(PETS).forEach((pet) => list.appendChild(buildTamerRow(pet)));
}

function buildTamerRow(pet) {
  const p = state.player;
  const owned = p.ownedPets.includes(pet.key);
  const isActive = p.activePetKey === pet.key;
  const level = petLevel(p, pet.key);
  const powerPct = Math.round(petEffectivePower(p, pet.key) * 100);
  const statLabel = owned
    ? `Lv. ${level} — +${powerPct}% ATK per turn`
    : `+${Math.round(pet.power * 100)}% ATK per turn`;

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${pet.name}</span>
      <span class="shop-item-desc">${statLabel} — ${owned ? 'Owned' : pet.price + 'G'}</span>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'btn btn-small';
  if (isActive) {
    btn.textContent = 'Active';
    btn.disabled = true;
  } else if (owned) {
    btn.textContent = 'Select';
    btn.addEventListener('click', () => {
      p.activePetKey = pet.key;
      autosave();
      renderTamer();
    });
  } else {
    btn.textContent = 'Adopt';
    btn.disabled = p.gold < pet.price;
    btn.addEventListener('click', () => {
      if (p.gold < pet.price) return;
      p.gold -= pet.price;
      p.ownedPets.push(pet.key);
      p.activePetKey = pet.key;
      autosave();
      renderTamer();
    });
  }
  row.appendChild(btn);
  return row;
}

// ---------- Knight / Mage skill vendors ----------
function renderVendor(vendorKey, goldElId, listElId) {
  const p = state.player;
  el(goldElId).textContent = p.gold;
  const list = el(listElId);
  list.innerHTML = '';
  Object.values(SKILLS)
    .filter((s) => s.vendor === vendorKey)
    .forEach((skill) => {
      const known = p.knownSkills.includes(skill.key);
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="shop-item-info">
          <span class="shop-item-name">${skill.name}</span>
          <span class="shop-item-desc">${skill.mpCost} MP, power ${skill.power}x — ${known ? 'Known' : skill.price + 'G'}</span>
        </div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      if (known) {
        btn.textContent = 'Known';
        btn.disabled = true;
      } else {
        btn.textContent = 'Learn';
        btn.disabled = p.gold < skill.price;
        btn.addEventListener('click', () => {
          if (p.gold < skill.price) return;
          p.gold -= skill.price;
          p.knownSkills.push(skill.key);
          autosave();
          renderVendor(vendorKey, goldElId, listElId);
        });
      }
      row.appendChild(btn);
      list.appendChild(row);
    });
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
