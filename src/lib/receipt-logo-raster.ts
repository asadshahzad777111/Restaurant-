/** 1-bit ESC/POS logo raster math for 58mm. No DOM, no URL fetch. */

/** 58mm printers at 203 dpi. */
export const RECEIPT_PAPER_DOTS = 384;
/**
 * Max contain-box on 58mm. Old 336×128 shrank a circular logo to ~128 dots (~16mm)
 * — a blurry speck next to the QR. 320×320 ≈ 40mm, similar weight to the QR,
 * still one emblem (not 15cm of paper). Canvas height is the fitted h, not the max.
 */
export const LOGO_BOX_W = 320;
export const LOGO_BOX_H = 320;
/**
 * Luminance cut: pixels lighter than this stay paper-white (no heat).
 * 212 sits in the 200–220 band — JPEG “white” (~240–255) is never ink,
 * while burger browns / red type still are. Yellow/gold need saturation
 * (pure yellow luminance is ~226, above this cut).
 */
const LIGHT_CUTOFF = 212;
/** HSV saturation: yellow, gold, orange, red fills print black even when light. */
const SAT_INK = 0.22;

export type LogoBoxOpts = { boxW?: number; boxH?: number; paperDots?: number };

export function fitLogoInBox(iw: number, ih: number, opts?: LogoBoxOpts): {
  dw: number;
  dh: number;
  ox: number;
  oy: number;
} {
  const boxW = Math.max(8, Number(opts?.boxW) || LOGO_BOX_W);
  const boxH = Math.max(8, Number(opts?.boxH) || LOGO_BOX_H);
  const paper = Math.max(96, Number(opts?.paperDots) || RECEIPT_PAPER_DOTS);
  const nw = Math.max(1, Number(iw) || 1);
  const nh = Math.max(1, Number(ih) || 1);
  const scale = Math.min(boxW / nw, boxH / nh);
  const dw = Math.max(8, Math.min(boxW, Math.round(nw * scale)));
  const dh = Math.max(8, Math.min(boxH, Math.round(nh * scale)));
  return {
    dw,
    dh,
    ox: Math.floor((paper - dw) / 2),
    oy: 0,
  };
}

/** Near-white / transparent pad — crop so a circle in a JPEG square fills the box. */
export function isLogoMarginPixel(r: number, g: number, b: number, a = 255): boolean {
  if (a < 16) return true;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max <= 1 ? 0 : (max - min) / max;
  return lum >= 245 && sat < 0.06;
}

export function cropLogoContent(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (isLogoMarginPixel(data[o], data[o + 1], data[o + 2], data[o + 3])) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: width, h: height };
  const pad = 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad);
  y1 = Math.min(height - 1, y1 + pad);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * GS v 0 (ESC/POS `1D 76 30 m`). m = 0 (normal density).
 * Bit 1 = heat / black on POS-58 / Zijiang — same polarity as the QR raster.
 */
export function wrapLogoGsV0(width: number, height: number, bits: number[]): number[] {
  const byteW = Math.ceil(width / 8);
  return [
    0x1b,
    0x61,
    0x00,
    0x1d,
    0x76,
    0x30,
    0x00,
    byteW & 0xff,
    (byteW >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
    ...bits,
    0x0a,
    0x1b,
    0x61,
    0x00,
  ];
}

/** True when the ESC/POS buffer contains GS v 0 (raster bitmap). */
export function hasGsV0Raster(bytes: ArrayLike<number>): boolean {
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30) return true;
  }
  return false;
}

export function gsV0Index(bytes: ArrayLike<number>): number {
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x1d && bytes[i + 1] === 0x76 && bytes[i + 2] === 0x30) return i;
  }
  return -1;
}

/**
 * Composite onto white, then mark ink. Never invert a whole bitmap —
 * that turned white JPEG squares + letterbox into a solid black brick.
 */
export function logoPixelIsInk(r: number, g: number, b: number, a = 255): boolean {
  const t = Math.max(0, Math.min(1, a / 255));
  const cr = 255 * (1 - t) + r * t;
  const cg = 255 * (1 - t) + g * t;
  const cb = 255 * (1 - t) + b * t;
  const lum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
  const max = Math.max(cr, cg, cb);
  const min = Math.min(cr, cg, cb);
  const sat = max <= 1 ? 0 : (max - min) / max;
  return lum < LIGHT_CUTOFF || sat >= SAT_INK;
}

export function thresholdLogoBits(
  data: Uint8ClampedArray | Uint8Array,
  canvasW: number,
  height: number,
): number[] {
  const byteW = canvasW >> 3;
  const bits = new Array(byteW * height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < canvasW; x++) {
      const o = (y * canvasW + x) * 4;
      if (logoPixelIsInk(data[o], data[o + 1], data[o + 2], data[o + 3])) {
        bits[y * byteW + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return bits;
}

/** Ink stats for GS v 0 payload (skips header). Used by the size/polarity test. */
export function gsV0InkStats(bytes: ArrayLike<number>): {
  width: number;
  height: number;
  inkBits: number;
  totalBits: number;
  inkRatio: number;
} {
  const idx = gsV0Index(bytes);
  if (idx < 0) return { width: 0, height: 0, inkBits: 0, totalBits: 0, inkRatio: 1 };
  const byteW = bytes[idx + 4] | (bytes[idx + 5] << 8);
  const height = bytes[idx + 6] | (bytes[idx + 7] << 8);
  const width = byteW * 8;
  const start = idx + 8;
  const n = byteW * height;
  let inkBits = 0;
  for (let i = 0; i < n; i++) {
    const v = bytes[start + i] || 0;
    for (let b = 0; b < 8; b++) if (v & (0x80 >> b)) inkBits++;
  }
  const totalBits = n * 8;
  return { width, height, inkBits, totalBits, inkRatio: totalBits ? inkBits / totalBits : 1 };
}

/**
 * Node-safe raster: crop empty pad, contain-fit into 320×320, 384-wide white letterbox.
 * Never inverts. Same packing the canvas path uses after getImageData.
 */
export function rasterizeLogoRgba(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  opts?: LogoBoxOpts,
): number[] {
  const crop = cropLogoContent(data, width, height);
  const paper = Math.max(96, Number(opts?.paperDots) || RECEIPT_PAPER_DOTS);
  const { dw, dh, ox } = fitLogoInBox(crop.w, crop.h, { ...opts, paperDots: paper });
  const canvasW = paper;
  const canvasH = Math.max(8, dh);
  const out = new Uint8Array(canvasW * canvasH * 4);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = 255;
  }
  for (let y = 0; y < dh; y++) {
    const srcY = crop.y + Math.min(crop.h - 1, Math.floor(((y + 0.5) * crop.h) / dh));
    for (let x = 0; x < dw; x++) {
      const srcX = crop.x + Math.min(crop.w - 1, Math.floor(((x + 0.5) * crop.w) / dw));
      const so = (srcY * width + srcX) * 4;
      const o = (y * canvasW + (ox + x)) * 4;
      out[o] = data[so];
      out[o + 1] = data[so + 1];
      out[o + 2] = data[so + 2];
      out[o + 3] = data[so + 3] ?? 255;
    }
  }
  return wrapLogoGsV0(canvasW, canvasH, thresholdLogoBits(out, canvasW, canvasH));
}
