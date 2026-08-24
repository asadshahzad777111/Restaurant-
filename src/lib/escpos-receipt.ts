/** ESC/POS bytes for a 58mm bill: UTF-8 text + optional compact QR raster. No Buffer. */

import { qrEscPosRaster } from "./qr-byte";

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

/** Full slip: init, body, optional QR, feed, partial cut (GS V 1). */
export function buildSlipEscPos(text: string, qrUrl?: string | null): Uint8Array {
  const parts: number[][] = [
    [0x1b, 0x40],
    [0x1b, 0x61, 0x00],
    utf8(text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
    [0x0a, 0x0a],
  ];
  const url = String(qrUrl || "").trim();
  if (url) {
    parts.push(qrEscPosRaster(url, 3, 2));
    parts.push([0x1b, 0x61, 0x01], utf8("Scan to order"), [0x0a, 0x1b, 0x61, 0x00]);
  }
  parts.push([0x0a, 0x0a, 0x0a], [0x1d, 0x56, 0x01]);
  return concat(parts);
}
