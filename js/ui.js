import { ITEMS, SKILLS, WEAPONS, ARMORS, PETS, HERO_SPRITE, MAPS } from './data.js';
import { newGameState, toSaveObject, fromSaveObject, effectiveAtk, effectiveDef } from './state.js';
import { hasSave, loadSave, writeSave, clearSave } from './save.js';
import { drawMap, tryMove, heroImage, bossImages, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { createBattle, pickRandomEnemy, playerAttack, playerSkill, playerItem, playerRun, grantRewards, rollChest } from './battle.js';

let state = null;
let battle = null;
let prevPos = null;

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
  writeSave(toSaveObject(state));
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
    showModal('modal-town');
    return;
  }
  if (result.type === 'boss') {
    el('boss-modal-title').textContent = `${MAPS[state.mapId].bossEnemy.name} blocks the way`;
    showModal('modal-boss');
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
  if (result.type === 'portal') {
    state.mapId = result.mapId;
    state.pos = { ...result.pos };
    autosave();
    goToMap();
    showToast(`You arrive in ${MAPS[state.mapId].name}.`, 2200);
    return;
  }
  if (result.type === 'encounter') {
    startBattle(pickRandomEnemy(MAPS[state.mapId].enemyPool), false);
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

function startBattle(enemyDef, isBoss) {
  battle = createBattle(enemyDef, isBoss);
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
    if (battle.isBoss) {
      const map = MAPS[state.mapId];
      state.flags[map.bossFlag] = true;
      autosave();
      if (map.nextMap) {
        // A path onward opens — no full "the end" screen yet.
        showToast(`${msg} The way onward has opened!`, 2800);
        goToMap();
      } else {
        showScreen('victory');
      }
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
  state.mapId = 'overworld';
  state.pos = { ...MAPS.overworld.townPos };
  // step off the town tile so re-entering fires the town event naturally later
  state.pos.y += 1;
  autosave();
  goToMap();
  showToast('You limp back to town, a little poorer.', 2400);
}

// ---------- Item submenu ----------
function renderItemMenu() {
  const p = state.player;
  const potionBtn = el('btn-item-potion');
  const etherBtn = el('btn-item-ether');
  potionBtn.textContent = `${ITEMS.potion.name} (${p.inventory.potion || 0})`;
  potionBtn.disabled = !(p.inventory.potion > 0);
  etherBtn.textContent = `${ITEMS.ether.name} (${p.inventory.ether || 0})`;
  etherBtn.disabled = !(p.inventory.ether > 0);
}

// ---------- Skill submenu (battle) ----------
function renderSkillMenu() {
  const p = state.player;
  const menu = el('battle-menu-skills');
  menu.innerHTML = '';
  p.knownSkills.forEach((key) => {
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
  } else {
    desc = `You found a Scroll of ${SKILLS[chest.skillKey].name} and learned it!`;
  }
  el('chest-desc').textContent = desc;
}

// ---------- Status ----------
function renderStatus() {
  const p = state.player;
  const weapon = WEAPONS[p.weaponKey];
  const armor = ARMORS[p.armorKey];
  el('status-name').textContent = `${p.name} — Lv. ${p.level}`;
  el('status-body').innerHTML = `
    <div class="status-row"><span>HP</span><span>${p.hp}/${p.maxHp}</span></div>
    <div class="status-row"><span>MP</span><span>${p.mp}/${p.maxMp}</span></div>
    <div class="status-row"><span>Attack</span><span>${effectiveAtk(p)} (${p.baseAtk}+${weapon.atkBonus})</span></div>
    <div class="status-row"><span>Defense</span><span>${effectiveDef(p)} (${p.baseDef}+${armor.defBonus})</span></div>
    <div class="status-row"><span>XP</span><span>${p.xp}/${p.xpToNext}</span></div>
    <div class="status-row"><span>Gold</span><span>${p.gold}</span></div>
    <div class="status-row"><span>Weapon</span><span>${weapon.name}</span></div>
    <div class="status-row"><span>Armor</span><span>${armor.name}</span></div>
    <div class="status-row"><span>Potions</span><span>${p.inventory.potion || 0}</span></div>
    <div class="status-row"><span>Ethers</span><span>${p.inventory.ether || 0}</span></div>
    <div class="status-row"><span>Skills</span><span>${p.knownSkills.map((k) => SKILLS[k].name).join(', ')}</span></div>
    <div class="status-row"><span>Pet</span><span>${p.activePetKey ? PETS[p.activePetKey].name : 'None'}</span></div>
  `;
}

// ---------- Armory ----------
function renderArmory() {
  el('armory-gold').textContent = state.player.gold;
  const list = el('armory-list');
  list.innerHTML = '<h3 class="armory-section">Weapons</h3>';
  Object.values(WEAPONS).forEach((w) => list.appendChild(buildArmoryRow(w, 'weapon', '+' + w.atkBonus + ' ATK')));
  const armorHeading = document.createElement('h3');
  armorHeading.className = 'armory-section';
  armorHeading.textContent = 'Armor';
  list.appendChild(armorHeading);
  Object.values(ARMORS).forEach((a) => list.appendChild(buildArmoryRow(a, 'armor', '+' + a.defBonus + ' DEF')));
}

function buildArmoryRow(item, slot, statLabel) {
  const p = state.player;
  const equippedKey = slot === 'weapon' ? p.weaponKey : p.armorKey;
  const owned = (slot === 'weapon' ? p.ownedWeapons : p.ownedArmors).includes(item.key);
  const isEquipped = equippedKey === item.key;

  const row = document.createElement('div');
  row.className = 'shop-item';
  const priceLabel = item.price > 0 ? `${item.price}G` : 'Free';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${item.name}</span>
      <span class="shop-item-desc">${statLabel} — ${owned ? 'Owned' : priceLabel}</span>
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
      if (slot === 'weapon') p.weaponKey = item.key; else p.armorKey = item.key;
      autosave();
      renderArmory();
    });
  } else {
    btn.textContent = 'Buy';
    btn.disabled = p.gold < item.price;
    btn.addEventListener('click', () => {
      if (p.gold < item.price) return;
      p.gold -= item.price;
      if (slot === 'weapon') { p.ownedWeapons.push(item.key); p.weaponKey = item.key; }
      else { p.ownedArmors.push(item.key); p.armorKey = item.key; }
      autosave();
      renderArmory();
    });
  }
  row.appendChild(btn);
  return row;
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

  const row = document.createElement('div');
  row.className = 'shop-item';
  row.innerHTML = `
    <div class="shop-item-info">
      <span class="shop-item-name">${pet.name}</span>
      <span class="shop-item-desc">+${Math.round(pet.power * 100)}% ATK per turn — ${owned ? 'Owned' : pet.price + 'G'}</span>
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

  el('btn-status').addEventListener('click', () => { renderStatus(); showModal('modal-status'); });
  el('btn-status-close').addEventListener('click', () => hideModal('modal-status'));

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

  // Boss modal
  el('btn-boss-fight').addEventListener('click', () => {
    hideModal('modal-boss');
    startBattle(MAPS[state.mapId].bossEnemy, true);
  });
  el('btn-boss-retreat').addEventListener('click', () => {
    hideModal('modal-boss');
    if (prevPos) { state.pos = { ...prevPos }; redrawMap(); }
  });

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
  el('btn-item-back').addEventListener('click', () => {
    el('battle-menu-items').classList.add('hidden');
    el('battle-menu-main').classList.remove('hidden');
  });
  el('btn-item-potion').addEventListener('click', () => {
    playerItem(battle, state, 'potion');
    el('battle-menu-items').classList.add('hidden');
    el('battle-menu-main').classList.remove('hidden');
    renderBattle();
  });
  el('btn-item-ether').addEventListener('click', () => {
    playerItem(battle, state, 'ether');
    el('battle-menu-items').classList.add('hidden');
    el('battle-menu-main').classList.remove('hidden');
    renderBattle();
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
