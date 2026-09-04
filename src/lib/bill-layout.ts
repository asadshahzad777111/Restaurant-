/** Per-kitchen 58/80mm bill layout. Super restaurants never share this JSON. */

export const BILL_LOGO_MARK = "<<ORDO_LOGO>>";
export const BILL_QR_MARK = "<<ORDO_QR>>";

export type BillPaperMm = 58 | 80;

export const BILL_BLOCK_IDS = [
  "logo",
  "shopName",
  "address",
  "phone",
  "divider1",
  "billMeta",
  "payment",
  "guest",
  "divider2",
  "items",
  "packing",
  "delivery",
  "service",
  "discount",
  "gst",
  "total",
  "note",
  "divider3",
  "thankYou",
  "visitAgain",
  "customFooter",
  "qr",
  "qrCaption",
] as const;

export type BillBlockId = (typeof BILL_BLOCK_IDS)[number];

export type BillAlign = "left" | "center";

export type BillBlock = { id: BillBlockId; on: boolean; align: BillAlign };

export type BillLayout = {
  paperMm: BillPaperMm;
  /** Contain-box (square) in thermal dots. Default 320 on 58mm (~40mm, readable circle). */
  logoDots: number;
  /** Target QR raster size in dots. Default 240. */
  qrDots: number;
  /** Shop-name size 80–140 (100 = current). */
  headerScale: number;
  /** Extra lines printed in the custom-footer block (in addition to branding.receiptFooter). */
  extraFooter: string;
  blocks: BillBlock[];
};

const CENTER_DEFAULT: Set<BillBlockId> = new Set([
  "logo",
  "shopName",
  "address",
  "phone",
  "thankYou",
  "visitAgain",
  "customFooter",
  "qr",
  "qrCaption",
]);

export function defaultAlignFor(id: BillBlockId): BillAlign {
  return CENTER_DEFAULT.has(id) ? "center" : "left";
}

/** Logo and QR stay centered on the slip even if a block align was edited. */
export function graphicIsCentered(id: BillBlockId): boolean {
  return id === "logo" || id === "qr";
}

export const BILL_BLOCK_LABEL: Record<BillBlockId, string> = {
  logo: "Logo",
  shopName: "Shop name",
  address: "Address / city",
  phone: "Shop phone",
  divider1: "Line (header)",
  billMeta: "Bill # + date/time",
  payment: "Payment · counter",
  guest: "Guest name / phone",
  divider2: "Line (items)",
  items: "Items",
  packing: "Packing",
  delivery: "Delivery",
  service: "Service",
  discount: "Discount",
  gst: "GST / tax",
  total: "TOTAL",
  note: "Note",
  divider3: "Line (footer)",
  thankYou: "Thank you",
  visitAgain: "Visit again",
  customFooter: "Custom footer",
  qr: "QR / scanner",
  qrCaption: "Scan to order captions",
};

export function defaultBillBlocks(): BillBlock[] {
  return BILL_BLOCK_IDS.map((id) => ({ id, on: true, align: defaultAlignFor(id) }));
}

/** Factory layout — one-click restore. Logo ~320 dots so circular marks are readable. */
export function defaultBillLayout(paperMm: BillPaperMm = 58): BillLayout {
  return {
    paperMm,
    logoDots: 320,
    qrDots: 240,
    headerScale: 100,
    extraFooter: "",
    blocks: defaultBillBlocks(),
  };
}

export function paperDotsFor(mm: BillPaperMm): number {
  return mm === 80 ? 576 : 384;
}

export function paperColsFor(mm: BillPaperMm): number {
  return mm === 80 ? 48 : 32;
}

/** ~203 dpi: 8 dots ≈ 1mm. */
export function dotsToMm(dots: number): number {
  return Math.max(8, Math.round((Number(dots) || 0) / 8));
}

export function logoDotsRange(paperMm: BillPaperMm): { min: number; max: number } {
  const paper = paperDotsFor(paperMm);
  return { min: 120, max: Math.max(160, paper - 24) };
}

export function qrDotsRange(paperMm: BillPaperMm): { min: number; max: number } {
  const paper = paperDotsFor(paperMm);
  return { min: 120, max: Math.max(160, paper - 16) };
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

export function sanitizeBillLayout(raw?: unknown, paperHint?: BillPaperMm): BillLayout {
  const src = raw && typeof raw === "object" ? (raw as Partial<BillLayout>) : {};
  const paperMm: BillPaperMm = src.paperMm === 80 ? 80 : 58;
  const paper = paperHint || paperMm;
  const logoR = logoDotsRange(paper);
  const qrR = qrDotsRange(paper);
  const fallback = defaultBillLayout(paper);
  const seen = new Set<BillBlockId>();
  const blocks: BillBlock[] = [];
  const incoming = Array.isArray(src.blocks) ? src.blocks : [];
  for (const row of incoming) {
    const id = typeof row?.id === "string" ? (row.id as BillBlockId) : null;
    if (!id || !BILL_BLOCK_IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    const align: BillAlign = row.align === "left" || row.align === "center" ? row.align : defaultAlignFor(id);
    blocks.push({ id, on: row.on !== false, align: graphicIsCentered(id) ? "center" : align });
  }
  for (const id of BILL_BLOCK_IDS) {
    if (seen.has(id)) continue;
    blocks.push({ id, on: true, align: defaultAlignFor(id) });
  }
  return {
    paperMm: paper,
    logoDots: clampInt(src.logoDots, logoR.min, logoR.max, fallback.logoDots),
    qrDots: clampInt(src.qrDots, qrR.min, qrR.max, fallback.qrDots),
    headerScale: clampInt(src.headerScale, 80, 140, 100),
    extraFooter: String(src.extraFooter || "").slice(0, 400),
    blocks,
  };
}

export function resolveBillLayout(shop?: { billLayout?: unknown } | null): BillLayout {
  return sanitizeBillLayout(shop?.billLayout);
}

export function moveBillBlock(blocks: BillBlock[], index: number, dir: -1 | 1): BillBlock[] {
  const next = blocks.slice();
  const j = index + dir;
  if (index < 0 || j < 0 || index >= next.length || j >= next.length) return next;
  const tmp = next[index];
  next[index] = next[j];
  next[j] = tmp;
  return next;
}

export function isBillBlockOn(layout: BillLayout, id: BillBlockId): boolean {
  const row = layout.blocks.find((b) => b.id === id);
  return row ? row.on !== false : true;
}

export function blockAlign(layout: BillLayout, id: BillBlockId): BillAlign {
  if (graphicIsCentered(id)) return "center";
  const row = layout.blocks.find((b) => b.id === id);
  if (row?.align === "left" || row?.align === "center") return row.align;
  return defaultAlignFor(id);
}
