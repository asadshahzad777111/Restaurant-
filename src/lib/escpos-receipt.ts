/** ESC/POS bytes for a 58mm bill: UTF-8 text + QR (Zijiang ESC Z + raster). No Buffer. */

import { qrEscPosRaster } from "./qr-byte";

/** Cheap 58mm printers clip ~8–12mm after a cut — feed before the shop name. */
const TOP_FEED = [0x0a, 0x0a, 0x0a, 0x0a];
/** Extra feed so the QR is not in the blade zone. */
const BOTTOM_FEED = [0x0a, 0x0a, 0x0a, 0x0a];

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
 * Zijiang / POS-58 native QR (this kit): ESC Z v ecc mag nL nH data.
 * Mag 4 stays compact on 384-dot 58mm. Printers without ESC Z still get the raster below.
 */
export function escPosQrZijiang(url: string, mag = 4): number[] {
  const data = utf8(url);
  const size = Math.max(3, Math.min(8, mag));
  return [
    0x1b,
    0x61,
    0x01,
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

/** Full slip: init, top feed, body, QR, bottom feed, partial cut (GS V 1). */
export function buildSlipEscPos(text: string, qrUrl?: string | null): Uint8Array {
  const body = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\n+/, "");
  const parts: number[][] = [[0x1b, 0x40], [0x1b, 0x61, 0x00], TOP_FEED, utf8(body), [0x0a, 0x0a]];
  const url = String(qrUrl || "").trim();
  if (url) {
    parts.push(escPosQrZijiang(url, 4));
    parts.push(qrEscPosRaster(url, 3, 2));
    parts.push([0x1b, 0x61, 0x01], utf8("Scan to order"), [0x0a, 0x1b, 0x61, 0x00]);
  }
  parts.push(BOTTOM_FEED, [0x1d, 0x56, 0x01]);
  return concat(parts);
}
