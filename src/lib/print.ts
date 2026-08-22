import type { Order, TenantState } from "./tenant-types";
import { tryNativeThermalPrint } from "./thermal/nativePosPrint";

const SLIP_MM = 58;

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

function payLabel(method: string) {
  return method.replaceAll("_", " ");
}

function when(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
  };
}

function serviceLine(order: Order) {
  const bits: string[] = [order.serviceType];
  if (order.tableNumber) bits.push(`T${order.tableNumber}`);
  if (order.channel === "pos") bits.push("POS");
  return bits.join(" · ");
}

/** AsFix-style 58mm thermal slip — Courier, dashed rules, qty × rate, content-height page. */
const slipCss = `
@page { size: ${SLIP_MM}mm 120mm; margin: 0; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: ${SLIP_MM}mm !important;
  max-width: ${SLIP_MM}mm !important;
  background: #fff !important;
  color: #111 !important;
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slip {
  width: ${SLIP_MM}mm;
  max-width: ${SLIP_MM}mm;
  margin: 0;
  padding: 3mm 2.5mm 4mm;
  font-family: "Courier New", Courier, ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.32;
  color: #111;
  background: #fff;
}
.shop { text-align: center; margin-bottom: 4px; padding-top: 2px; }
.logo { display: block; width: 42%; max-width: 90px; height: auto; margin: 2px auto 4px; }
.name {
  display: block;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}
.shop p { margin: 2px 0; font-size: 10px; }
.rule { border: 0; border-top: 1px dashed #111; margin: 4px 0; }
.meta { display: grid; gap: 2px; margin: 4px 0; font-size: 10px; }
.cols { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; font-weight: 700; }
.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1px 6px;
  margin: 0 0 6px;
}
.item .title { grid-column: 1 / -1; overflow-wrap: anywhere; font-weight: 700; font-size: 12px; }
.item .qty { font-size: 11px; }
.item .sum { text-align: right; font-size: 11px; font-weight: 700; }
.item .mod { grid-column: 1 / -1; padding-left: 8px; font-size: 10px; }
.totals { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1px 8px; font-size: 11px; }
.totals strong { text-align: right; font-weight: 400; }
.grand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0 8px;
  align-items: baseline;
  margin: 4px 0 2px;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.grand b { text-align: right; letter-spacing: 0.05em; }
.center { text-align: center; margin: 6px 0 0; font-size: 10px; }
.thanks { text-align: center; margin: 8px 0 2px; font-size: 11px; font-weight: 700; }
.visit { text-align: center; margin: 4px 0 2px; font-size: 11px; }
.k-item { margin: 8px 0; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
`.trim();

function itemRows(order: Order, withPrices: boolean) {
  return order.lines
    .map((l) => {
      const mods = (l.modifiers || [])
        .map((m) => {
          const extra =
            withPrices && m.priceDelta
              ? ` (${m.priceDelta > 0 ? "+" : ""}${amount(m.priceDelta)})`
              : "";
          return `<div class="mod">+ ${escapeHtml(m.optionName)}${escapeHtml(extra)}</div>`;
        })
        .join("");
      const note = l.lineNote
        ? `<div class="mod">${withPrices ? "" : "NOTE: "}${escapeHtml(l.lineNote)}</div>`
        : "";
      if (!withPrices) {
        return `<div class="k-item">${l.qty}× ${escapeHtml(l.name)}${mods}${note}</div>`;
      }
      return `<div class="item">
        <span class="title">${escapeHtml(l.name)}</span>
        <span class="qty">${l.qty} x ${amount(l.unitPrice)}</span>
        <b class="sum">${amount(l.unitPrice * l.qty)}</b>
        ${mods}${note}
      </div>`;
    })
    .join("");
}

export function customerReceiptHtml(tenant: TenantState, order: Order) {
  const printLogo = tenant.shop.printLogoOnBill !== false;
  const logo =
    printLogo && tenant.branding.logoUrl
      ? `<img class="logo" src="${escapeHtml(tenant.branding.logoUrl)}" alt="" />`
      : "";
  const stamp = when(order.createdAt);
  const f = order.fees;
  const paid = order.paymentStatus === "paid" || order.paymentStatus === "verified";
  const extras = [
    f.packingFee ? `<span>Packing</span><strong>${amount(f.packingFee)}</strong>` : "",
    f.deliveryFee ? `<span>Delivery</span><strong>${amount(f.deliveryFee)}</strong>` : "",
    f.serviceCharge ? `<span>Service</span><strong>${amount(f.serviceCharge)}</strong>` : "",
    f.tax ? `<span>GST/Tax</span><strong>${amount(f.tax)}</strong>` : "",
    order.discount ? `<span>Discount</span><strong>-${amount(order.discount)}</strong>` : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=${SLIP_MM}, initial-scale=1"/>
<title>Bill #${order.number}</title>
<style>${slipCss}</style></head><body>
<main class="slip">
  <div class="shop">
    ${logo}
    <strong class="name">${escapeHtml(tenant.branding.name)}</strong>
    ${tenant.shop.address ? `<p>${escapeHtml(tenant.shop.address)}</p>` : ""}
    ${tenant.shop.phone ? `<p>${escapeHtml(tenant.shop.phone)}</p>` : ""}
  </div>
  <hr class="rule"/>
  <div class="meta">
    <span>Bill: #${order.number}</span>
    <span>Date: ${escapeHtml(stamp.date)}</span>
    <span>Time: ${escapeHtml(stamp.time)}</span>
    <span>Type: ${escapeHtml(serviceLine(order))}</span>
    <span>Pay: ${escapeHtml(payLabel(order.paymentMethod))}${paid ? " \u2713 PAID" : ""}</span>
    ${order.customerName ? `<span>Guest: ${escapeHtml(order.customerName)}</span>` : ""}
    ${order.customerPhone ? `<span>Phone: ${escapeHtml(order.customerPhone)}</span>` : ""}
  </div>
  <hr class="rule"/>
  <div class="cols"><span>Item</span><span>Amount</span></div>
  ${itemRows(order, true) || `<div class="item"><span class="title">No items</span></div>`}
  <hr class="rule"/>
  <div class="totals">
    <span>Subtotal</span><strong>${amount(f.subtotal)}</strong>
    ${extras}
  </div>
  <div class="grand"><span>TOTAL</span><b>${escapeHtml(tenant.shop.currency)} ${amount(order.total)}</b></div>
  <p class="center">${escapeHtml(payLabel(order.paymentMethod))} · ${escapeHtml(order.paymentStatus)}${paid ? " · \u2713 PAID" : ""}</p>
  ${order.note ? `<p class="k-item">NOTE: ${escapeHtml(order.note)}</p>` : ""}
  <hr class="rule"/>
  <p class="thanks">Thank you</p>
  <p class="visit">Visit again</p>
  ${tenant.branding.receiptFooter ? `<p class="center">${escapeHtml(tenant.branding.receiptFooter)}</p>` : ""}
  ${tenant.shop.phone ? `<p class="center">${escapeHtml(tenant.shop.phone)}</p>` : ""}
</main>
</body></html>`;
}

export function kitchenTicketHtml(tenant: TenantState, order: Order) {
  const stamp = when(order.createdAt);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Kitchen #${order.number}</title>
<style>${slipCss}</style></head><body>
<main class="slip">
  <div class="shop">
    <strong class="name">KITCHEN</strong>
    <p>${escapeHtml(tenant.branding.name)}</p>
  </div>
  <hr class="rule"/>
  <div class="meta">
    <span>Ticket: #${order.number}</span>
    <span>Time: ${escapeHtml(stamp.time)}</span>
    <span>Type: ${escapeHtml(serviceLine(order))}</span>
    ${order.customerName ? `<span>Guest: ${escapeHtml(order.customerName)}</span>` : ""}
    ${order.customerPhone ? `<span>Phone: ${escapeHtml(order.customerPhone)}</span>` : ""}
  </div>
  <hr class="rule"/>
  ${itemRows(order, false)}
  ${order.note ? `<p class="k-item">NOTE: ${escapeHtml(order.note)}</p>` : ""}
  <hr class="rule"/>
  <p class="center">Prices hidden</p>
</main>
</body></html>`;
}

/** 32-col plain text for a future native ESC/POS plugin — public spec, no vendor secrets. */
export function customerReceiptText(tenant: TenantState, order: Order) {
  const col = 32;
  const line = (left: string, right: string) => {
    const gap = Math.max(1, col - left.length - right.length);
    return `${left}${" ".repeat(gap)}${right}`;
  };
  const rule = "-".repeat(col);
  const stamp = when(order.createdAt);
  const f = order.fees;
  const items = order.lines.flatMap((l) => {
    const rows = [l.name.slice(0, col), line(`${l.qty} x ${amount(l.unitPrice)}`, amount(l.unitPrice * l.qty))];
    for (const m of l.modifiers || []) rows.push(` + ${m.optionName}`.slice(0, col));
    if (l.lineNote) rows.push(` ${l.lineNote}`.slice(0, col));
    return rows;
  });
  const extras = [
    f.packingFee ? line("Packing", amount(f.packingFee)) : "",
    f.deliveryFee ? line("Delivery", amount(f.deliveryFee)) : "",
    f.serviceCharge ? line("Service", amount(f.serviceCharge)) : "",
    f.tax ? line("GST/Tax", amount(f.tax)) : "",
    order.discount ? line("Discount", `-${amount(order.discount)}`) : "",
  ].filter(Boolean);
  const paid = order.paymentStatus === "paid" || order.paymentStatus === "verified";
  return [
    tenant.branding.name.toUpperCase(),
    tenant.shop.address,
    tenant.shop.phone,
    rule,
    line("Bill", `#${order.number}`),
    line(stamp.date, stamp.time),
    serviceLine(order),
    payLabel(order.paymentMethod),
    ...(order.customerName ? [`Guest: ${order.customerName}`] : []),
    ...(order.customerPhone ? [`Phone: ${order.customerPhone}`] : []),
    rule,
    ...items,
    rule,
    line("Subtotal", amount(f.subtotal)),
    ...extras,
    line("TOTAL", `${tenant.shop.currency} ${amount(order.total)}`),
    ...(paid ? ["\u2713 PAID"] : []),
    ...(order.note ? [`NOTE: ${order.note}`] : []),
    rule,
    "Thank you",
    "Visit again",
    tenant.branding.receiptFooter,
    tenant.shop.phone,
  ]
    .filter((row) => row && String(row).trim())
    .join("\n");
}

/** Kitchen ticket plain text for Bluetooth ESC/POS. */
export function kitchenTicketText(tenant: TenantState, order: Order) {
  const col = 32;
  const rule = "=".repeat(col);
  const stamp = when(order.createdAt);
  const items = order.lines.flatMap((l) => {
    const rows = [`${l.qty} x ${l.name}`.slice(0, col)];
    for (const m of l.modifiers || []) rows.push(`  + ${m.optionName}`.slice(0, col));
    if (l.lineNote) rows.push(`  ${l.lineNote}`.slice(0, col));
    return rows;
  });
  return [
    "KITCHEN",
    tenant.branding.name.toUpperCase(),
    rule,
    `#${order.number}  ${stamp.time}`,
    serviceLine(order),
    rule,
    ...items,
    rule,
    order.note ? `NOTE: ${order.note}` : "",
  ]
    .filter((row) => row && String(row).trim())
    .join("\n");
}

function lockPageToContent(doc: Document, widthMm = SLIP_MM) {
  const root = (doc.querySelector(".slip") as HTMLElement | null) || doc.body;
  const px = Math.max(root.scrollHeight, root.offsetHeight, 1);
  const heightMm = Math.max(48, Math.min(420, Math.ceil(px / 3.78) + 6));
  const style = doc.createElement("style");
  style.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
  doc.head.appendChild(style);
}

/**
 * Isolated iframe print — 58mm HTML layout. No Windows kernel driver.
 * Optional local COM bridge (127.0.0.1:9100) only if staff opted in via localStorage.
 */
export function printHtml(html: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const existing = document.getElementById("ordo-thermal-print");
    existing?.remove();
    const iframe = document.createElement("iframe");
    iframe.id = "ordo-thermal-print";
    iframe.title = "58mm receipt";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;width:58mm;height:900px;border:0;left:-9999px;top:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      resolve(false);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    win.addEventListener("afterprint", () => finish(true), { once: true });

    const trigger = () => {
      if (done) return;
      try {
        lockPageToContent(doc);
        win.focus();
        win.print();
        /* Chrome print() is typically blocking until the dialog closes. */
        finish(true);
      } catch {
        finish(false);
      }
    };

    const images = Array.from(doc.images || []);
    if (!images.length) {
      window.setTimeout(trigger, 40);
      return;
    }
    let pending = images.length;
    const onReady = () => {
      pending -= 1;
      if (pending <= 0) window.setTimeout(trigger, 30);
    };
    images.forEach((img) => {
      if (img.complete) onReady();
      else {
        img.addEventListener("load", onReady, { once: true });
        img.addEventListener("error", onReady, { once: true });
      }
    });
    window.setTimeout(trigger, 900);
  });
}

async function tryOptInBridge(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("ordo_thermal_bridge") !== "1") return false;
  } catch {
    return false;
  }
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 600);
  try {
    const res = await fetch("http://127.0.0.1:9100/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return Boolean(res.ok && data.ok);
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function printCustomerReceipt(tenant: TenantState, order: Order) {
  try {
    sessionStorage.setItem("ordo_last_bill_order_id", order.id);
  } catch {
    /* ignore */
  }
  const text = customerReceiptText(tenant, order);
  const native = await tryNativeThermalPrint(text);
  if (native.ok) return true;
  const bridged = await tryOptInBridge(text);
  if (bridged) return true;
  return printHtml(customerReceiptHtml(tenant, order));
}

export async function printTestSlip(tenant: TenantState) {
  const name = tenant.branding.name || "ORDO";
  const when = new Date().toLocaleString("en-PK");
  const text = `${name}\nTEST PRINT\n${when}\nPrinter OK\n\n\n`;
  const native = await tryNativeThermalPrint(text);
  if (native.ok) return true;
  const html = `<!doctype html><html><body style="font-family:monospace;width:58mm;padding:8px"><strong>${escapeHtml(name)}</strong><p>TEST PRINT</p><p>${escapeHtml(when)}</p><p>Printer OK</p></body></html>`;
  return printHtml(html);
}

export async function printKitchenTicket(tenant: TenantState, order: Order) {
  const text = kitchenTicketText(tenant, order);
  const native = await tryNativeThermalPrint(text);
  if (native.ok) return true;
  return printHtml(kitchenTicketHtml(tenant, order));
}

/** @deprecated popup path — kept for any leftover callers */
export function openPrintWindow(html: string) {
  void printHtml(html);
}
