/**
 * ESC/POS command builder for a 58mm thermal printer (public command set only).
 * Pure JS -> bytes; the native BLE/USB transport sends them. No vendor SDK.
 */

type Row = { text: string; align?: "left" | "center"; bold?: boolean };

const INIT = Buffer.from([0x1b, 0x40]); // ESC @
const ALIGN = (n: number) => Buffer.from([0x1b, 0x61, n]); // ESC a n
const BOLD = (n: number) => Buffer.from([0x1b, 0x45, n]); // ESC E n
const LF = Buffer.from([0x0a]);
const CUT = Buffer.from([0x1d, 0x56, 0x00]); // GS V 0
const KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]); // cash drawer pulse (optional)

const WIDTH = 32;
const TICK = "-";

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
export function buildReceiptEscPos(lines: Row[], opts: { cut?: boolean; cashDrawer?: boolean } = {}): Buffer {
  const parts: Buffer[] = [INIT, ALIGN(0)];
  for (const row of lines) {
    if (row.text === TICK) {
      parts.push(ALIGN(0), BOLD(0), Buffer.from(TICK.repeat(WIDTH), "utf8"), LF);
      continue;
    }
    parts.push(ALIGN(row.align === "center" ? 1 : row.align === "right" ? 2 : 0));
    parts.push(BOLD(row.bold ? 1 : 0));
    parts.push(Buffer.from(padRow(row), "utf8"), LF);
  }
  // Feeds for the tear + optional cash drawer + cut.
  parts.push(LF, LF);
  if (opts.cashDrawer) parts.push(KICK);
  if (opts.cut) parts.push(CUT);
  return Buffer.concat(parts);
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
