/** ESC/POS bytes for a 58/80mm bill: UTF-8 text + QR + logo at layout marks. No Buffer. */

import { qrEscPosRasterSized } from "./qr-byte";
import { BILL_LOGO_MARK, BILL_QR_MARK } from "./bill-layout";
import { RECEIPT_QR_CAPTION } from "./receipt-layout";

/** Cheap printers clip ~8–12mm after a cut — feed before the shop name. */
const TOP_FEED = [0x0a];
const BOTTOM_FEED = [0x0a, 0x0a];
export const ZIJIANG_QR_MAG = 6;
const ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ALIGN_CENTER = [0x1b, 0x61, 0x01];
const FONT_BIG = [0x1d, 0x21, 0x11];
const FONT_NORMAL = [0x1d, 0x21, 0x00];

function utf8(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)!;
    if (code > 0xffff) i++;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
}

function concat(parts: number[][]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    bin += String.fromCharCode.apply(null, Array.from(slice) as unknown as number[]);
  }
  return btoa(bin);
}

export function escPosQrZijiang(url: string, mag = ZIJIANG_QR_MAG): number[] {
  const data = utf8(url);
  const size = Math.max(3, Math.min(8, mag));
  return [
    ...ALIGN_LEFT,
    0x1b,
    0x5a,
    0x00,
    0x02,
    size,
    data.length & 0xff,
    (data.length >> 8) & 0xff,
    ...data,
    0x0a,
  ];
}

function qrCaptionBytes(): number[] {
  return [...ALIGN_CENTER, ...utf8(RECEIPT_QR_CAPTION[0]), 0x0a, ...utf8(RECEIPT_QR_CAPTION[1]), 0x0a];
}

function magForQrDots(qrDots: number) {
  return Math.max(3, Math.min(8, Math.round((Number(qrDots) || 240) / 40)));
}

export type SlipEscPosOpts = {
  paperDots?: number;
  qrDots?: number;
};

/**
 * Full slip. If the body contains <<ORDO_LOGO>> / <<ORDO_QR>>, rasters land there
 * (saved bill layout). Otherwise logo is prepended and QR appended (kitchen/test).
 * `^B` = big centered shop name, `^C` = centered line.
 */
export function buildSlipEscPos(
  text: string,
  qrUrl?: string | null,
  logoRaster?: ArrayLike<number> | null,
  opts?: SlipEscPosOpts,
): Uint8Array {
  const body = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\n+/, "").replace(/\n+$/, "");
  const paperDots = Math.max(96, Number(opts?.paperDots) || 384);
  const qrDots = Math.max(80, Number(opts?.qrDots) || 240);
  const url = String(qrUrl || "").trim();
  const hasLogoMark = body.includes(BILL_LOGO_MARK);
  const hasQrMark = body.includes(BILL_QR_MARK);
  const parts: number[][] = [[0x1b, 0x40], ALIGN_LEFT, TOP_FEED];
  if (!hasLogoMark && logoRaster && logoRaster.length) {
    parts.push(ALIGN_CENTER, Array.from(logoRaster), [0x0a], ALIGN_LEFT);
  }

  const lines = body.split("\n");
  let centered = 0;
  for (const raw of lines) {
    const line = raw;
    if (line === BILL_LOGO_MARK) {
      if (logoRaster && logoRaster.length) {
        parts.push(ALIGN_CENTER, Array.from(logoRaster), [0x0a], ALIGN_LEFT);
      }
      continue;
    }
    if (line === BILL_QR_MARK) {
      if (url) {
        parts.push(ALIGN_CENTER);
        parts.push(escPosQrZijiang(url, magForQrDots(qrDots)));
        parts.push(qrEscPosRasterSized(url, qrDots, paperDots));
        parts.push(ALIGN_LEFT);
      }
      continue;
    }
    let mode: "left" | "center" | "big" = "left";
    let msg = line;
    if (msg.startsWith("^B")) {
      mode = "big";
      msg = msg.slice(2);
    } else if (msg.startsWith("^C")) {
      mode = "center";
      msg = msg.slice(2);
    }
    if (!msg.trim()) {
      parts.push([0x0a]);
      continue;
    }
    const isFooter = /thank you|visit again|scan to order|cash - pickup/i.test(msg);
    const isHeader = !hasLogoMark && !hasQrMark && centered < 2 && msg.trim() !== "";
    if (mode === "big") {
      parts.push(ALIGN_CENTER, FONT_BIG, utf8(msg), FONT_NORMAL, [0x0a], ALIGN_LEFT);
    } else if (mode === "center" || isFooter || isHeader) {
      if (isHeader) centered++;
      parts.push(ALIGN_CENTER, utf8(msg), [0x0a], ALIGN_LEFT);
    } else {
      parts.push(ALIGN_LEFT, utf8(msg), [0x0a]);
    }
  }

  if (!hasQrMark && url) {
    parts.push(ALIGN_CENTER);
    parts.push(qrEscPosRasterSized(url, qrDots, paperDots));
    parts.push(qrCaptionBytes());
    parts.push(ALIGN_LEFT);
  }
  parts.push(BOTTOM_FEED, [0x1d, 0x56, 0x01]);
  return concat(parts);
}
