/** 1-bit ESC/POS logo raster (GS v 0) for 58mm. Browser canvas — no npm image lib. */

import { LIVE_APP_HOST } from "./urls";
import {
  cropLogoContent,
  fitLogoInBox,
  RECEIPT_PAPER_DOTS,
  thresholdLogoBits,
  wrapLogoGsV0,
} from "./receipt-logo-raster";

export {
  cropLogoContent,
  fitLogoInBox,
  gsV0Index,
  gsV0InkStats,
  hasGsV0Raster,
  isLogoMarginPixel,
  logoPixelIsInk,
  LOGO_BOX_H,
  LOGO_BOX_W,
  rasterizeLogoRgba,
  RECEIPT_PAPER_DOTS,
  wrapLogoGsV0,
} from "./receipt-logo-raster";

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

/**
 * 1-bit GS v 0, contain-fit into 320×320 max, centered on 384-dot paper.
 * Canvas height is the fitted logo height (white side letterbox only).
 * Hard threshold — not Floyd–Steinberg — so cheap 58mm heads print a crisp mark.
 */
export async function rasterizeLogoForEscPos(
  url: string,
  opts?: { boxW?: number; boxH?: number; paperDots?: number },
): Promise<number[] | null> {
  if (typeof document === "undefined") return null;
  const src = String(url || "").trim();
  if (!src) return null;
  try {
    const img = await loadLogoImage(src);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const maxSide = 1024;
    const prepScale = Math.min(1, maxSide / Math.max(iw, ih));
    const sw = Math.max(1, Math.round(iw * prepScale));
    const sh = Math.max(1, Math.round(ih * prepScale));
    const scratch = document.createElement("canvas");
    scratch.width = sw;
    scratch.height = sh;
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!sctx) return null;
    sctx.fillStyle = "#ffffff";
    sctx.fillRect(0, 0, sw, sh);
    sctx.drawImage(img, 0, 0, sw, sh);
    const srcData = sctx.getImageData(0, 0, sw, sh).data;
    const crop = cropLogoContent(srcData, sw, sh);
    const paper = Math.max(96, Number(opts?.paperDots) || RECEIPT_PAPER_DOTS);
    const { dw, dh, ox } = fitLogoInBox(crop.w, crop.h, { ...opts, paperDots: paper });
    const canvasW = paper;
    const canvasH = Math.max(8, dh);
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(scratch, crop.x, crop.y, crop.w, crop.h, ox, 0, dw, dh);
    const data = ctx.getImageData(0, 0, canvasW, canvasH).data;
    const bits = thresholdLogoBits(data, canvasW, canvasH);
    return wrapLogoGsV0(canvasW, canvasH, bits);
  } catch {
    return null;
  }
}
