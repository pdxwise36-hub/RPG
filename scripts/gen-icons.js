// One-off dev script: renders simple pixel-art app icons to PNG without any
// image library, since none is available in this environment. Uses only
// node:zlib for DEFLATE compression per the PNG spec.
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([len, typeData, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // add filter byte (0=none) per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Simple pixel-art: a gold sword crossed over a shield, on a dark blue-purple
// background, drawn on a 16x16 grid then upscaled with nearest-neighbor.
function buildGrid() {
  const BG = '.';
  const SHIELD = 'S';
  const SHIELD_RIM = 's';
  const BLADE = 'B';
  const HILT = 'H';
  const g = Array.from({ length: 16 }, () => Array(16).fill(BG));

  // shield body (rounded-ish diamond ~ ellipse ish ~ rows 4-13, cols 3-12)
  const shieldRows = [
    [5, 10], [4, 11], [4, 11], [4, 11], [4, 11], [4, 11],
    [4, 11], [5, 10], [5, 10], [6, 9], [7, 8],
  ];
  shieldRows.forEach((range, i) => {
    const row = 3 + i;
    for (let c = range[0]; c <= range[1]; c++) g[row][c] = SHIELD;
  });
  // shield rim (outline) - recolor edge cells
  for (let row = 3; row <= 13; row++) {
    for (let c = 0; c < 16; c++) {
      if (g[row][c] === SHIELD) {
        const leftEdge = g[row][c - 1] !== SHIELD;
        const rightEdge = g[row][c + 1] !== SHIELD;
        if (leftEdge || rightEdge) g[row][c] = SHIELD_RIM;
      }
    }
  }

  // sword: diagonal blade from top-left to bottom-right through center, with hilt
  const bladeCells = [
    [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 11],
  ];
  bladeCells.forEach(([r, c]) => { g[r][c] = BLADE; });
  // crossguard + hilt
  g[9][10] = HILT; g[10][12] = HILT; g[10][10] = HILT;
  g[11][13] = HILT; g[12][14] = HILT;

  return g;
}

const PALETTE = {
  '.': [26, 20, 46, 255],    // dark indigo background
  'S': [58, 46, 122, 255],   // shield body, muted violet
  's': [122, 98, 200, 255],  // shield rim, lighter violet
  'B': [226, 226, 235, 255], // blade, near-white steel
  'H': [212, 168, 64, 255],  // hilt/gold
};

function render(size) {
  const grid = buildGrid();
  const cell = size / 16;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const gy = Math.min(15, Math.floor(y / cell));
    for (let x = 0; x < size; x++) {
      const gx = Math.min(15, Math.floor(x / cell));
      const color = PALETTE[grid[gy][gx]];
      const idx = (y * size + x) * 4;
      rgba[idx] = color[0];
      rgba[idx + 1] = color[1];
      rgba[idx + 2] = color[2];
      rgba[idx + 3] = color[3];
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const png = render(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
