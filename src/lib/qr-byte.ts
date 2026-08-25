/**
 * Compact QR (byte mode, ECC M, versions 1–6). Enough for
 * https://ordo.asfins.com/order?tenant=CODE on a 58mm slip.
 * No npm dependency — matrix is reused as SVG (iframe) and ESC/POS raster.
 */

type BitGrid = boolean[][];

const ECC_M: { ec: number; g1: number; g1n: number; g2: number; g2n: number }[] = [
  { ec: 0, g1: 0, g1n: 0, g2: 0, g2n: 0 },
  { ec: 10, g1: 1, g1n: 16, g2: 0, g2n: 0 },
  { ec: 16, g1: 1, g1n: 28, g2: 0, g2n: 0 },
  { ec: 26, g1: 1, g1n: 44, g2: 0, g2n: 0 },
  { ec: 18, g1: 2, g1n: 32, g2: 0, g2n: 0 },
  { ec: 24, g1: 2, g1n: 43, g2: 0, g2n: 0 },
  { ec: 16, g1: 4, g1n: 27, g2: 0, g2n: 0 },
];

const ALIGN: number[][] = [[], [], [18], [22], [26], [30], [34]];

const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

function gfMul(x: number, y: number) {
  if (x === 0 || y === 0) return 0;
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(degree: number): number[] {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 2);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result[0];
    result.shift();
    result.push(0);
    if (!factor) continue;
    for (let i = 0; i < result.length; i++) result[i] ^= gfMul(divisor[i], factor);
  }
  return result;
}

function utf8Bytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.codePointAt(i)!;
    if (c > 0xffff) i++;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return out;
}

function pickVersion(len: number): number {
  for (let v = 1; v <= 6; v++) {
    const spec = ECC_M[v];
    const dataBytes = spec.g1 * spec.g1n + spec.g2 * spec.g2n;
    const capacity = dataBytes - 2;
    if (len <= capacity) return v;
  }
  throw new Error("QR payload too long for 58mm");
}

function encodeData(bytes: number[], version: number): number[] {
  const spec = ECC_M[version];
  const dataBytes = spec.g1 * spec.g1n + spec.g2 * spec.g2n;
  const bits: number[] = [];
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  const maxBits = dataBytes * 8;
  const term = Math.min(4, maxBits - bits.length);
  push(0, term);
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  const pads = [0xec, 0x11];
  let p = 0;
  while (data.length < dataBytes) data.push(pads[p++ % 2]);
  return data.slice(0, dataBytes);
}

function eccBlocks(data: number[], version: number): number[] {
  const spec = ECC_M[version];
  const divisor = rsDivisor(spec.ec);
  const blocks: { d: number[]; e: number[] }[] = [];
  let offset = 0;
  for (let i = 0; i < spec.g1; i++) {
    const d = data.slice(offset, offset + spec.g1n);
    offset += spec.g1n;
    blocks.push({ d, e: rsRemainder(d, divisor) });
  }
  for (let i = 0; i < spec.g2; i++) {
    const d = data.slice(offset, offset + spec.g2n);
    offset += spec.g2n;
    blocks.push({ d, e: rsRemainder(d, divisor) });
  }
  const out: number[] = [];
  const maxD = Math.max(...blocks.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) {
    for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  }
  for (let i = 0; i < spec.ec; i++) {
    for (const b of blocks) out.push(b.e[i]);
  }
  return out;
}

function sizeOf(version: number) {
  return 17 + 4 * version;
}

function finder(grid: BitGrid, reserved: BitGrid, x: number, y: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (yy < 0 || xx < 0 || yy >= grid.length || xx >= grid.length) continue;
      const on =
        dx >= 0 &&
        dy >= 0 &&
        dx <= 6 &&
        dy <= 6 &&
        (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      grid[yy][xx] = on;
      reserved[yy][xx] = true;
    }
  }
}

function alignment(grid: BitGrid, reserved: BitGrid, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (reserved[cy + dy]?.[cx + dx]) return;
    }
  }
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      grid[cy + dy][cx + dx] = adx === 2 || ady === 2 || (adx === 0 && ady === 0);
      reserved[cy + dy][cx + dx] = true;
    }
  }
}

function maskBit(mask: number, r: number, c: number) {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

function placeFormat(grid: BitGrid, bits: number) {
  const n = grid.length;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) grid[i][8] = bit(i);
  grid[7][8] = bit(6);
  grid[8][8] = bit(7);
  grid[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) grid[8][14 - i] = bit(i);
  for (let i = 0; i <= 7; i++) grid[8][n - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) grid[n - 15 + i][8] = bit(i);
  grid[n - 8][8] = true;
}

function penalty(grid: BitGrid): number {
  const n = grid.length;
  let score = 0;
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c <= n; c++) {
      if (c < n && grid[r][c] === grid[r][c - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r <= n; r++) {
      if (r < n && grid[r][c] === grid[r - 1][c]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
  }
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) score += 3;
    }
  }
  const finder = [true, false, true, true, true, false, true];
  const rowHas = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) if (grid[r][c + i] !== finder[i]) return false;
    return true;
  };
  const colHas = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) if (grid[r + i][c] !== finder[i]) return false;
    return true;
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n - 6; c++) if (rowHas(r, c)) score += 40;
  }
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n - 6; r++) if (colHas(r, c)) score += 40;
  }
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c]) dark++;
  const pct = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

function clone(grid: BitGrid): BitGrid {
  return grid.map((row) => row.slice());
}

export function encodeQrMatrix(text: string): BitGrid {
  const bytes = utf8Bytes(text);
  const version = pickVersion(bytes.length);
  const codewords = eccBlocks(encodeData(bytes, version), version);
  const n = sizeOf(version);
  const grid: BitGrid = Array.from({ length: n }, () => Array(n).fill(false));
  const reserved: BitGrid = Array.from({ length: n }, () => Array(n).fill(false));

  finder(grid, reserved, 0, 0);
  finder(grid, reserved, n - 7, 0);
  finder(grid, reserved, 0, n - 7);
  for (const pos of ALIGN[version] || []) alignment(grid, reserved, pos, pos);

  for (let i = 8; i < n - 8; i++) {
    grid[i][6] = i % 2 === 0;
    grid[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    reserved[6][i] = true;
  }
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][n - 1 - i] = true;
    reserved[n - 1 - i][8] = true;
  }
  reserved[n - 8][8] = true;

  const bits: number[] = [];
  for (const w of codewords) for (let i = 7; i >= 0; i--) bits.push((w >> i) & 1);
  let bi = 0;
  let dir = -1;
  for (let c = n - 1; c > 0; c -= 2) {
    if (c === 6) c--;
    for (let i = 0; i < n; i++) {
      const r = dir < 0 ? n - 1 - i : i;
      for (const cc of [c, c - 1]) {
        if (reserved[r][cc]) continue;
        grid[r][cc] = bits[bi] === 1;
        bi++;
      }
    }
    dir = -dir;
  }

  let bestScore = Infinity;
  let best = grid;
  for (let mask = 0; mask < 8; mask++) {
    const g = clone(grid);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!reserved[r][c] && maskBit(mask, r, c)) g[r][c] = !g[r][c];
      }
    }
    placeFormat(g, FORMAT_M[mask]);
    const s = penalty(g);
    if (s < bestScore) {
      bestScore = s;
      best = g;
    }
  }
  return best;
}

/** 1-bit BMP data URL — Windows POS-58 drivers often skip SVG; they do print images. */
export function qrBmpDataUrl(text: string, scale = 4): string {
  const m = encodeQrMatrix(text);
  const quiet = 2;
  const n = m.length;
  const dim = (n + quiet * 2) * scale;
  const rowBytes = Math.ceil(dim / 32) * 4;
  const pixels = new Uint8Array(rowBytes * dim);
  for (let y = 0; y < dim; y++) {
    const my = Math.floor(y / scale) - quiet;
    const destY = dim - 1 - y;
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quiet;
      const on = mx >= 0 && my >= 0 && mx < n && my < n && m[my][mx];
      if (!on) pixels[destY * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  const headerSize = 62;
  const file = new Uint8Array(headerSize + pixels.length);
  const dv = new DataView(file.buffer);
  file[0] = 0x42;
  file[1] = 0x4d;
  dv.setUint32(2, file.length, true);
  dv.setUint32(10, headerSize, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, dim, true);
  dv.setInt32(22, dim, true);
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 1, true);
  dv.setUint32(34, pixels.length, true);
  file[54] = 0;
  file[55] = 0;
  file[56] = 0;
  file[57] = 0;
  file[58] = 255;
  file[59] = 255;
  file[60] = 255;
  file[61] = 0;
  file.set(pixels, headerSize);
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < file.length; i += step) {
    bin += String.fromCharCode.apply(null, Array.from(file.subarray(i, i + step)) as unknown as number[]);
  }
  return `data:image/bmp;base64,${btoa(bin)}`;
}

export function qrPrintImgMarkup(text: string, mm = 22): string {
  const src = qrBmpDataUrl(text, 4);
  return `<img class="qr-img" alt="" width="${mm}mm" height="${mm}mm" src="${src}"/>`;
}

export function qrSvgMarkup(text: string, mm = 22): string {
  const m = encodeQrMatrix(text);
  const quiet = 2;
  const n = m.length;
  const dim = n + quiet * 2;
  let dark = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m[y][x]) dark += `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${mm}mm" height="${mm}mm" shape-rendering="crispEdges" aria-hidden="true"><rect width="${dim}" height="${dim}" fill="#fff"/>${dark}</svg>`;
}

/** ESC/POS raster (GS v 0) — works on cheap 58mm printers without native QR firmware. */
export function qrEscPosRaster(text: string, scale = 3, quiet = 2): number[] {
  const m = encodeQrMatrix(text);
  const n = m.length;
  const dim = (n + quiet * 2) * scale;
  const byteW = Math.ceil(dim / 8);
  const bytes = new Array(byteW * dim).fill(0);
  for (let y = 0; y < dim; y++) {
    const my = Math.floor(y / scale) - quiet;
    for (let x = 0; x < dim; x++) {
      const mx = Math.floor(x / scale) - quiet;
      const on = mx >= 0 && my >= 0 && mx < n && my < n && m[my][mx];
      if (on) bytes[y * byteW + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return [
    0x1b,
    0x61,
    0x01,
    0x1d,
    0x76,
    0x30,
    0x00,
    byteW & 0xff,
    (byteW >> 8) & 0xff,
    dim & 0xff,
    (dim >> 8) & 0xff,
    ...bytes,
    0x0a,
    0x1b,
    0x61,
    0x00,
  ];
}
