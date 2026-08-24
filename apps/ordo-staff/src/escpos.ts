/**
 * ESC/POS command builder for a 58mm thermal printer (public command set only).
 * Pure JS WITHOUT Node's Buffer — Hermes (Android JS engine) has no global Buffer.
 * Returns Uint8Array; the native BLE/USB transport sends them. No vendor SDK.
 */

type Row = { text: string; align?: "left" | "center" | "right"; bold?: boolean };

const WIDTH = 32;
const TICK = "-";

/** UTF-8 encoder (no Buffer / TextEncoder dependency). */
function utf8(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)!;
    if (code > 0xffff) i++;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6));
      out.push(0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12));
      out.push(0x80 | ((code >> 6) & 0x3f));
      out.push(0x80 | (code & 0x3f));
    } else {
      out.push(0xf0 | (code >> 18));
      out.push(0x80 | ((code >> 12) & 0x3f));
      out.push(0x80 | ((code >> 6) & 0x3f));
      out.push(0x80 | (code & 0x3f));
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

const INIT = [0x1b, 0x40]; // ESC @
const LF = [0x0a];
const CUT = [0x1d, 0x56, 0x00]; // GS V 0
const KICK = [0x1b, 0x70, 0x00, 0x19, 0xfa]; // cash drawer pulse

function padRow(row: Row): string {
  const text = row.text.slice(0, WIDTH);
  if (row.align === "center") {
    const left = Math.max(0, Math.floor((WIDTH - text.length) / 2));
    return " ".repeat(left) + text;
  }
  if (row.align === "right") {
    return " ".repeat(Math.max(0, WIDTH - text.length)) + text;
  }
  return text;
}

/** Build the full ESC/POS byte stream for a 58mm bill. */
export function buildReceiptEscPos(
  lines: Row[],
  opts: { cut?: boolean; cashDrawer?: boolean } = {},
): Uint8Array {
  const parts: number[][] = [INIT, [0x1b, 0x61, 0]]; // init + align left
  for (const row of lines) {
    if (row.text === TICK) {
      parts.push(
        [0x1b, 0x61, 0],
        [0x1b, 0x45, 0],
        utf8(TICK.repeat(WIDTH)),
        LF,
      );
      continue;
    }
    parts.push([0x1b, 0x61, row.align === "center" ? 1 : row.align === "right" ? 2 : 0]);
    parts.push([0x1b, 0x45, row.bold ? 1 : 0]);
    parts.push(utf8(padRow(row)), LF);
  }
  parts.push(LF, LF);
  if (opts.cashDrawer) parts.push(KICK);
  if (opts.cut) parts.push(CUT);
  return concat(parts);
}

/** GS ( k QR — compact 58mm; printer firmware draws the code. */
export function escPosQr(url: string, moduleSize = 4): number[] {
  const data = utf8(url);
  const storeLen = data.length + 3;
  return [
    0x1b,
    0x61,
    1,
    0x1d,
    0x28,
    0x6b,
    0x04,
    0x00,
    0x31,
    0x41,
    0x32,
    0x00,
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x43,
    Math.max(3, Math.min(8, moduleSize)),
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x45,
    0x31,
    0x1d,
    0x28,
    0x6b,
    storeLen & 0xff,
    (storeLen >> 8) & 0xff,
    0x31,
    0x50,
    0x30,
    ...data,
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x51,
    0x30,
    0x0a,
    ...utf8("Scan to order"),
    0x0a,
    0x1b,
    0x61,
    0,
  ];
}

/** Convenience: a typical ORDO 58mm bill as ESC/POS rows. */
export function receiptRows(opts: {
  shop: string;
  billNo: string;
  date: string;
  lines: { name: string; qty: number; amount: string }[];
  total: string;
  footer: string;
}): Row[] {
  const rows: Row[] = [{ text: opts.shop, align: "center", bold: true }];
  rows.push({ text: `${opts.billNo}  ${opts.date}`, align: "center" });
  rows.push({ text: TICK });
  for (const l of opts.lines) rows.push({ text: `${l.qty}x ${l.name}` });
  rows.push({ text: TICK });
  rows.push({ text: `TOTAL  ${opts.total}`, bold: true });
  rows.push({ text: TICK });
  rows.push({ text: "Thank you", align: "center" });
  rows.push({ text: "Visit again", align: "center" });
  if (opts.footer) rows.push({ text: opts.footer, align: "center" });
  return rows;
}
