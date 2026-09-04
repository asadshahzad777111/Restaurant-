/** Shared HTML + ESC/POS text for a tenant bill layout. Preview uses the same renderer as print. */

import type { Order, TenantState } from "./tenant-types";
import {
  BILL_LOGO_MARK,
  BILL_QR_MARK,
  blockAlign,
  dotsToMm,
  paperColsFor,
  paperDotsFor,
  resolveBillLayout,
  type BillAlign,
  type BillLayout,
} from "./bill-layout";
import { qrPrintImgMarkup } from "./qr-byte";
import { sameOriginLogoUrl } from "./receipt-logo";
import {
  billKindLine,
  billStamp,
  customReceiptFooter,
  guestOrderPageUrl,
  printableShopAddress,
  printableShopPhone,
  printedGrandTotal,
  RECEIPT_QR_CAPTION,
  receiptLogoUrl,
  shouldPrintGst,
} from "./receipt-layout";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function amount(n: number) {
  return Math.round(Number(n) || 0).toLocaleString("en-PK");
}

function wrapAlign(html: string, align: BillAlign) {
  const cls = align === "center" ? "al-c" : "al-l";
  return `<div class="${cls}">${html}</div>`;
}

function textPrefix(align: BillAlign, big = false) {
  if (big) return "^B";
  if (align === "center") return "^C";
  return "";
}

function itemHtml(order: Order) {
  const rows = (order.lines || [])
    .map((l) => {
      const mods = (l.modifiers || [])
        .map((m) => {
          const extra = m.priceDelta ? ` (${m.priceDelta > 0 ? "+" : ""}${amount(m.priceDelta)})` : "";
          return `<div class="mod">+ ${escapeHtml(m.optionName)}${escapeHtml(extra)}</div>`;
        })
        .join("");
      const note = l.lineNote ? `<div class="mod">${escapeHtml(l.lineNote)}</div>` : "";
      return `<div class="item">
        <span class="title">${escapeHtml(l.name)}</span>
        <span class="qty">${l.qty} x ${amount(l.unitPrice)}</span>
        <b class="sum">${amount(l.unitPrice * l.qty)}</b>
        ${mods}${note}
      </div>`;
    })
    .join("");
  return `${rows || `<div class="item"><span class="title">No items</span></div>`}`;
}

function itemText(order: Order, col: number, line: (a: string, b: string) => string) {
  return (order.lines || []).flatMap((l) => {
    const rows = [l.name.slice(0, col), line(`${l.qty} x ${amount(l.unitPrice)}`, amount(l.unitPrice * l.qty))];
    for (const m of l.modifiers || []) rows.push(` + ${m.optionName}`.slice(0, col));
    if (l.lineNote) rows.push(` ${l.lineNote}`.slice(0, col));
    return rows;
  });
}

export function slipCssFor(layout: BillLayout) {
  const mm = layout.paperMm;
  const logoMm = dotsToMm(layout.logoDots);
  const qrMm = dotsToMm(layout.qrDots);
  const namePx = Math.round(14 * (layout.headerScale / 100));
  return `
@page { size: ${mm}mm 120mm; margin: 0; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: ${mm}mm !important;
  max-width: ${mm}mm !important;
  background: #fff !important;
  color: #111 !important;
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slip {
  width: ${mm}mm;
  max-width: ${mm}mm;
  margin: 0;
  padding: 6mm 2mm 8mm;
  font-family: "Courier New", Courier, ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.22;
  color: #111;
  background: #fff;
}
.al-c { text-align: center; }
.al-l { text-align: left; }
.logo {
  display: block;
  width: ${logoMm}mm;
  max-width: ${logoMm}mm;
  height: ${logoMm}mm;
  max-height: ${logoMm}mm;
  margin: 0 auto 3px;
  object-fit: contain;
  object-position: center;
}
.name {
  display: block;
  font-size: ${namePx}px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.shop p { margin: 1px 0; font-size: 9px; }
.rule { border: 0; border-top: 1px dashed #111; margin: 3px 0; }
.meta { display: grid; gap: 1px; margin: 3px 0; font-size: 9.5px; }
.cols { display: flex; justify-content: space-between; gap: 8px; font-size: 9.5px; font-weight: 700; }
.qr { text-align: center; margin: 4px 0 4mm; }
.qr svg, .qr .qr-img { width: ${qrMm}mm; height: ${qrMm}mm; display: block; margin: 0 auto; image-rendering: pixelated; }
.qr-cap { text-align: center; margin: 2px 0 0; font-size: 9px; font-weight: 700; }
.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0 6px;
  margin: 0 0 4px;
}
.item .title { grid-column: 1 / -1; overflow-wrap: anywhere; font-weight: 700; font-size: 10px; }
.item .qty { font-size: 9.5px; }
.item .sum { text-align: right; font-size: 9.5px; font-weight: 700; }
.item .mod { grid-column: 1 / -1; padding-left: 7px; font-size: 9px; }
.totals { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 8px; font-size: 10px; }
.totals strong { text-align: right; font-weight: 400; }
.grand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0 8px;
  align-items: baseline;
  margin: 3px 0 1px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.grand b { text-align: right; letter-spacing: 0.05em; }
.center { text-align: center; margin: 4px 0 0; font-size: 9px; }
.thanks { margin: 5px 0 1px; font-size: 11px; font-weight: 700; }
.visit { margin: 2px 0 1px; font-size: 11px; }
.k-item { margin: 6px 0; font-size: 13px; font-weight: 700; overflow-wrap: anywhere; }
`.trim();
}

function walkBlocks(
  tenant: TenantState,
  order: Order,
  layout: BillLayout,
): { html: string[]; text: string[] } {
  const html: string[] = [];
  const text: string[] = [];
  const col = paperColsFor(layout.paperMm);
  const line = (left: string, right: string) => {
    const gap = Math.max(1, col - left.length - right.length);
    return `${left}${" ".repeat(gap)}${right}`;
  };
  const rule = "-".repeat(col);
  const stamp = billStamp(order.createdAt);
  const f = order.fees;
  const phone = printableShopPhone(tenant.shop.phone);
  const address = printableShopAddress(tenant.shop.address);
  const printGst = shouldPrintGst(tenant.shop);
  const brandingFooter = customReceiptFooter(tenant.branding.receiptFooter);
  const extra = String(layout.extraFooter || "").trim();
  const footerBits = [brandingFooter, extra].filter(Boolean).join("\n");
  const logoSrc = receiptLogoUrl(tenant);
  const qrUrl = guestOrderPageUrl(tenant.code);
  const showQr = tenant.branding.scanOrderQr !== false;
  const bigName = layout.headerScale >= 115;

  const push = (h: string, t: string | string[], align: BillAlign = "left") => {
    if (h) html.push(h);
    const rows = Array.isArray(t) ? t : [t];
    for (const row of rows) {
      if (row === BILL_LOGO_MARK || row === BILL_QR_MARK) {
        text.push(row);
        continue;
      }
      if (!String(row).trim()) continue;
      text.push(`${textPrefix(align, false)}${row}`);
    }
  };

  for (const block of layout.blocks) {
    if (!block.on) continue;
    const id = block.id;
    const align = blockAlign(layout, id);
    switch (id) {
      case "logo": {
        if (!logoSrc) break;
        html.push(
          `<img class="logo" src="${escapeHtml(sameOriginLogoUrl(logoSrc))}" alt="" />`,
        );
        text.push(BILL_LOGO_MARK);
        break;
      }
      case "shopName": {
        html.push(wrapAlign(`<strong class="name">${escapeHtml(tenant.branding.name)}</strong>`, align));
        text.push(`${textPrefix(align, bigName)}${tenant.branding.name.toUpperCase()}`);
        break;
      }
      case "address": {
        if (!address) break;
        html.push(wrapAlign(`<p>${escapeHtml(address)}</p>`, align));
        push("", address, align);
        break;
      }
      case "phone": {
        if (!phone) break;
        html.push(wrapAlign(`<p>${escapeHtml(phone)}</p>`, align));
        push("", phone, align);
        break;
      }
      case "divider1":
      case "divider2":
      case "divider3":
        html.push(`<hr class="rule"/>`);
        text.push(rule);
        break;
      case "billMeta":
        html.push(
          wrapAlign(
            `<div class="meta"><div class="cols"><span>Bill #${order.number}</span><span>${escapeHtml(stamp.line)}</span></div></div>`,
            align,
          ),
        );
        text.push(`${textPrefix(align)}${line(`Bill #${order.number}`, stamp.line)}`);
        break;
      case "payment":
        html.push(wrapAlign(`<div class="meta"><span>${escapeHtml(billKindLine(order))}</span></div>`, align));
        push("", billKindLine(order), align);
        break;
      case "guest": {
        const bits: string[] = [];
        if (order.customerName) bits.push(`Guest: ${order.customerName}`);
        if (order.customerPhone) bits.push(`Ph: ${order.customerPhone}`);
        if (order.deliveryAddress) bits.push(`Loc: ${order.deliveryAddress}`);
        if (!bits.length) break;
        html.push(wrapAlign(`<div class="meta">${bits.map((b) => `<span>${escapeHtml(b)}</span>`).join("")}</div>`, align));
        for (const b of bits) push("", b, align);
        break;
      }
      case "items":
        html.push(`<div class="cols"><span>Item</span><span>Total</span></div>${itemHtml(order)}`);
        text.push(...itemText(order, col, line));
        break;
      case "packing": {
        if (!f?.packingFee) break;
        html.push(wrapAlign(`<div class="cols"><span>Packing</span><strong>${amount(f.packingFee)}</strong></div>`, align));
        text.push(`${textPrefix(align)}${line("Packing", amount(f.packingFee))}`);
        break;
      }
      case "delivery": {
        if (!f?.deliveryFee) break;
        html.push(wrapAlign(`<div class="cols"><span>Delivery</span><strong>${amount(f.deliveryFee)}</strong></div>`, align));
        text.push(`${textPrefix(align)}${line("Delivery", amount(f.deliveryFee))}`);
        break;
      }
      case "service": {
        if (!f?.serviceCharge) break;
        html.push(wrapAlign(`<div class="cols"><span>Service</span><strong>${amount(f.serviceCharge)}</strong></div>`, align));
        text.push(`${textPrefix(align)}${line("Service", amount(f.serviceCharge))}`);
        break;
      }
      case "discount": {
        if (!order.discount) break;
        html.push(wrapAlign(`<div class="cols"><span>Discount</span><strong>-${amount(order.discount)}</strong></div>`, align));
        text.push(`${textPrefix(align)}${line("Discount", `-${amount(order.discount)}`)}`);
        break;
      }
      case "gst": {
        if (!printGst || !f?.tax) break;
        html.push(wrapAlign(`<div class="cols"><span>GST/Tax</span><strong>${amount(f.tax)}</strong></div>`, align));
        text.push(`${textPrefix(align)}${line("GST/Tax", amount(f.tax))}`);
        break;
      }
      case "total":
        html.push(
          wrapAlign(
            `<div class="grand"><span>TOTAL</span><b>${escapeHtml(tenant.shop.currency)} ${amount(printedGrandTotal(order, printGst))}</b></div>`,
            align,
          ),
        );
        text.push(
          `${textPrefix(align)}${line("TOTAL", `${tenant.shop.currency} ${amount(printedGrandTotal(order, printGst))}`)}`,
        );
        break;
      case "note": {
        if (!order.note) break;
        html.push(wrapAlign(`<p class="center">NOTE: ${escapeHtml(order.note)}</p>`, align));
        push("", `NOTE: ${order.note}`, align);
        break;
      }
      case "thankYou":
        html.push(wrapAlign(`<p class="thanks">Thank you</p>`, align));
        push("", "Thank you", align);
        break;
      case "visitAgain":
        html.push(wrapAlign(`<p class="visit">Visit again</p>`, align));
        push("", "Visit again", align);
        break;
      case "customFooter": {
        if (!footerBits) break;
        html.push(wrapAlign(`<p class="center">${escapeHtml(footerBits).replace(/\n/g, "<br/>")}</p>`, align));
        for (const row of footerBits.split("\n")) push("", row, align);
        break;
      }
      case "qr": {
        if (!showQr) break;
        html.push(`<div class="qr">${qrPrintImgMarkup(qrUrl, dotsToMm(layout.qrDots), paperDotsFor(layout.paperMm))}</div>`);
        text.push(BILL_QR_MARK);
        break;
      }
      case "qrCaption": {
        if (!showQr) break;
        html.push(
          wrapAlign(
            `<p class="qr-cap">${escapeHtml(RECEIPT_QR_CAPTION[0])}</p><p class="qr-cap">${escapeHtml(RECEIPT_QR_CAPTION[1])}</p>`,
            "center",
          ),
        );
        text.push(`${textPrefix("center")}${RECEIPT_QR_CAPTION[0]}`);
        text.push(`${textPrefix("center")}${RECEIPT_QR_CAPTION[1]}`);
        break;
      }
      default:
        break;
    }
  }
  return { html, text };
}

export function customerBillHtml(tenant: TenantState, order: Order, draft?: BillLayout) {
  const layout = draft || resolveBillLayout(tenant.shop);
  const { html } = walkBlocks(tenant, order, layout);
  const mm = layout.paperMm;
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=${mm}, initial-scale=1"/>
<title>Bill #${order.number}</title>
<style>${slipCssFor(layout)}</style></head><body>
<main class="slip">
${html.join("\n")}
</main>
</body></html>`;
}

export function customerBillText(tenant: TenantState, order: Order, draft?: BillLayout) {
  const layout = draft || resolveBillLayout(tenant.shop);
  const { text } = walkBlocks(tenant, order, layout);
  const body = text.filter((row) => row && String(row).trim()).join("\n");
  return `\n\n\n${body}\n\n`;
}

export function sampleBillOrder(tenant: TenantState): Order {
  const packing = Number(tenant.shop.packingFee) || 20;
  const printGst = shouldPrintGst(tenant.shop);
  const tax = printGst ? 35 : 0;
  return {
    id: "layout_preview",
    number: 1060,
    channel: "pos",
    serviceType: "counter",
    customerName: "Ali",
    customerPhone: "03001234567",
    lines: [{ itemId: "preview", name: "House Salad", qty: 1, unitPrice: 350 }],
    note: "No onions",
    paymentMethod: "cash",
    paymentStatus: "paid",
    status: "completed",
    statusHistory: [],
    trackToken: "preview",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fees: {
      subtotal: 350,
      deliveryFee: 0,
      packingFee: packing,
      serviceCharge: 0,
      tax,
    },
    subtotal: 350,
    total: 350 + packing + tax,
  };
}
