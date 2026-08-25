/** ESC/POS bytes for a 58mm bill: UTF-8 text + QR (Zijiang ESC Z + raster). No Buffer. */

import { qrEscPosRaster } from "./qr-byte";
import { RECEIPT_QR_CAPTION } from "./receipt-layout";

/** Cheap 58mm printers clip ~8–12mm after a cut — feed before the shop name. */
const TOP_FEED = [0x0a];
/** Extra feed so the bigger QR is not in the blade zone. */
const BOTTOM_FEED = [0x0a, 0x0a];
/** Zijiang module size — mag 6 ≈ 170–200 dots on typical guest-order URLs. */
export const ZIJIANG_QR_MAG = 6;
const ALIGN_LEFT = [0x1b, 0x61, 0x00];
const ALIGN_CENTER = [0x1b, 0x61, 0x01];

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

/**
 * Zijiang / POS-58 native QR: ESC Z v ecc mag nL nH data.
 * Mag 6 is scannable on 384-dot 58mm. Left-aligned (not centered).
 * Printers without ESC Z still get the raster below.
 */
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

/** Full slip: init, optional logo, top feed, body, left QR, captions, bottom feed, partial cut (GS V 1). */
export function buildSlipEscPos(
  text: string,
  qrUrl?: string | null,
  logoRaster?: ArrayLike<number> | null,
): Uint8Array {
  const body = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\n+/, "").replace(/\n+$/, "");
  const parts: number[][] = [[0x1b, 0x40], ALIGN_LEFT, TOP_FEED];
  if (logoRaster && logoRaster.length) {
    parts.push(Array.from(logoRaster), [0x0a]);
  }
  // Print the body line by line: center the header (first non-empty block, the
  // restaurant name/address) and the footer (Thank you / Visit again), left the rest.
  const lines = body.split("\n");
  let centered = 0;
  for (const raw of lines) {
    const line = raw;
    const isHeader = centered < 2 && line.trim() !== "";
    const isFooter = /thank you|visit again|scan to order|cash - pickup/i.test(line);
    if (isHeader || isFooter) {
      if (isHeader) centered++;
      parts.push(ALIGN_CENTER, utf8(line), [0x0a]);
    } else {
      parts.push(ALIGN_LEFT, utf8(line), [0x0a]);
    }
  }
  const url = String(qrUrl || "").trim();
  if (url) {
    // Print one QR (raster — reliable + sized wider) + its caption, flush.
    parts.push(qrEscPosRaster(url));
    parts.push(qrCaptionBytes());
  }
  parts.push(BOTTOM_FEED, [0x1d, 0x56, 0x01]);
  return concat(parts);
}
