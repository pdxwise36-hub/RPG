// Vector (SVG) sprite generator — replaces the pixel-grid renderer in
// gen-sprites.js with the same "shared body-plan template, recolored per
// creature" architecture, but drawing flat vector shapes (rounded bodies,
// gradients, soft shadows) instead of stamping a coarse pixel grid. Output
// is real .svg text, dropped into icons/sprites/ in place of the old PNGs
// — everything downstream (data.js's sprite paths, the CSS background-image
// rules in ui.js/battle.js/map.js) references these by filename only, so
// nothing outside this script and the asset filenames needs to change.
const fs = require('fs');
const path = require('path');

// ---------- color helpers ----------
// Every creature/boss palette is still a raw [r,g,b,a] array (same values
// as the old pixel palettes) — these convert that into CSS color strings
// and derive lighter/darker variants for gradients, the same "auto-shade
// from one base tone" idea as the pixel-bevel prototype.
function css(c) { return `rgba(${c[0]},${c[1]},${c[2]},${(c[3] === undefined ? 255 : c[3]) / 255})`; }
function lighten(c, amt) {
  return [
    Math.min(255, Math.round(c[0] + (255 - c[0]) * amt)),
    Math.min(255, Math.round(c[1] + (255 - c[1]) * amt)),
    Math.min(255, Math.round(c[2] + (255 - c[2]) * amt)),
    c[3] === undefined ? 255 : c[3],
  ];
}
function darken(c, amt) {
  return [
    Math.max(0, Math.round(c[0] * (1 - amt))),
    Math.max(0, Math.round(c[1] * (1 - amt))),
    Math.max(0, Math.round(c[2] * (1 - amt))),
    c[3] === undefined ? 255 : c[3],
  ];
}
function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

let gradientCounter = 0;
// A linear gradient from a lightened to a darkened variant of `base` —
// every body region uses one of these instead of a flat fill, for the
// same "form shading" the pixel-bevel pass gave the old sprites.
function bodyGradient(defs, base, { light = 0.35, dark = 0.35, angle = 45 } = {}) {
  const id = `g${gradientCounter++}`;
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.round(50 + 50 * Math.cos(rad));
  const y2 = Math.round(50 + 50 * Math.sin(rad));
  defs.push(`<linearGradient id="${id}" x1="${100 - x2}%" y1="${100 - y2}%" x2="${x2}%" y2="${y2}%">
    <stop offset="0%" stop-color="${css(lighten(base, light))}"/>
    <stop offset="100%" stop-color="${css(darken(base, dark))}"/>
  </linearGradient>`);
  return `url(#${id})`;
}
// A soft radial highlight dropped over a body region for extra gloss.
function sheenGradient(defs, opacity = 0.3) {
  const id = `g${gradientCounter++}`;
  defs.push(`<radialGradient id="${id}" cx="35%" cy="28%" r="45%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity="${opacity}"/>
    <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>`);
  return `url(#${id})`;
}
function contactShadow(cx, cy, rx, ry, opacity = 0.2) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000000" opacity="${opacity}"/>`;
}
function svgDoc(viewBox, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>`;
}

// ============================================================
// Creature body-plan templates — one shape per archetype, every
// creature that used to recolor a pixel-grid template now recolors one
// of these instead. Palette keys match the OLD templates' keys exactly,
// so every existing per-creature color array (already hand-tuned) still
// means the same thing.
// ============================================================

// b (body/main), e (eye), d (shadow tone) — side-profile 4-legged beast:
// round head with ears at the front, a capsule body, four straight legs,
// a small tapered tail at the back.
function buildQuadrupedTemplate(palette) {
  const defs = [];
  const bodyFill = bodyGradient(defs, palette.b, { angle: 55 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(66, 108, 48, 8)}
    <path d="M 92 60 L 112 46 L 108 66 L 96 70 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="22" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="42" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="70" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="90" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="18" y="42" width="86" height="38" rx="18" fill="${bodyFill}" stroke="${dStr}" stroke-width="3"/>
    <circle cx="26" cy="34" r="22" fill="${bodyFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 14 20 L 10 6 L 22 16 Z M 34 16 L 36 2 L 42 14 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="2"/>
    <circle cx="18" cy="32" r="4.5" fill="${css(palette.e)}"/>
  `;
  return svgDoc('0 0 120 112', defs, body);
}

// k (skin), r (eyes/accent), v (vest), w (weapon), o (feet/boots), d (shadow)
function buildBipedTemplate(palette) {
  const defs = [];
  const skinFill = bodyGradient(defs, palette.k, { angle: 40 });
  const vestFill = bodyGradient(defs, palette.v, { angle: 90, light: 0.25, dark: 0.3 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(60, 152, 30, 7)}
    <path d="M 24 78 L 16 88 L 20 128 L 30 122 Z" fill="${skinFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 96 78 L 104 88 L 100 128 L 90 122 Z" fill="${skinFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 78 96 L 100 84 L 106 66 L 96 62 L 86 78 Z" fill="${css(palette.w)}" stroke="${dStr}" stroke-width="2"/>
    <rect x="42" y="120" width="16" height="30" rx="6" fill="${skinFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="62" y="120" width="16" height="30" rx="6" fill="${skinFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="40" y="144" width="20" height="10" rx="4" fill="${css(palette.o)}"/>
    <rect x="60" y="144" width="20" height="10" rx="4" fill="${css(palette.o)}"/>
    <path d="M 30 74 Q 60 64 90 74 L 92 122 Q 60 132 28 122 Z" fill="${skinFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 34 84 Q 60 78 86 84 L 84 112 Q 60 120 36 112 Z" fill="${vestFill}"/>
    <path d="M 32 26 Q 30 4 60 4 Q 90 4 88 26 Q 96 20 88 34 Q 90 52 68 60 Q 60 63 52 60 Q 30 52 32 34 Q 24 20 32 26 Z"
          fill="${skinFill}" stroke="${dStr}" stroke-width="3"/>
    <ellipse cx="48" cy="38" rx="6" ry="7" fill="${css(palette.r)}"/>
    <ellipse cx="72" cy="38" rx="6" ry="7" fill="${css(palette.r)}"/>
    <circle cx="48" cy="39" r="2.6" fill="#1a1a1a"/>
    <circle cx="72" cy="39" r="2.6" fill="#1a1a1a"/>
  `;
  return svgDoc('0 0 120 160', defs, body);
}

// b (body/wings), e (eye), d (shadow) — small flier, wings swept up.
function buildFlierTemplate(palette) {
  const defs = [];
  const bodyFill = bodyGradient(defs, palette.b, { angle: 60 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(60, 96, 30, 6, 0.15)}
    <path d="M 60 30 C 30 10 0 14 -10 0 C 0 20 20 24 34 34 C 14 30 -6 24 -16 8
              C -6 30 20 42 44 44 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M 60 30 C 90 10 120 14 130 0 C 120 20 100 24 86 34 C 106 30 126 24 136 8
              C 126 30 100 42 76 44 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="60" cy="50" rx="26" ry="30" fill="${bodyFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 50 78 L 44 92 M 70 78 L 76 92" stroke="${dStr}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="52" cy="46" r="4.5" fill="${css(palette.e)}"/>
    <circle cx="68" cy="46" r="4.5" fill="${css(palette.e)}"/>
  `;
  return svgDoc('0 0 120 100', defs, body);
}

// m (mass), l (highlight tone), o (eye), d (shadow) — rounded blob.
function buildBlobTemplate(palette) {
  const defs = [];
  const bodyFill = bodyGradient(defs, palette.m, { angle: 55, light: 0.4 });
  const sheen = sheenGradient(defs, 0.4);
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(60, 106, 32, 7)}
    <path d="M 60 18 C 86 18 102 40 102 66 C 102 92 82 102 60 102 C 38 102 18 92 18 66 C 18 40 34 18 60 18 Z"
          fill="${bodyFill}" stroke="${dStr}" stroke-width="3"/>
    <ellipse cx="44" cy="44" rx="18" ry="14" fill="${sheen}"/>
    <ellipse cx="42" cy="30" rx="6" ry="5" fill="${css(palette.l)}" opacity="0.8"/>
    <circle cx="48" cy="66" r="4.5" fill="${css(palette.o)}"/>
    <circle cx="72" cy="66" r="4.5" fill="${css(palette.o)}"/>
  `;
  return svgDoc('0 0 120 116', defs, body);
}

// b (body), h (horn), e (eye), w (wing), d (shadow) — small wyvern/dragon
// cousin, side profile (reef serpent, sand viper, wyrmling, drake, etc.):
// same rounded-body-plus-legs language as the quadruped template, with a
// tapered snout, back wing, and pointed tail added.
function buildSerpentTemplate(palette) {
  const defs = [];
  const bodyFill = bodyGradient(defs, palette.b, { angle: 50 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(66, 108, 48, 8)}
    <path d="M 96 62 L 118 74 L 100 82 L 90 72 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="26" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="46" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="66" y="72" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="82" y="66" width="12" height="30" rx="5" fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 52 46 L 58 20 L 76 32 L 72 48 Z" fill="${css(palette.w)}" stroke="${dStr}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="22" y="42" width="76" height="36" rx="16" fill="${bodyFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 12 36 L 32 26 L 34 50 L 20 58 Z" fill="${bodyFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 24 30 L 26 12 L 36 28 Z" fill="${css(palette.h)}" stroke="${dStr}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="16" cy="40" r="4.5" fill="${css(palette.e)}"/>
  `;
  return svgDoc('0 0 122 112', defs, body);
}

// ============================================================
// Boss archetype templates — larger, more ornate, art-directed to read
// as threats (angular shapes, narrowed eyes, spikes) rather than the
// friendlier rounded language the regular creatures use.
// ============================================================

// a (armor), a2 (armor highlight), d (shadow), r (visor/gem glow), s
// (blade), gr (blade shine), g (gold trim), o (boots), c (cape)
function buildArmoredBossTemplate(palette) {
  const defs = [];
  const armorFill = bodyGradient(defs, palette.a, { angle: 50, light: 0.2 });
  const capeFill = bodyGradient(defs, palette.c, { angle: 90, light: 0.15, dark: 0.3 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(120, 214, 56, 9, 0.3)}
    <path d="M 60 70 L 30 96 L 40 200 L 70 190 Z" fill="${capeFill}" stroke="${dStr}" stroke-width="2"/>
    <path d="M 180 70 L 210 96 L 200 200 L 170 190 Z" fill="${capeFill}" stroke="${dStr}" stroke-width="2"/>

    <path d="M 90 128 L 76 168 L 84 202 L 106 202 L 106 168 Z" fill="${armorFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 150 128 L 164 168 L 156 202 L 134 202 L 134 168 Z" fill="${armorFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="80" y="196" width="26" height="10" rx="3" fill="${css(palette.o)}"/>
    <rect x="114" y="196" width="26" height="10" rx="3" fill="${css(palette.o)}"/>

    <path d="M 66 84 L 54 130 L 70 170 L 82 130 Z" fill="${armorFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 174 84 L 186 130 L 170 170 L 158 130 Z" fill="${armorFill}" stroke="${dStr}" stroke-width="2.5"/>

    <path d="M 190 30 L 202 4 L 208 158 L 194 150 Z" fill="${css(palette.s)}" stroke="${dStr}" stroke-width="1.5"/>
    <path d="M 199 8 L 201 140" stroke="${css(palette.gr)}" stroke-width="2"/>
    <rect x="176" y="150" width="40" height="12" rx="4" fill="${css(palette.g)}" stroke="${dStr}" stroke-width="1.5"/>
    <rect x="192" y="160" width="14" height="24" rx="4" fill="${css(palette.g)}" stroke="${dStr}" stroke-width="1.5"/>

    <path d="M 78 78 L 68 130 L 90 168 L 150 168 L 172 130 L 162 78 Z"
          fill="${armorFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 92 96 L 148 96 L 144 118 L 96 118 Z" fill="${css(lighten(palette.a2, 0.1))}" opacity="0.7"/>
    <path d="M 120 108 L 132 122 L 120 136 L 108 122 Z" fill="${css(palette.r)}" stroke="${dStr}" stroke-width="1.5"/>

    <path d="M 88 74 L 82 32 L 100 12 L 140 12 L 158 32 L 152 74 Z"
          fill="${armorFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 116 8 L 120 -6 L 124 8 Z" fill="${css(palette.g)}"/>
    <path d="M 96 48 L 144 48 L 140 58 L 100 58 Z" fill="${css(palette.r)}"/>
    <path d="M 100 34 L 112 26 L 112 40 Z M 140 34 L 128 26 L 128 40 Z" fill="${css(lighten(palette.a2, 0.15))}"/>
  `;
  return svgDoc('0 0 240 220', defs, body);
}

// k (bone), e (eye glow), j (jaw shadow), r (robe), r2 (robe highlight),
// d (shadow), w (staff), o (orb glow)
function buildRobedBossTemplate(palette) {
  const defs = [];
  const robeFill = bodyGradient(defs, palette.r, { angle: 55, light: 0.2 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(110, 212, 60, 9, 0.3)}
    <path d="M 44 90 L 24 130 L 40 200 L 66 190 L 62 110 Z" fill="${robeFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 176 90 L 196 130 L 180 200 L 154 190 L 158 110 Z" fill="${robeFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 30 196 L 46 200 L 42 214 L 24 210 Z M 174 196 L 190 200 L 196 214 L 178 210 Z"
          fill="${css(palette.k)}" stroke="${dStr}" stroke-width="1.5"/>

    <path d="M 66 104 L 154 104 L 168 200 L 120 216 L 72 200 Z"
          fill="${robeFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 108 120 L 132 120 L 128 176 L 112 176 Z" fill="${css(lighten(palette.r2, 0.15))}" opacity="0.75"/>
    <circle cx="120" cy="142" r="9" fill="${css(palette.e)}" opacity="0.9"/>
    <path d="M 78 198 L 90 214 M 100 202 L 106 216 M 140 202 L 134 216 M 162 198 L 150 214"
          stroke="${dStr}" stroke-width="3" stroke-linecap="round"/>

    <path d="M 66 96 L 46 132 L 66 116 L 76 152 L 94 118 Z" fill="${robeFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 154 96 L 174 132 L 154 116 L 144 152 L 126 118 Z" fill="${robeFill}" stroke="${dStr}" stroke-width="2.5"/>

    <path d="M 96 88 L 84 40 L 120 20 L 156 40 L 144 88 L 120 100 Z"
          fill="${robeFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 90 46 L 150 46 L 138 66 L 102 66 Z" fill="${css(lighten(palette.r2, 0.2))}" opacity="0.6"/>

    <path d="M 100 34 L 88 8 L 106 12 L 100 30 Z M 140 34 L 152 8 L 134 12 L 140 30 Z" fill="${css(palette.k)}"/>
    <path d="M 102 52 L 114 44 L 114 58 Z M 138 52 L 126 44 L 126 58 Z" fill="${css(palette.e)}"/>
    <path d="M 106 74 L 120 82 L 134 74 L 128 84 L 112 84 Z" fill="${css(palette.j)}"/>

    <path d="M 186 8 L 192 168" stroke="${css(palette.w)}" stroke-width="6" stroke-linecap="round"/>
    <path d="M 176 -2 L 206 -2 L 202 18 L 180 18 Z" fill="${css(darken(palette.k, 0.1))}" stroke="${dStr}" stroke-width="1.5"/>
    <circle cx="191" cy="8" r="10" fill="${css(palette.o)}" opacity="0.85"/>
  `;
  return svgDoc('0 0 240 220', defs, body);
}

// i (stone), i2 (glow halo), d (shadow), g (core glow), cr (cracks)
function buildGolemBossTemplate(palette) {
  const defs = [];
  const stoneFill = bodyGradient(defs, palette.i, { angle: 50, light: 0.18 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(120, 212, 58, 9, 0.32)}
    <path d="M 84 200 L 78 156 L 108 156 L 110 200 Z" fill="${stoneFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 156 200 L 162 156 L 132 156 L 130 200 Z" fill="${stoneFill}" stroke="${dStr}" stroke-width="3"/>
    <rect x="76" y="198" width="34" height="14" rx="2" fill="${css(darken(palette.i, 0.25))}"/>
    <rect x="130" y="198" width="34" height="14" rx="2" fill="${css(darken(palette.i, 0.25))}"/>

    <path d="M 16 96 L 8 150 L 30 156 L 44 100 Z" fill="${stoneFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 224 96 L 232 150 L 210 156 L 196 100 Z" fill="${stoneFill}" stroke="${dStr}" stroke-width="3"/>
    <rect x="4" y="138" width="26" height="20" rx="4" fill="${css(darken(palette.i, 0.1))}" stroke="${dStr}" stroke-width="2"/>
    <rect x="210" y="138" width="26" height="20" rx="4" fill="${css(darken(palette.i, 0.1))}" stroke="${dStr}" stroke-width="2"/>

    <path d="M 40 88 L 200 88 L 192 158 L 48 158 Z" fill="${stoneFill}" stroke="${dStr}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 100 112 L 140 112 L 134 140 L 106 140 Z" fill="${css(palette.g)}" opacity="0.9"/>
    <circle cx="90" cy="108" r="4" fill="${css(palette.i2)}" opacity="0.7"/>
    <circle cx="150" cy="108" r="4" fill="${css(palette.i2)}" opacity="0.7"/>
    <path d="M 60 100 L 74 122 M 172 132 L 160 148 M 106 146 L 118 156" stroke="${css(palette.cr)}" stroke-width="2.5" stroke-linecap="round"/>

    <path d="M 66 20 L 58 74 L 182 74 L 174 20 L 140 4 L 100 4 Z"
          fill="${stoneFill}" stroke="${dStr}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 84 0 L 90 -14 L 94 2 Z M 108 -4 L 112 -18 L 118 -2 Z
              M 126 -4 L 132 -18 L 136 -2 Z M 150 0 L 154 -14 L 160 2 Z" fill="${css(palette.i)}" stroke="${dStr}" stroke-width="1.2"/>
    <path d="M 92 42 L 106 32 L 106 48 Z M 148 42 L 134 32 L 134 48 Z" fill="${css(palette.g)}"/>
    <path d="M 78 30 L 88 46" stroke="${css(palette.cr)}" stroke-width="2" stroke-linecap="round"/>
  `;
  return svgDoc('0 0 240 220', defs, body);
}

// b (scale), h (horn/claw), e (eye/core), j (jaw), w (unused shading tone,
// kept for palette compatibility), d (shadow) — angular, spiky, clawed.
function buildDragonBossTemplate(palette) {
  const defs = [];
  const scaleFill = bodyGradient(defs, palette.b, { angle: 50, light: 0.15 });
  const wingFill = bodyGradient(defs, darken(palette.b, 0.5), { angle: 90, light: 0.1, dark: 0.35 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(120, 208, 58, 9, 0.3)}
    <path d="M 80 92 L 20 58 L 44 66 L -10 30 L 30 50 L 8 20 L 56 62 L 68 82 Z" fill="${wingFill}" stroke="${dStr}" stroke-width="2"/>
    <path d="M 160 92 L 220 58 L 196 66 L 250 30 L 210 50 L 232 20 L 184 62 L 172 82 Z" fill="${wingFill}" stroke="${dStr}" stroke-width="2"/>

    <path d="M 108 62 L 112 46 L 118 62 Z M 122 60 L 126 42 L 132 60 Z M 118 96 L 122 82 L 128 96 Z"
          fill="${css(darken(palette.b, 0.1))}" stroke="${dStr}" stroke-width="1.5"/>

    <path d="M 168 178 L 210 172 L 198 184 L 236 178 L 210 196 L 224 210 L 188 196 L 176 188 Z"
          fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>

    <path d="M 90 160 L 114 160 L 112 190 L 92 190 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 126 160 L 150 160 L 148 190 L 128 190 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 90 190 L 82 202 L 90 198 Z M 100 192 L 96 206 L 104 198 Z M 106 192 L 106 206 L 112 198 Z" fill="${css(palette.h)}" stroke="${dStr}" stroke-width="1"/>
    <path d="M 150 190 L 158 202 L 150 198 Z M 140 192 L 144 206 L 136 198 Z M 134 192 L 134 206 L 128 198 Z" fill="${css(palette.h)}" stroke="${dStr}" stroke-width="1"/>

    <path d="M 66 112 L 48 128 L 52 158 L 66 132 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 174 112 L 192 128 L 188 158 L 174 132 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 52 158 L 42 168 L 50 160 Z M 58 154 L 50 166 L 58 158 Z" fill="${css(palette.h)}"/>
    <path d="M 188 158 L 198 168 L 190 160 Z M 182 154 L 190 166 L 182 158 Z" fill="${css(palette.h)}"/>

    <path d="M 82 96 L 158 96 L 162 158 L 120 172 L 78 158 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 96 110 L 144 110 L 140 130 L 100 130 Z" fill="${css(darken(palette.b, 0.4))}" opacity="0.6"/>
    <path d="M 120 126 L 132 140 L 120 154 L 108 140 Z" fill="${css(palette.e)}" stroke="${css(darken(palette.e, 0.35))}" stroke-width="1.5"/>

    <path d="M 98 96 L 142 96 L 134 64 L 106 64 Z" fill="${scaleFill}" stroke="${dStr}" stroke-width="2.5"/>
    <path d="M 88 64 L 96 32 L 120 22 L 144 32 L 152 64 L 130 88 L 110 88 Z"
          fill="${scaleFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 96 24 L 84 2 L 102 26 Z M 144 24 L 156 2 L 138 26 Z" fill="${css(palette.j)}" stroke="${dStr}" stroke-width="1.5"/>
    <path d="M 100 52 L 112 44 L 112 58 Z M 140 52 L 128 44 L 128 58 Z" fill="${css(palette.e)}"/>
    <path d="M 104 76 L 120 84 L 136 76 L 130 86 L 110 86 Z" fill="${css(darken(palette.j, 0.4))}" stroke="${dStr}" stroke-width="1"/>
    <path d="M 108 78 L 112 82 M 116 80 L 118 84 M 124 80 L 122 84 M 132 78 L 128 82" stroke="#e8e8e8" stroke-width="2" stroke-linecap="round"/>
  `;
  return svgDoc('0 0 240 220', defs, body);
}

// ============================================================
// Bespoke sprites — hero, chest, and the few creatures distinct enough
// (a translucent ghost, a domed turtle) to not fit any shared archetype.
// ============================================================

// h (hair), f (skin), o (eyes/boots), b (tunic), g (belt/hilt/gold), p
// (pants), s (sword blade) — matches the old pixel hero's palette keys.
function buildHero(palette) {
  const defs = [];
  const skinFill = bodyGradient(defs, palette.f, { angle: 40, light: 0.25, dark: 0.25 });
  const tunicFill = bodyGradient(defs, palette.b, { angle: 90, light: 0.25, dark: 0.3 });
  const pantsFill = bodyGradient(defs, palette.p, { angle: 90, light: 0.2, dark: 0.3 });
  const dStr = css(darken(palette.b, 0.5));
  const body = `
    ${contactShadow(60, 152, 28, 7)}
    <rect x="42" y="118" width="15" height="28" rx="6" fill="${pantsFill}" stroke="${dStr}" stroke-width="2"/>
    <rect x="63" y="118" width="15" height="28" rx="6" fill="${pantsFill}" stroke="${dStr}" stroke-width="2"/>
    <rect x="40" y="140" width="19" height="12" rx="5" fill="${css(palette.o)}" stroke="${dStr}" stroke-width="1.5"/>
    <rect x="61" y="140" width="19" height="12" rx="5" fill="${css(palette.o)}" stroke="${dStr}" stroke-width="1.5"/>
    <rect x="20" y="72" width="16" height="40" rx="8" fill="${tunicFill}" stroke="${dStr}" stroke-width="2"/>
    <circle cx="28" cy="114" r="8" fill="${skinFill}" stroke="${css(darken(palette.f, 0.25))}" stroke-width="1.5"/>
    <path d="M 34 66 Q 60 58 86 66 L 90 116 Q 60 124 30 116 Z" fill="${tunicFill}" stroke="${dStr}" stroke-width="2.5"/>
    <rect x="32" y="104" width="54" height="10" rx="4" fill="${css(palette.g)}" stroke="${css(darken(palette.g, 0.4))}" stroke-width="1.5"/>
    <rect x="84" y="70" width="16" height="38" rx="8" fill="${tunicFill}" stroke="${dStr}" stroke-width="2"/>
    <circle cx="92" cy="110" r="8" fill="${skinFill}" stroke="${css(darken(palette.f, 0.25))}" stroke-width="1.5"/>
    <path d="M 100 18 L 108 28 L 108 90 L 92 90 L 92 28 Z" fill="${css(palette.s)}" stroke="${css(darken(palette.s, 0.35))}" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="84" y="90" width="32" height="8" rx="3" fill="${css(palette.g)}" stroke="${css(darken(palette.g, 0.4))}" stroke-width="1.5"/>
    <rect x="94" y="98" width="12" height="18" rx="4" fill="${css(palette.g)}" stroke="${css(darken(palette.g, 0.4))}" stroke-width="1.5"/>
    <circle cx="60" cy="38" r="26" fill="${skinFill}" stroke="${css(darken(palette.f, 0.25))}" stroke-width="2.5"/>
    <path d="M 46 25 L 50 6 L 55 17 L 60 2 L 65 17 L 70 6 L 74 25 Q 60 17 46 25 Z" fill="${css(palette.h)}" stroke="${css(darken(palette.h, 0.35))}" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="50" cy="40" rx="4.5" ry="5.5" fill="${css(palette.o)}"/>
    <ellipse cx="70" cy="40" rx="4.5" ry="5.5" fill="${css(palette.o)}"/>
    <path d="M 50 54 Q 60 60 70 54" stroke="${css(darken(palette.f, 0.3))}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  `;
  return svgDoc('0 0 120 160', defs, body);
}

// w (base wood), w2 (open lid highlight), d (shadow), g (gold trim/coins)
function buildChest(palette) {
  const defs = [];
  const woodFill = bodyGradient(defs, palette.w, { angle: 90, light: 0.2, dark: 0.3 });
  const dStr = css(palette.d);
  const body = `
    ${contactShadow(60, 96, 42, 7)}
    <path d="M 14 32 L 106 32 L 96 8 L 24 8 Z" fill="${css(palette.w2)}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="10" y="32" width="100" height="58" rx="8" fill="${woodFill}" stroke="${dStr}" stroke-width="3"/>
    <rect x="10" y="32" width="100" height="10" fill="${css(palette.g)}"/>
    <rect x="50" y="46" width="20" height="16" rx="4" fill="${css(palette.g)}" stroke="${dStr}" stroke-width="1.5"/>
    <circle cx="30" cy="70" r="3" fill="${css(palette.g)}"/>
    <circle cx="90" cy="70" r="3" fill="${css(palette.g)}"/>
    <circle cx="60" cy="76" r="3.5" fill="${css(palette.g)}"/>
  `;
  return svgDoc('0 0 120 100', defs, body);
}

// g (ghostly base color), e (glowing eyes) — translucent, no legs.
function buildSpecter(palette) {
  const defs = [];
  const [r, g2, b, a] = palette.g;
  const ghostColor = [r, g2, b, a === undefined ? 200 : a];
  const bodyFill = bodyGradient(defs, ghostColor, { angle: 60, light: 0.3, dark: 0.2 });
  const dStr = css(darken(ghostColor, 0.35));
  const body = `
    <path d="M 60 14 C 80 14 90 30 90 48 L 90 96 L 78 84 L 66 96 L 54 84 L 42 96 L 30 84 L 30 48 C 30 30 40 14 60 14 Z"
          fill="${bodyFill}" stroke="${dStr}" stroke-width="2.5" stroke-linejoin="round" opacity="0.88"/>
    <ellipse cx="46" cy="42" rx="8" ry="9" fill="${css(palette.e)}"/>
    <ellipse cx="74" cy="42" rx="8" ry="9" fill="${css(palette.e)}"/>
  `;
  return svgDoc('0 0 120 100', defs, body);
}

// s (shell), h (head/legs), e (eye) — low dome shell, head poking out.
function buildTurtle(palette) {
  const defs = [];
  const shellFill = bodyGradient(defs, palette.s, { angle: 50, light: 0.3 });
  const headFill = bodyGradient(defs, palette.h, { angle: 40, light: 0.25 });
  const dStr = css(darken(palette.s, 0.4));
  const body = `
    ${contactShadow(60, 98, 44, 7)}
    <rect x="14" y="66" width="16" height="20" rx="7" fill="${headFill}" stroke="${dStr}" stroke-width="2"/>
    <path d="M 20 26 Q 4 34 6 54 Q 8 46 18 42 Z" fill="${headFill}" stroke="${dStr}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="9" cy="40" r="3.5" fill="${css(palette.e)}"/>
    <path d="M 14 58 C 14 30 40 16 66 16 C 92 16 108 34 106 58 C 104 78 84 88 60 88 C 36 88 16 78 14 58 Z"
          fill="${shellFill}" stroke="${dStr}" stroke-width="3"/>
    <path d="M 60 26 L 46 42 L 60 58 L 74 42 Z" fill="${css(lighten(palette.s, 0.15))}" opacity="0.6"/>
  `;
  return svgDoc('0 0 120 96', defs, body);
}

// ============================================================
// Gear icon templates — one shared shape per item type, recolored per
// tier (or per named weapon/armor) exactly like the old pixel icons.
// ============================================================

// blade, edge (unused directly, kept for palette compatibility with old
// per-weapon calls), hilt, guard — tapered blade with a gradient sheen.
function buildSwordIcon({ blade, hilt, guard }) {
  const defs = [];
  const bladeFill = bodyGradient(defs, blade, { angle: 0, light: 0.5, dark: 0.15 });
  const metalFill = bodyGradient(defs, guard, { angle: 90, light: 0.25, dark: 0.3 });
  const gripFill = bodyGradient(defs, hilt, { angle: 90, light: 0.2, dark: 0.3 });
  const body = `
    <path d="M 50 6 L 60 16 L 60 62 L 40 62 L 40 16 Z" fill="${bladeFill}" stroke="${css(darken(blade, 0.3))}" stroke-width="1.8" stroke-linejoin="round"/>
    <rect x="26" y="62" width="48" height="10" rx="4" fill="${metalFill}" stroke="${css(darken(guard, 0.4))}" stroke-width="1.8"/>
    <rect x="42" y="72" width="16" height="22" rx="5" fill="${gripFill}" stroke="${css(darken(hilt, 0.4))}" stroke-width="1.8"/>
    <circle cx="50" cy="96" r="7" fill="${metalFill}" stroke="${css(darken(guard, 0.4))}" stroke-width="1.8"/>
  `;
  return svgDoc('0 0 100 104', defs, body);
}

// main, trim, dark — rounded chest-plate silhouette.
function buildArmorIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 50, light: 0.25, dark: 0.3 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <path d="M 20 22 Q 50 8 80 22 L 84 50 Q 74 62 66 56 L 66 90 Q 50 96 34 90 L 34 56 Q 26 62 16 50 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 38 30 Q 50 24 62 30 L 60 46 L 40 46 Z" fill="${css(trim)}" opacity="0.85"/>
  `;
  return svgDoc('0 0 100 100', defs, body);
}

// main, trim, dark — domed helm with a visor slit.
function buildHelmetIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 45, light: 0.3, dark: 0.25 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <path d="M 22 56 Q 18 20 50 14 Q 82 20 78 56 Q 78 70 50 72 Q 22 70 22 56 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3"/>
    <rect x="30" y="42" width="40" height="8" rx="3" fill="${css(trim)}"/>
  `;
  return svgDoc('0 0 100 90', defs, body);
}

// main, trim, dark — closed fist with a wrist cuff.
function buildGlovesIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 45, light: 0.3, dark: 0.25 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <path d="M 30 20 Q 26 14 32 12 Q 38 8 40 16 L 42 30 L 46 14 Q 48 6 54 8 Q 60 10 58 18 L 56 32 L 62 18
              Q 65 10 71 13 Q 76 17 72 25 L 66 40 Q 78 44 76 58 Q 74 76 54 78 Q 32 78 26 60 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="28" y="78" width="46" height="14" rx="6" fill="${css(trim)}" stroke="${dStr}" stroke-width="2"/>
  `;
  return svgDoc('0 0 100 96', defs, body);
}

// main, trim, dark — ankle boot, side profile.
function buildBootsIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 60, light: 0.3, dark: 0.25 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <path d="M 30 10 L 62 10 L 62 54 L 82 62 Q 90 66 88 76 L 86 82 L 20 82 L 20 40 Q 20 30 30 26 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="30" y="10" width="32" height="12" rx="4" fill="${css(trim)}"/>
  `;
  return svgDoc('0 0 100 92', defs, body);
}

// main, trim, dark — heater shield with a vertical highlight spine.
function buildShieldIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 50, light: 0.3, dark: 0.25 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <path d="M 50 8 L 84 20 L 82 54 Q 80 82 50 94 Q 20 82 18 54 L 16 20 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="44" y="20" width="12" height="52" rx="4" fill="${css(trim)}" opacity="0.8"/>
  `;
  return svgDoc('0 0 100 100', defs, body);
}

// main, trim, dark — horizontal belt band with a buckle.
function buildBeltIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 90, light: 0.3, dark: 0.25 });
  const dStr = css(darken(main, 0.45));
  const body = `
    <rect x="8" y="36" width="84" height="28" rx="8" fill="${mainFill}" stroke="${dStr}" stroke-width="3"/>
    <rect x="36" y="28" width="28" height="44" rx="7" fill="${css(trim)}" stroke="${dStr}" stroke-width="2.5"/>
  `;
  return svgDoc('0 0 100 100', defs, body);
}

// main, trim, dark — gem on a cord, worn by an active companion.
function buildCharmIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 55, light: 0.35, dark: 0.2 });
  const dStr = css(darken(main, 0.4));
  const body = `
    <path d="M 34 8 L 66 8 L 60 22 L 40 22 Z" fill="${css(trim)}"/>
    <path d="M 50 20 L 76 46 L 50 88 L 24 46 Z" fill="${mainFill}" stroke="${dStr}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M 50 20 L 62 46 L 50 72 L 38 46 Z" fill="${css(lighten(main, 0.25))}" opacity="0.6"/>
  `;
  return svgDoc('0 0 100 96', defs, body);
}

// main, trim, dark — rounder pendant on a chain, distinct from the Charm.
function buildAmuletIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 55, light: 0.35, dark: 0.2 });
  const dStr = css(darken(main, 0.4));
  const body = `
    <path d="M 42 2 L 58 2 L 62 16 L 38 16 Z" fill="${css(trim)}"/>
    <circle cx="50" cy="52" r="34" fill="${mainFill}" stroke="${dStr}" stroke-width="3.5"/>
    <circle cx="50" cy="52" r="15" fill="${css(trim)}" opacity="0.7"/>
  `;
  return svgDoc('0 0 100 96', defs, body);
}

// main, trim, dark — open ring band with a faceted set gem.
function buildRingIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 60, light: 0.3, dark: 0.25 });
  const gemFill = bodyGradient(defs, trim, { angle: 45, light: 0.5, dark: 0.15 });
  const dStr = css(darken(main, 0.4));
  const gemStroke = css(darken(trim, 0.4));
  const body = `
    <path d="M 22 46 Q 20 82 50 82 Q 80 82 78 46 Q 78 66 50 66 Q 22 66 22 46 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M 50 12 L 74 34 L 62 58 L 38 58 L 26 34 Z" fill="${gemFill}" stroke="${gemStroke}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M 50 12 L 62 34 L 50 58 L 38 34 Z" fill="${css(lighten(trim, 0.3))}" opacity="0.55"/>
  `;
  return svgDoc('0 0 100 90', defs, body);
}

// main, trim, dark — round berry/trinket, each Held Item its own palette.
function buildHeldItemIcon({ main, trim }) {
  const defs = [];
  const mainFill = bodyGradient(defs, main, { angle: 50, light: 0.35, dark: 0.2 });
  const dStr = css(darken(main, 0.4));
  const body = `
    <path d="M 36 14 L 64 14 L 58 28 L 42 28 Z" fill="${css(trim)}"/>
    <path d="M 30 34 Q 20 34 20 50 L 20 68 Q 20 88 50 88 Q 80 88 80 68 L 80 50 Q 80 34 70 34 Z"
          fill="${mainFill}" stroke="${dStr}" stroke-width="3"/>
    <ellipse cx="38" cy="46" rx="8" ry="6" fill="${css(lighten(main, 0.3))}" opacity="0.6"/>
  `;
  return svgDoc('0 0 100 96', defs, body);
}

module.exports = {
  css, lighten, darken, hex, bodyGradient, sheenGradient, contactShadow, svgDoc,
  buildQuadrupedTemplate, buildBipedTemplate, buildFlierTemplate, buildBlobTemplate, buildSerpentTemplate,
  buildArmoredBossTemplate, buildRobedBossTemplate, buildGolemBossTemplate, buildDragonBossTemplate,
  buildHero, buildChest, buildSpecter, buildTurtle,
  buildSwordIcon, buildArmorIcon, buildHelmetIcon, buildGlovesIcon, buildBootsIcon, buildShieldIcon,
  buildBeltIcon, buildCharmIcon, buildAmuletIcon, buildRingIcon, buildHeldItemIcon,
  fs, path,
};
