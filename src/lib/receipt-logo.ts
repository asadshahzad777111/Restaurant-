/** 1-bit ESC/POS logo raster (GS v 0) for 58mm. Browser canvas — no npm image lib. */

import { LIVE_APP_HOST } from "./urls";

/** 58mm printers at 203 dpi. */
export const RECEIPT_PAPER_DOTS = 384;
/**
 * Fixed contain-box for every restaurant logo — never native image pixels.
 * 336×128 dots ≈ 51×19 mm on 58mm paper. Same box for a 40px icon or a 2000px PNG.
 */
export const LOGO_BOX_W = 336;
export const LOGO_BOX_H = 128;
/** Darker than 128 so light-gray marks still burn in on cheap thermal heads. */
const THRESHOLD = 168;

export function fitLogoInBox(iw: number, ih: number): {
  dw: number;
  dh: number;
  ox: number;
  oy: number;
} {
  const nw = Math.max(1, Number(iw) || 1);
  const nh = Math.max(1, Number(ih) || 1);
  const scale = Math.min(LOGO_BOX_W / nw, LOGO_BOX_H / nh);
  const dw = Math.max(8, Math.min(LOGO_BOX_W, Math.round(nw * scale)));
  const dh = Math.max(8, Math.min(LOGO_BOX_H, Math.round(nh * scale)));
  return {
    dw,
    dh,
    ox: Math.floor((RECEIPT_PAPER_DOTS - dw) / 2),
    oy: Math.floor((LOGO_BOX_H - dh) / 2),
  };
}

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

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo image failed"));
    img.src = src;
  });
}

function logoFetchOrigin(): string {
  if (typeof window !== "undefined") {
    try {
      const o = window.location.origin;
      const h = window.location.hostname;
      if (o && (h === LIVE_APP_HOST || h === "localhost" || h === "127.0.0.1")) return o;
    } catch {
      /* ignore */
    }
  }
  return `https://${LIVE_APP_HOST}`;
}

/**
 * Make a logo URL loadable from the page origin as an absolute URL.
 *
 * Local file-store logos (/api/media/…) become https://ordo.asfins.com/api/media/…
 * R2 logos (https://…r2.dev/… or media.ordo.asfins.com) go through /api/media/proxy
 * so <canvas> is never tainted (getImageData SecurityError used to drop the logo).
 */
export function sameOriginLogoUrl(url: string): string {
  const src = String(url || "").trim();
  if (!src) return "";
  const origin = logoFetchOrigin();
  if (src.startsWith("/api/media/proxy")) {
    return src.startsWith("http") ? src : `${origin}${src}`;
  }
  if (src.startsWith("/api/media/") && !src.startsWith("//")) {
    return `${origin}${src}`;
  }
  let abs = src;
  if (src.startsWith("//")) abs = `https:${src}`;
  if (abs.startsWith("http://") || abs.startsWith("https://")) {
    try {
      const u = new URL(abs);
      if (u.pathname.startsWith("/api/media/")) return abs;
    } catch {
      /* fall through to proxy */
    }
    return `${origin}/api/media/proxy?url=${encodeURIComponent(abs)}`;
  }
  if (src.startsWith("/")) return `${origin}${src}`;
  return src;
}

async function loadLogoImage(url: string): Promise<HTMLImageElement> {
  const src = sameOriginLogoUrl(url);
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (res.ok) {
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      try {
        return await decodeImage(obj);
      } finally {
        URL.revokeObjectURL(obj);
      }
    }
  } catch {
    /* fall through to <img> */
  }
  return decodeImage(src);
}

function thresholdBits(
  data: Uint8ClampedArray,
  canvasW: number,
  height: number,
): number[] {
  const byteW = canvasW >> 3;
  const n = canvasW * height;
  const gray = new Float32Array(n);
  let opaqueSum = 0;
  let opaqueCount = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const a = data[o + 3] / 255;
    const g = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    gray[i] = 255 * (1 - a) + g * a;
    if (data[o + 3] > 128) {
      opaqueSum += g;
      opaqueCount++;
    }
  }
  // White / light logos on transparent backgrounds would print as nothing.
  const invert = opaqueCount > 16 && opaqueSum / opaqueCount > 200;
  if (invert) {
    for (let i = 0; i < n; i++) {
      const a = data[i * 4 + 3];
      if (a > 128) gray[i] = 255 - gray[i];
    }
  }
  const bits = new Array(byteW * height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < canvasW; x++) {
      if (gray[y * canvasW + x] < THRESHOLD) {
        bits[y * byteW + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return bits;
}

/**
 * 1-bit GS v 0, centered in a fixed 384×128 box (contain + letterbox).
 * Threshold — not dither — so cheap 58mm heads print a crisp mark.
 */
export async function rasterizeLogoForEscPos(url: string): Promise<number[] | null> {
  if (typeof document === "undefined") return null;
  const src = String(url || "").trim();
  if (!src) return null;
  try {
    const img = await loadLogoImage(src);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const { dw, dh, ox, oy } = fitLogoInBox(iw, ih);
    const canvasW = RECEIPT_PAPER_DOTS;
    const canvasH = LOGO_BOX_H;
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, ox, oy, dw, dh);
    const data = ctx.getImageData(0, 0, canvasW, canvasH).data;
    const bits = thresholdBits(data, canvasW, canvasH);
    return wrapLogoGsV0(canvasW, canvasH, bits);
  } catch {
    return null;
  }
}
