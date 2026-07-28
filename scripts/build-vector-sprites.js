// Generates every game sprite as a vector (SVG) file using the templates
// in gen-vector-sprites.js, replacing the old pixel-grid PNGs in
// icons/sprites/. Structured exactly like the old gen-sprites.js: each
// creature/boss/gear piece is one line recoloring a shared template, so
// this file is almost entirely per-item palettes, not per-item art.
const {
  hex,
  buildQuadrupedTemplate, buildBipedTemplate, buildFlierTemplate, buildBlobTemplate, buildSerpentTemplate,
  buildArmoredBossTemplate, buildRobedBossTemplate, buildGolemBossTemplate, buildDragonBossTemplate,
  buildHero, buildChest, buildSpecter, buildTurtle,
  buildSwordIcon, buildArmorIcon, buildHelmetIcon, buildGlovesIcon, buildBootsIcon, buildShieldIcon,
  buildBeltIcon, buildCharmIcon, buildAmuletIcon, buildRingIcon, buildHeldItemIcon,
  fs, path,
} = require('./gen-vector-sprites.js');

// ---------- Hero, Chest ----------
const buildHeroSprite = () => buildHero({
  h: [107, 68, 35, 255], f: [240, 192, 144, 255], o: [36, 26, 18, 255],
  b: [47, 95, 168, 255], g: [212, 168, 64, 255], p: [74, 59, 42, 255], s: [216, 216, 224, 255],
});
const buildChestSprite = () => buildChest({
  w: [107, 74, 42, 255], w2: [138, 98, 58, 255], d: [70, 48, 26, 255], g: [212, 168, 64, 255],
});

// ---------- Early zones' bespoke creatures, mapped onto the shared
// templates (same colors as before, translated to the new key scheme).
// ---------- ----------
const buildSlime = () => buildBlobTemplate({
  m: [63, 174, 74, 255], l: [143, 224, 143, 255], o: [22, 50, 26, 255], d: [34, 110, 46, 255],
});
const buildGoblin = () => buildBipedTemplate({
  k: [90, 138, 58, 255], d: [53, 85, 31, 255], v: [107, 74, 42, 255],
  r: [201, 48, 48, 255], w: [138, 106, 58, 255], o: [26, 26, 26, 255],
});
const buildWolf = () => buildQuadrupedTemplate({
  b: [107, 107, 117, 255], d: [63, 63, 71, 255], e: [201, 48, 48, 255],
});
const buildBat = () => buildFlierTemplate({
  b: [58, 38, 74, 255], d: [31, 20, 42, 255], e: [201, 48, 48, 255],
});
const buildFrostGolem = () => buildBipedTemplate({
  k: [176, 224, 240, 255], d: [110, 170, 200, 255], v: [140, 200, 225, 255],
  r: [120, 220, 255, 255], w: [150, 210, 230, 255], o: [70, 120, 150, 255],
});
const buildIceSprite = () => buildFlierTemplate({
  b: [210, 240, 250, 255], d: [150, 195, 210, 255], e: [40, 60, 90, 255],
});
const buildWyrmling = () => buildSerpentTemplate({
  b: [180, 74, 54, 255], d: [90, 35, 28, 255], w: [130, 50, 38, 255], h: [212, 168, 64, 255], e: [230, 200, 60, 255],
});
const buildDrake = () => buildSerpentTemplate({
  b: [110, 60, 140, 255], d: [55, 28, 68, 255], w: [70, 35, 90, 255], h: [212, 168, 64, 255], e: [230, 110, 40, 255],
});

// ---------- Pets (Pet Tamer roster), mapped onto the shared templates
// ---------- ----------
const buildTurtlePet = () => buildTurtle({
  s: [70, 140, 60, 255], h: [190, 160, 90, 255], e: [30, 20, 10, 255],
});
const buildWolfPup = () => buildQuadrupedTemplate({
  b: [168, 120, 74, 255], d: [110, 76, 46, 255], e: [40, 30, 20, 255],
});
const buildFox = () => buildQuadrupedTemplate({
  b: [214, 110, 40, 255], d: [140, 60, 20, 255], e: [30, 20, 10, 255],
});
const buildHawk = () => buildFlierTemplate({
  b: [120, 80, 50, 255], d: [76, 50, 30, 255], e: [40, 30, 20, 255],
});
const buildBoar = () => buildQuadrupedTemplate({
  b: [110, 90, 80, 255], d: [70, 55, 50, 255], e: [20, 15, 10, 255],
});
const buildSalamander = () => buildQuadrupedTemplate({
  b: [200, 70, 40, 255], d: [130, 40, 20, 255], e: [255, 180, 60, 255],
});
const buildOwl = () => buildFlierTemplate({
  b: [150, 110, 60, 255], d: [100, 70, 35, 255], e: [20, 15, 10, 255],
});
const buildBabyGolem = () => buildBipedTemplate({
  k: [150, 140, 120, 255], d: [96, 88, 72, 255], v: [130, 120, 100, 255],
  r: [230, 180, 80, 255], w: [140, 130, 110, 255], o: [70, 64, 52, 255],
});
const buildPanther = () => buildQuadrupedTemplate({
  b: [35, 35, 42, 255], d: [20, 20, 25, 255], e: [80, 220, 90, 255],
});
const buildDragonling = () => buildSerpentTemplate({
  b: [70, 160, 90, 255], d: [35, 90, 50, 255], w: [50, 120, 70, 255], h: [212, 168, 64, 255], e: [255, 210, 60, 255],
});

// ---------- Ghost enemy ----------
const buildSpecterEnemy = () => buildSpecter({
  g: [150, 205, 215, 175], e: [230, 255, 255, 255],
});

// ---------- Boss archetypes, formerly `function buildX() { return
// buildYTemplate({...}); }` — same colors, arrow-function form for
// consistency with every other caller in this file.
const buildDarkKnight = () => buildArmoredBossTemplate({
  a: [58, 58, 68, 255], a2: [92, 92, 106, 255], d: [27, 27, 33, 255], r: [224, 48, 63, 255],
  s: [216, 216, 224, 255], gr: [244, 244, 250, 255], g: [176, 138, 62, 255], o: [15, 15, 18, 255], c: [70, 15, 25, 255],
});
const buildLich = () => buildRobedBossTemplate({
  k: [225, 220, 200, 255], e: [80, 230, 120, 255], j: [40, 35, 30, 255], r: [58, 34, 84, 255],
  r2: [92, 58, 130, 255], d: [24, 14, 36, 255], w: [107, 74, 42, 255], o: [178, 88, 224, 255],
});
const buildGlacialTitan = () => buildGolemBossTemplate({
  i: [190, 225, 240, 255], i2: [220, 240, 250, 255], d: [110, 165, 195, 255], g: [140, 230, 255, 255], cr: [90, 150, 180, 255],
});
const buildAncientDragon = () => buildDragonBossTemplate({
  b: [40, 40, 55, 255], h: [220, 220, 235, 255], e: [255, 60, 60, 255], j: [20, 20, 30, 255], w: [60, 60, 80, 255], d: [15, 15, 22, 255],
});

// ---------- Every other creature/boss (zones 5-24 + post-game), each
// recoloring one of the five creature templates or four boss templates.
// Extracted verbatim from the old pixel generator — the palette values
// (and the key names each template expects) are unchanged.
const buildMerfolkRaider = () => buildBipedTemplate({
  'k': [60, 140, 150, 255], 'd': [35, 90, 100, 255], 'v': [40, 80, 110, 255],
  'r': [200, 220, 60, 255], 'w': [180, 190, 200, 255], 'o': [20, 40, 50, 255],
});
const buildReefSerpent = () => buildSerpentTemplate({
  'b': [40, 150, 140, 255], 'd': [20, 90, 85, 255], 'w': [30, 110, 105, 255],
  'h': [210, 230, 80, 255], 'e': [255, 230, 90, 255],
});
const buildDrownedQueen = () => buildRobedBossTemplate({
  'k': [180, 220, 225, 255], 'e': [100, 230, 220, 255], 'j': [30, 50, 55, 255],
  'r': [20, 70, 80, 255], 'r2': [40, 110, 120, 255], 'd': [10, 35, 40, 255],
  'w': [70, 90, 95, 255], 'o': [80, 220, 210, 255],
});
const buildThornling = () => buildBipedTemplate({
  'k': [90, 130, 60, 255], 'd': [50, 80, 30, 255], 'v': [100, 70, 40, 255],
  'r': [180, 60, 60, 255], 'w': [110, 80, 50, 255], 'o': [30, 25, 15, 255],
});
const buildWispMoth = () => buildFlierTemplate({
  'b': [200, 230, 190, 255], 'd': [150, 190, 150, 255], 'e': [120, 200, 120, 255],
});
const buildElderEnt = () => buildGolemBossTemplate({
  'i': [90, 110, 60, 255], 'i2': [130, 150, 90, 255], 'd': [55, 70, 35, 255],
  'g': [180, 220, 100, 255], 'cr': [60, 45, 25, 255],
});
const buildDustJackal = () => buildQuadrupedTemplate({
  'b': [200, 170, 110, 255], 'd': [150, 120, 70, 255], 'e': [220, 90, 40, 255],
});
const buildSandViper = () => buildSerpentTemplate({
  'b': [210, 150, 80, 255], 'd': [150, 100, 50, 255], 'w': [180, 120, 60, 255],
  'h': [255, 220, 120, 255], 'e': [255, 120, 40, 255],
});
const buildSandReaver = () => buildArmoredBossTemplate({
  'a': [180, 150, 90, 255], 'a2': [220, 190, 130, 255], 'd': [110, 85, 45, 255],
  'r': [220, 70, 40, 255], 's': [230, 220, 180, 255], 'gr': [250, 245, 220, 255],
  'g': [140, 100, 50, 255], 'o': [50, 35, 20, 255], 'c': [120, 70, 30, 255],
});
const buildCinderImp = () => buildBipedTemplate({
  'k': [200, 60, 40, 255], 'd': [120, 30, 20, 255], 'v': [40, 30, 30, 255],
  'r': [255, 200, 60, 255], 'w': [80, 60, 50, 255], 'o': [20, 10, 10, 255],
});
const buildMagmaHound = () => buildQuadrupedTemplate({
  'b': [230, 90, 30, 255], 'd': [140, 40, 15, 255], 'e': [255, 230, 80, 255],
});
const buildMoltenWyrm = () => buildDragonBossTemplate({
  'b': [220, 80, 20, 255], 'd': [130, 40, 10, 255], 'w': [160, 50, 15, 255],
  'h': [255, 220, 80, 255], 'e': [255, 255, 150, 255], 'j': [80, 25, 8, 255],
});
const buildStormHarpy = () => buildFlierTemplate({
  'b': [150, 165, 180, 255], 'd': [100, 115, 130, 255], 'e': [230, 240, 255, 255],
});
const buildRockWyvern = () => buildSerpentTemplate({
  'b': [110, 100, 95, 255], 'd': [70, 62, 58, 255], 'w': [90, 82, 78, 255],
  'h': [200, 200, 210, 255], 'e': [255, 220, 100, 255],
});
const buildStormguardTitan = () => buildArmoredBossTemplate({
  'a': [130, 150, 170, 255], 'a2': [170, 190, 210, 255], 'd': [80, 95, 110, 255],
  'r': [90, 200, 255, 255], 's': [220, 230, 240, 255], 'gr': [245, 250, 255, 255],
  'g': [150, 160, 175, 255], 'o': [40, 50, 60, 255], 'c': [60, 80, 110, 255],
});
const buildBogLeech = () => buildBlobTemplate({
  'm': [90, 110, 40, 255], 'l': [140, 160, 70, 255], 'o': [40, 20, 50, 255], 'd': [55, 70, 25, 255],
});
const buildPlagueRat = () => buildQuadrupedTemplate({
  'b': [70, 80, 55, 255], 'd': [40, 48, 30, 255], 'e': [180, 40, 160, 255],
});
const buildRotlord = () => buildRobedBossTemplate({
  'k': [150, 170, 110, 255], 'e': [200, 60, 180, 255], 'j': [40, 45, 20, 255],
  'r': [70, 60, 30, 255], 'r2': [100, 90, 50, 255], 'd': [30, 25, 10, 255],
  'w': [90, 70, 40, 255], 'o': [160, 60, 150, 255],
});
const buildCrystalStalker = () => buildQuadrupedTemplate({
  'b': [100, 110, 220, 255], 'd': [60, 68, 150, 255], 'e': [255, 120, 220, 255],
});
const buildGemOoze = () => buildBlobTemplate({
  'm': [230, 110, 200, 255], 'l': [255, 180, 230, 255], 'o': [80, 30, 90, 255], 'd': [160, 60, 140, 255],
});
const buildPrismColossus = () => buildGolemBossTemplate({
  'i': [180, 150, 220, 255], 'i2': [220, 190, 250, 255], 'd': [110, 90, 150, 255],
  'g': [255, 150, 220, 255], 'cr': [100, 200, 230, 255],
});
const buildShadeStalker = () => buildBipedTemplate({
  'k': [40, 20, 55, 255], 'd': [20, 10, 30, 255], 'v': [60, 20, 80, 255],
  'r': [200, 60, 220, 255], 'w': [50, 30, 60, 255], 'o': [10, 5, 15, 255],
});
const buildNightmareHound = () => buildQuadrupedTemplate({
  'b': [25, 15, 30, 255], 'd': [10, 5, 15, 255], 'e': [220, 30, 50, 255],
});
const buildNightmareDrake = () => buildDragonBossTemplate({
  'b': [35, 20, 45, 255], 'd': [15, 8, 20, 255], 'w': [25, 14, 32, 255],
  'h': [180, 60, 220, 255], 'e': [255, 40, 90, 255], 'j': [10, 5, 12, 255],
});
const buildStarWisp = () => buildFlierTemplate({
  'b': [240, 235, 255, 255], 'd': [200, 195, 225, 255], 'e': [255, 215, 80, 255],
});
const buildCloudSerpent = () => buildSerpentTemplate({
  'b': [220, 225, 245, 255], 'd': [170, 180, 210, 255], 'w': [200, 210, 235, 255],
  'h': [255, 225, 110, 255], 'e': [130, 180, 255, 255],
});
const buildAstralGuardian = () => buildArmoredBossTemplate({
  'a': [220, 210, 180, 255], 'a2': [250, 245, 220, 255], 'd': [160, 150, 120, 255],
  'r': [255, 230, 100, 255], 's': [240, 240, 250, 255], 'gr': [255, 255, 255, 255],
  'g': [200, 180, 120, 255], 'o': [100, 90, 60, 255], 'c': [180, 160, 220, 255],
});
const buildVoidSpawn = () => buildBlobTemplate({
  'm': [20, 10, 25, 255], 'l': [60, 20, 70, 255], 'o': [220, 30, 60, 255], 'd': [10, 5, 15, 255],
});
const buildChaosHound = () => buildQuadrupedTemplate({
  'b': [15, 10, 18, 255], 'd': [5, 5, 8, 255], 'e': [255, 40, 60, 255],
});
const buildWorldSerpent = () => buildDragonBossTemplate({
  'b': [10, 8, 12, 255], 'd': [3, 2, 4, 255], 'w': [15, 10, 18, 255],
  'h': [200, 30, 60, 255], 'e': [255, 60, 90, 255], 'j': [5, 3, 6, 255],
});
const buildAshWraith = () => buildFlierTemplate({
  'b': [130, 120, 110, 255], 'd': [80, 72, 65, 255], 'e': [255, 140, 60, 255],
});
const buildCinderGolem = () => buildQuadrupedTemplate({
  'b': [70, 40, 35, 255], 'd': [35, 18, 15, 255], 'e': [255, 120, 40, 255],
});
const buildAshlord = () => buildGolemBossTemplate({
  'i': [100, 90, 85, 255], 'i2': [140, 128, 120, 255], 'd': [60, 52, 48, 255],
  'g': [255, 140, 60, 255], 'cr': [200, 80, 30, 255],
});
const buildThunderHawk = () => buildFlierTemplate({
  'b': [90, 140, 220, 255], 'd': [50, 90, 160, 255], 'e': [255, 255, 200, 255],
});
const buildStormElemental = () => buildBlobTemplate({
  'm': [110, 160, 230, 255], 'l': [180, 210, 255, 255], 'o': [20, 40, 80, 255], 'd': [70, 110, 180, 255],
});
const buildTempestKing = () => buildArmoredBossTemplate({
  'a': [100, 140, 190, 255], 'a2': [150, 190, 230, 255], 'd': [60, 90, 130, 255],
  'r': [220, 240, 255, 255], 's': [230, 240, 250, 255], 'gr': [255, 255, 255, 255],
  'g': [180, 190, 210, 255], 'o': [30, 45, 70, 255], 'c': [70, 100, 150, 255],
});
const buildBoneReaper = () => buildBipedTemplate({
  'k': [220, 215, 195, 255], 'd': [160, 155, 135, 255], 'v': [40, 30, 50, 255],
  'r': [140, 60, 200, 255], 'w': [100, 90, 80, 255], 'o': [20, 15, 20, 255],
});
const buildWraithSerpent = () => buildSerpentTemplate({
  'b': [150, 180, 220, 255], 'd': [100, 130, 170, 255], 'w': [120, 150, 190, 255],
  'h': [220, 220, 255, 255], 'e': [180, 220, 255, 255],
});
const buildBoneEmperor = () => buildRobedBossTemplate({
  'k': [220, 215, 195, 255], 'e': [180, 80, 220, 255], 'j': [60, 50, 55, 255],
  'r': [50, 30, 60, 255], 'r2': [90, 60, 100, 255], 'd': [25, 15, 30, 255],
  'w': [90, 80, 90, 255], 'o': [160, 70, 200, 255],
});
const buildChaosSpawn = () => buildBlobTemplate({
  'm': [180, 20, 140, 255], 'l': [230, 80, 200, 255], 'o': [10, 5, 15, 255], 'd': [110, 10, 90, 255],
});
const buildVoidHound = () => buildQuadrupedTemplate({
  'b': [30, 10, 35, 255], 'd': [10, 3, 12, 255], 'e': [255, 30, 180, 255],
});
const buildChaosHarbinger = () => buildDragonBossTemplate({
  'b': [140, 10, 110, 255], 'd': [70, 5, 55, 255], 'w': [90, 8, 70, 255],
  'h': [255, 255, 255, 255], 'e': [255, 60, 220, 255], 'j': [40, 3, 30, 255],
});
const buildEternalGuardian = () => buildBipedTemplate({
  'k': [240, 225, 170, 255], 'd': [190, 170, 110, 255], 'v': [255, 255, 255, 255],
  'r': [255, 220, 100, 255], 'w': [220, 200, 150, 255], 'o': [140, 120, 80, 255],
});
const buildTimelessWraith = () => buildSerpentTemplate({
  'b': [230, 220, 180, 255], 'd': [180, 165, 110, 255], 'w': [200, 190, 150, 255],
  'h': [255, 255, 255, 255], 'e': [100, 150, 255, 255],
});
const buildEternalSovereign = () => buildDragonBossTemplate({
  'b': [255, 235, 180, 255], 'd': [200, 180, 120, 255], 'w': [240, 220, 160, 255],
  'h': [255, 255, 255, 255], 'e': [120, 180, 255, 255], 'j': [180, 160, 100, 255],
});
const buildMawOfTheDeep = () => buildBipedTemplate({
  'k': [75, 72, 85, 255], 'd': [38, 36, 45, 255], 'v': [55, 52, 65, 255],
  'r': [140, 225, 95, 255], 'w': [48, 46, 58, 255], 'o': [18, 17, 22, 255],
});
const buildGloomfang = () => buildQuadrupedTemplate({
  'b': [28, 22, 38, 255], 'd': [12, 9, 18, 255], 'e': [190, 255, 250, 255],
});
const buildFormlessKing = () => buildRobedBossTemplate({
  'k': [45, 22, 55, 255], 'e': [255, 60, 200, 255], 'j': [15, 8, 20, 255],
  'r': [12, 6, 22, 255], 'r2': [38, 16, 58, 255], 'd': [6, 3, 10, 255],
  'w': [62, 42, 82, 255], 'o': [225, 42, 182, 255],
});
const buildDuskcrawler = () => buildBipedTemplate({
  'k': [35, 20, 50, 255], 'd': [15, 8, 25, 255], 'v': [55, 30, 80, 255],
  'r': [90, 50, 130, 255], 'w': [25, 15, 40, 255], 'o': [10, 5, 18, 255],
});
const buildHollowRevenant = () => buildQuadrupedTemplate({
  'b': [70, 65, 90, 255], 'd': [30, 28, 42, 255], 'e': [180, 255, 240, 255],
});
const buildDuskboundTyrant = () => buildRobedBossTemplate({
  'k': [30, 15, 45, 255], 'e': [140, 60, 255, 255], 'j': [10, 5, 18, 255],
  'r': [18, 8, 30, 255], 'r2': [45, 20, 65, 255], 'd': [8, 4, 14, 255],
  'w': [55, 35, 75, 255], 'o': [120, 50, 235, 255],
});
const buildEmberwraith = () => buildBipedTemplate({
  'k': [120, 40, 20, 255], 'd': [60, 18, 8, 255], 'v': [200, 90, 30, 255],
  'r': [255, 140, 40, 255], 'w': [70, 25, 12, 255], 'o': [30, 10, 5, 255],
});
const buildCinderfiend = () => buildQuadrupedTemplate({
  'b': [90, 30, 15, 255], 'd': [40, 12, 6, 255], 'e': [255, 200, 60, 255],
});
const buildProgenitorEmber = () => buildRobedBossTemplate({
  'k': [70, 25, 10, 255], 'e': [255, 210, 80, 255], 'j': [25, 8, 4, 255],
  'r': [110, 35, 10, 255], 'r2': [200, 90, 20, 255], 'd': [45, 15, 6, 255],
  'w': [130, 55, 15, 255], 'o': [255, 170, 30, 255],
});
const buildSmolderingWisp = () => buildBipedTemplate({
  'k': [90, 45, 30, 255], 'd': [45, 20, 12, 255], 'v': [220, 110, 40, 255],
  'r': [255, 160, 60, 255], 'w': [55, 25, 15, 255], 'o': [25, 12, 6, 255],
});
const buildAshbornStalker = () => buildQuadrupedTemplate({
  'b': [70, 35, 25, 255], 'd': [35, 15, 10, 255], 'e': [255, 190, 90, 255],
});
const buildCinderWarden = () => buildRobedBossTemplate({
  'k': [55, 25, 15, 255], 'e': [255, 150, 40, 255], 'j': [20, 8, 5, 255],
  'r': [95, 40, 15, 255], 'r2': [170, 75, 20, 255], 'd': [38, 16, 8, 255],
  'w': [110, 50, 18, 255], 'o': [255, 130, 20, 255],
});
const buildFlareling = () => buildBipedTemplate({
  'k': [140, 50, 15, 255], 'd': [70, 22, 8, 255], 'v': [255, 130, 30, 255],
  'r': [255, 200, 70, 255], 'w': [80, 30, 10, 255], 'o': [35, 12, 5, 255],
});
const buildEmberkin = () => buildQuadrupedTemplate({
  'b': [110, 40, 18, 255], 'd': [55, 18, 8, 255], 'e': [255, 215, 90, 255],
});
const buildUndyingEmber = () => buildRobedBossTemplate({
  'k': [80, 30, 10, 255], 'e': [255, 225, 100, 255], 'j': [30, 10, 4, 255],
  'r': [130, 45, 12, 255], 'r2': [220, 100, 20, 255], 'd': [55, 18, 6, 255],
  'w': [150, 65, 15, 255], 'o': [255, 190, 40, 255],
});
const buildWoollyGrazer = () => buildQuadrupedTemplate({
  'b': [230, 225, 210, 255], 'd': [180, 172, 155, 255], 'e': [20, 20, 25, 255],
});
const buildStrayRam = () => buildQuadrupedTemplate({
  'b': [200, 190, 175, 255], 'd': [150, 138, 118, 255], 'e': [40, 30, 20, 255],
});
const buildTheShepherd = () => buildRobedBossTemplate({
  'k': [210, 195, 165, 255], 'e': [80, 200, 90, 255], 'j': [90, 75, 55, 255],
  'r': [95, 75, 50, 255], 'r2': [140, 115, 80, 255], 'd': [50, 38, 24, 255],
  'w': [110, 90, 65, 255], 'o': [90, 200, 90, 255],
});
const buildMercenary = () => buildBipedTemplate({
  'k': [110, 115, 125, 255], 'd': [60, 64, 72, 255], 'v': [70, 60, 45, 255],
  'r': [150, 30, 30, 255], 'w': [140, 110, 60, 255], 'o': [40, 30, 15, 255],
});

// ---------- Weapons (one shape, recolored per tier) ----------
const buildRustySwordIcon = () => buildSwordIcon({ blade: hex('#8a7a6a'), hilt: hex('#5a3a22'), guard: hex('#6b5a4a') });
const buildIronSwordIcon = () => buildSwordIcon({ blade: hex('#b8bcc4'), hilt: hex('#4a3a2a'), guard: hex('#8a8a92') });
const buildSteelBladeIcon = () => buildSwordIcon({ blade: hex('#d0d8e0'), hilt: hex('#3a3a4a'), guard: hex('#6a7a8a') });
const buildMithrilBladeIcon = () => buildSwordIcon({ blade: hex('#e8eef8'), hilt: hex('#4a4a6a'), guard: hex('#8a9ac0') });
const buildFlameSaberIcon = () => buildSwordIcon({ blade: hex('#ff8a3a'), hilt: hex('#5a2a1a'), guard: hex('#c94020') });
const buildFrostFangIcon = () => buildSwordIcon({ blade: hex('#a8e8f8'), hilt: hex('#2a4a5a'), guard: hex('#4fa8c9') });
const buildThunderAxeIcon = () => buildSwordIcon({ blade: hex('#f4e04d'), hilt: hex('#4a3a1a'), guard: hex('#d4a840') });
const buildVoidCleaverIcon = () => buildSwordIcon({ blade: hex('#7a3fae'), hilt: hex('#1a0e2a'), guard: hex('#4a2a6a') });
const buildDragonfangIcon = () => buildSwordIcon({ blade: hex('#8a1a1a'), hilt: hex('#2a0a0a'), guard: hex('#5a1010') });
const buildCelestialEdgeIcon = () => buildSwordIcon({ blade: hex('#fff8e0'), hilt: hex('#d4a840'), guard: hex('#f4e04d') });

// ---------- Armor (one shape, recolored per tier) ----------
const buildClothTunicIcon = () => buildArmorIcon({ main: hex('#8a7355'), trim: hex('#6b5a42'), dark: hex('#5a4a36') });
const buildLeatherArmorIcon = () => buildArmorIcon({ main: hex('#6b4a2e'), trim: hex('#4a3320'), dark: hex('#3a2818') });
const buildIronPlateIcon = () => buildArmorIcon({ main: hex('#8a8a92'), trim: hex('#5a5a62'), dark: hex('#454549') });
const buildSteelMailIcon = () => buildArmorIcon({ main: hex('#6a7a8a'), trim: hex('#4a5a68'), dark: hex('#374250') });
const buildMithrilVestIcon = () => buildArmorIcon({ main: hex('#8a9ac0'), trim: hex('#5a6a94'), dark: hex('#3f4a6b') });
const buildDragonhideArmorIcon = () => buildArmorIcon({ main: hex('#4a6b3a'), trim: hex('#2a4a1e'), dark: hex('#1c3314') });
const buildRunicPlateIcon = () => buildArmorIcon({ main: hex('#5a4a7a'), trim: hex('#3a2a5a'), dark: hex('#281c3f') });
const buildShadowweaveCloakIcon = () => buildArmorIcon({ main: hex('#2a2438'), trim: hex('#4a4260'), dark: hex('#181420') });
const buildStormguardArmorIcon = () => buildArmorIcon({ main: hex('#4a5a78'), trim: hex('#7ad4f4'), dark: hex('#333f52') });
const buildCelestialAegisIcon = () => buildArmorIcon({ main: hex('#f4e8c0'), trim: hex('#d4a840'), dark: hex('#c9a860') });

// ---------- Shared 10-tier color ramp for helm/gloves/boots/shield/belt/
// charm/amulet/ring (rusty -> iron -> steel -> mithril -> flame -> frost ->
// thunder -> void -> dragon -> celestial), same values as the pixel gen.
const GEAR_TIER_PALETTE = [
  { main: '#8a7a6a', trim: '#6b5a4a', dark: '#5a4a3a' },
  { main: '#b8bcc4', trim: '#8a8a92', dark: '#6a6a72' },
  { main: '#d0d8e0', trim: '#a4b0bc', dark: '#7a8794' },
  { main: '#e8eef8', trim: '#b8c8ec', dark: '#8a9ac0' },
  { main: '#ff8a3a', trim: '#c94020', dark: '#8a2010' },
  { main: '#a8e8f8', trim: '#4fa8c9', dark: '#2a5a6a' },
  { main: '#f4e04d', trim: '#d4a840', dark: '#a07820' },
  { main: '#7a3fae', trim: '#4a2a6a', dark: '#2a1840' },
  { main: '#8a1a1a', trim: '#5a1010', dark: '#3a0808' },
  { main: '#fff8e0', trim: '#d4a840', dark: '#b08a30' },
];
function tierColors(i) {
  const t = GEAR_TIER_PALETTE[i];
  return { main: hex(t.main), trim: hex(t.trim), dark: hex(t.dark) };
}

const HELMET_KEYS = ['clothCap', 'leatherCap', 'ironHelm', 'steelHelm', 'mithrilCirclet', 'flameguardHelm', 'frostcrown', 'thunderHelm', 'voidsightHelm', 'celestialCrown'];
const GLOVES_KEYS = ['clothWraps', 'leatherGloves', 'ironGauntlets', 'steelGauntlets', 'mithrilGrips', 'flameforgedGloves', 'frostbiteGloves', 'thunderstrikeGauntlets', 'voidtouchedGloves', 'celestialGauntlets'];
const BOOTS_KEYS = ['wornSandals', 'leatherBoots', 'ironGreaves', 'steelBoots', 'mithrilStriders', 'flamewalkers', 'frostwalkers', 'thunderstepBoots', 'voidwalkers', 'celestialStriders'];
const CHARM_KEYS = ['frayedCharm', 'carvedCharm', 'ironCharm', 'steelCharm', 'mithrilCharm', 'flameforgedCharm', 'frostboundCharm', 'thunderCharm', 'voidboundCharm', 'celestialCharm'];
const AMULET_KEYS = ['tarnishedAmulet', 'bronzeAmulet', 'jadeAmulet', 'silverAmulet', 'runedAmulet', 'enchantedAmulet', 'frostkissedAmulet', 'stormboundAmulet', 'voidwovenAmulet', 'celestialAmulet'];
const RING_KEYS = ['wornRing', 'copperRing', 'jadeRing', 'mithrilRing', 'runicRing', 'emberRing', 'frostRing', 'stormRing', 'voidRing', 'celestialRing'];
const SHIELD_KEYS = ['crackedBuckler', 'woodenTarge', 'ironBuckler', 'steelKiteShield', 'mithrilWall', 'dragonscaleWard', 'runicBulwark', 'shadowveilWard', 'stormwardBulwark', 'celestialBulwark'];
const BELT_KEYS = ['frayedSash', 'leatherBelt', 'ironGirdle', 'steelWaistguard', 'mithrilCinch', 'flameforgedSash', 'frostboundGirdle', 'thunderweaveBelt', 'voidwovenCinch', 'celestialSash'];

const HELD_ITEM_PALETTES = {
  luckyEgg: { main: hex('#f4e04d'), trim: hex('#d4a840'), dark: hex('#a07820') },
  powerBand: { main: hex('#c94040'), trim: hex('#8a2020'), dark: hex('#5a1010') },
  focusSash: { main: hex('#ff8a3a'), trim: hex('#c94020'), dark: hex('#8a2010') },
  leftovers: { main: hex('#7ad46a'), trim: hex('#4a9c3a'), dark: hex('#2a6a1e') },
  goldenBell: { main: hex('#fff8e0'), trim: hex('#d4a840'), dark: hex('#b08a30') },
  quickClaw: { main: hex('#a8e8f8'), trim: hex('#4fa8c9'), dark: hex('#2a5a6a') },
};

// ---------- Output ----------
const outDir = path.join(__dirname, '..', 'icons', 'sprites');
fs.mkdirSync(outDir, { recursive: true });

const sprites = {
  'hero.svg': buildHeroSprite,
  'slime.svg': buildSlime,
  'goblin.svg': buildGoblin,
  'wolf.svg': buildWolf,
  'darkknight.svg': buildDarkKnight,
  'bat.svg': buildBat,
  'specter.svg': buildSpecterEnemy,
  'lich.svg': buildLich,
  'frostgolem.svg': buildFrostGolem,
  'icesprite.svg': buildIceSprite,
  'glacialtitan.svg': buildGlacialTitan,
  'wyrmling.svg': buildWyrmling,
  'drake.svg': buildDrake,
  'ancientdragon.svg': buildAncientDragon,
  'chest.svg': buildChestSprite,
  'wolfpup.svg': buildWolfPup,
  'hawk.svg': buildHawk,
  'salamander.svg': buildSalamander,
  'babygolem.svg': buildBabyGolem,
  'turtle.svg': buildTurtlePet,
  'fox.svg': buildFox,
  'boar.svg': buildBoar,
  'owl.svg': buildOwl,
  'panther.svg': buildPanther,
  'dragonling.svg': buildDragonling,
  'merfolkraider.svg': buildMerfolkRaider,
  'reefserpent.svg': buildReefSerpent,
  'drownedqueen.svg': buildDrownedQueen,
  'thornling.svg': buildThornling,
  'wispmoth.svg': buildWispMoth,
  'elderent.svg': buildElderEnt,
  'dustjackal.svg': buildDustJackal,
  'sandviper.svg': buildSandViper,
  'sandreaver.svg': buildSandReaver,
  'cinderimp.svg': buildCinderImp,
  'magmahound.svg': buildMagmaHound,
  'moltenwyrm.svg': buildMoltenWyrm,
  'stormharpy.svg': buildStormHarpy,
  'rockwyvern.svg': buildRockWyvern,
  'stormguardtitan.svg': buildStormguardTitan,
  'bogleech.svg': buildBogLeech,
  'plaguerat.svg': buildPlagueRat,
  'rotlord.svg': buildRotlord,
  'crystalstalker.svg': buildCrystalStalker,
  'gemooze.svg': buildGemOoze,
  'prismcolossus.svg': buildPrismColossus,
  'shadestalker.svg': buildShadeStalker,
  'nightmarehound.svg': buildNightmareHound,
  'nightmaredrake.svg': buildNightmareDrake,
  'starwisp.svg': buildStarWisp,
  'cloudserpent.svg': buildCloudSerpent,
  'astralguardian.svg': buildAstralGuardian,
  'voidspawn.svg': buildVoidSpawn,
  'chaoshound.svg': buildChaosHound,
  'worldserpent.svg': buildWorldSerpent,
  'ashwraith.svg': buildAshWraith,
  'cindergolem.svg': buildCinderGolem,
  'ashlord.svg': buildAshlord,
  'thunderhawk.svg': buildThunderHawk,
  'stormelemental.svg': buildStormElemental,
  'tempestking.svg': buildTempestKing,
  'bonereaper.svg': buildBoneReaper,
  'wraithserpent.svg': buildWraithSerpent,
  'boneemperor.svg': buildBoneEmperor,
  'chaosspawn.svg': buildChaosSpawn,
  'voidhound.svg': buildVoidHound,
  'chaosharbinger.svg': buildChaosHarbinger,
  'eternalguardian.svg': buildEternalGuardian,
  'timelesswraith.svg': buildTimelessWraith,
  'eternalsovereign.svg': buildEternalSovereign,
  'mawofthedeep.svg': buildMawOfTheDeep,
  'gloomfang.svg': buildGloomfang,
  'formlessking.svg': buildFormlessKing,
  'duskcrawler.svg': buildDuskcrawler,
  'hollowrevenant.svg': buildHollowRevenant,
  'duskboundtyrant.svg': buildDuskboundTyrant,
  'emberwraith.svg': buildEmberwraith,
  'cinderfiend.svg': buildCinderfiend,
  'progenitorember.svg': buildProgenitorEmber,
  'smolderingwisp.svg': buildSmolderingWisp,
  'ashbornstalker.svg': buildAshbornStalker,
  'cinderwarden.svg': buildCinderWarden,
  'flareling.svg': buildFlareling,
  'emberkin.svg': buildEmberkin,
  'undyingember.svg': buildUndyingEmber,
  'woollygrazer.svg': buildWoollyGrazer,
  'strayram.svg': buildStrayRam,
  'theshepherd.svg': buildTheShepherd,
  'mercenary.svg': buildMercenary,

  'wpn-rustySword.svg': buildRustySwordIcon,
  'wpn-ironSword.svg': buildIronSwordIcon,
  'wpn-steelBlade.svg': buildSteelBladeIcon,
  'wpn-mithrilBlade.svg': buildMithrilBladeIcon,
  'wpn-flameSaber.svg': buildFlameSaberIcon,
  'wpn-frostFang.svg': buildFrostFangIcon,
  'wpn-thunderAxe.svg': buildThunderAxeIcon,
  'wpn-voidCleaver.svg': buildVoidCleaverIcon,
  'wpn-dragonfang.svg': buildDragonfangIcon,
  'wpn-celestialEdge.svg': buildCelestialEdgeIcon,

  'arm-clothTunic.svg': buildClothTunicIcon,
  'arm-leatherArmor.svg': buildLeatherArmorIcon,
  'arm-ironPlate.svg': buildIronPlateIcon,
  'arm-steelMail.svg': buildSteelMailIcon,
  'arm-mithrilVest.svg': buildMithrilVestIcon,
  'arm-dragonhideArmor.svg': buildDragonhideArmorIcon,
  'arm-runicPlate.svg': buildRunicPlateIcon,
  'arm-shadowweaveCloak.svg': buildShadowweaveCloakIcon,
  'arm-stormguardArmor.svg': buildStormguardArmorIcon,
  'arm-celestialAegis.svg': buildCelestialAegisIcon,
};

HELMET_KEYS.forEach((key, i) => { sprites[`hlm-${key}.svg`] = () => buildHelmetIcon(tierColors(i)); });
GLOVES_KEYS.forEach((key, i) => { sprites[`glv-${key}.svg`] = () => buildGlovesIcon(tierColors(i)); });
BOOTS_KEYS.forEach((key, i) => { sprites[`bts-${key}.svg`] = () => buildBootsIcon(tierColors(i)); });
SHIELD_KEYS.forEach((key, i) => { sprites[`shd-${key}.svg`] = () => buildShieldIcon(tierColors(i)); });
BELT_KEYS.forEach((key, i) => { sprites[`blt-${key}.svg`] = () => buildBeltIcon(tierColors(i)); });
sprites['chm-none.svg'] = () => buildCharmIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
CHARM_KEYS.forEach((key, i) => { sprites[`chm-${key}.svg`] = () => buildCharmIcon(tierColors(i)); });
sprites['amu-none.svg'] = () => buildAmuletIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
AMULET_KEYS.forEach((key, i) => { sprites[`amu-${key}.svg`] = () => buildAmuletIcon(tierColors(i)); });
sprites['rng-none.svg'] = () => buildRingIcon({ main: hex('#5a5a5a'), trim: hex('#3a3a3a'), dark: hex('#2a2a2a') });
RING_KEYS.forEach((key, i) => { sprites[`rng-${key}.svg`] = () => buildRingIcon(tierColors(i)); });
Object.entries(HELD_ITEM_PALETTES).forEach(([key, palette]) => { sprites[`hld-${key}.svg`] = () => buildHeldItemIcon(palette); });

for (const [filename, build] of Object.entries(sprites)) {
  const svg = build();
  fs.writeFileSync(path.join(outDir, filename), svg);
  console.log(`wrote ${filename} (${svg.length} bytes)`);
}
