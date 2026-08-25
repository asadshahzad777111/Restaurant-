/** 1-bit ESC/POS logo raster (GS v 0) for 58mm. Browser canvas — no npm image lib. */

const PAPER_DOTS = 384;
/** Modest height so the logo does not eat the whole slip (~120–180px). */
const MAX_H = 160;

function gsv0(width: number, height: number, bits: number[]): number[] {
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

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo image failed"));
    img.src = src;
  });
}

async function loadLogoImage(url: string): Promise<HTMLImageElement> {
  try {
    const res = await fetch(url, { mode: "cors" });
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
  return decodeImage(url);
}

/** Floyd–Steinberg 1-bit GS v 0, left-aligned, max 384×160 dots. */
export async function rasterizeLogoForEscPos(url: string): Promise<number[] | null> {
  if (typeof document === "undefined") return null;
  const src = String(url || "").trim();
  if (!src) return null;
  try {
    const img = await loadLogoImage(src);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const fit = Math.min(PAPER_DOTS / iw, MAX_H / ih);
    const w = Math.max(16, Math.round(iw * fit));
    const h = Math.max(16, Math.round(ih * fit));
    const byteW = Math.ceil(w / 8);
    const canvasW = byteW * 8;
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasW, h);
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, canvasW, h).data;
    const gray = new Float32Array(canvasW * h);
    for (let i = 0; i < canvasW * h; i++) {
      const o = i * 4;
      const a = data[o + 3] / 255;
      const g = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      gray[i] = 255 * (1 - a) + g * a;
    }
    const bits = new Array(byteW * h).fill(0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < canvasW; x++) {
        const i = y * canvasW + x;
        const old = gray[i];
        const next = old < 128 ? 0 : 255;
        const err = old - next;
        if (next === 0) bits[y * byteW + (x >> 3)] |= 0x80 >> (x & 7);
        if (x + 1 < canvasW) gray[i + 1] += (err * 7) / 16;
        if (y + 1 < h) {
          if (x > 0) gray[i + canvasW - 1] += (err * 3) / 16;
          gray[i + canvasW] += (err * 5) / 16;
          if (x + 1 < canvasW) gray[i + canvasW + 1] += (err * 1) / 16;
        }
      }
    }
    return gsv0(canvasW, h, bits);
  } catch {
    return null;
  }
}
