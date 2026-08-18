import type { Order, TenantState } from "./tenant-types";

export function customerReceiptHtml(tenant: TenantState, order: Order) {
  const logo = tenant.branding.logoUrl
    ? `<img src="${tenant.branding.logoUrl}" alt="" style="max-width:72px;display:block;margin:0 auto 8px"/>`
    : "";
  const mods = (line: Order["lines"][0]) =>
    (line.modifiers || [])
      .map((m) => `<div style="padding-left:12px;font-size:12px;color:#444">+ ${m.optionName}${m.priceDelta ? ` (${m.priceDelta})` : ""}</div>`)
      .join("");
  const lines = order.lines
    .map(
      (l) =>
        `<div style="margin:4px 0"><div style="display:flex;justify-content:space-between"><span>${l.qty}× ${l.name}</span><span>${l.unitPrice * l.qty}</span></div>${mods(l)}${l.lineNote ? `<div style="padding-left:12px;font-size:12px">${l.lineNote}</div>` : ""}</div>`,
    )
    .join("");
  const f = order.fees;
  return `<!doctype html><html><head><title>Bill #${order.number}</title>
  <style>body{font-family:ui-monospace,Menlo,monospace;padding:16px;max-width:320px;margin:0 auto} h1{font-size:16px;text-align:center;margin:4px 0} .muted{color:#666;font-size:12px;text-align:center}</style></head><body>
  ${logo}
  <h1>${tenant.branding.name}</h1>
  <p class="muted">Customer bill · #${order.number}</p>
  <hr/>
  ${lines}
  <hr/>
  <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${f.subtotal}</span></div>
  ${f.packingFee ? `<div style="display:flex;justify-content:space-between"><span>Packing</span><span>${f.packingFee}</span></div>` : ""}
  ${f.deliveryFee ? `<div style="display:flex;justify-content:space-between"><span>Delivery</span><span>${f.deliveryFee}</span></div>` : ""}
  ${f.serviceCharge ? `<div style="display:flex;justify-content:space-between"><span>Service</span><span>${f.serviceCharge}</span></div>` : ""}
  ${f.tax ? `<div style="display:flex;justify-content:space-between"><span>GST/Tax</span><span>${f.tax}</span></div>` : ""}
  <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px"><span>Total</span><span>${order.total}</span></div>
  <p class="muted">${order.paymentMethod} · ${order.paymentStatus}</p>
  <p class="muted">${tenant.branding.receiptFooter}</p>
  <script>window.print()</script>
  </body></html>`;
}

export function kitchenTicketHtml(tenant: TenantState, order: Order) {
  const mods = (line: Order["lines"][0]) =>
    (line.modifiers || [])
      .map((m) => `<div style="padding-left:10px">· ${m.optionName}</div>`)
      .join("");
  const lines = order.lines
    .map(
      (l) =>
        `<div style="margin:8px 0;font-size:18px;font-weight:700">${l.qty}× ${l.name}${mods(l)}${l.lineNote ? `<div style="font-size:14px;font-weight:500">NOTE: ${l.lineNote}</div>` : ""}</div>`,
    )
    .join("");
  return `<!doctype html><html><head><title>Kitchen #${order.number}</title>
  <style>body{font-family:Arial,sans-serif;padding:14px;max-width:360px;margin:0 auto} h1{margin:0}</style></head><body>
  <h1>KITCHEN · #${order.number}</h1>
  <p>${tenant.branding.name} · ${order.serviceType}${order.tableNumber ? ` · Table ${order.tableNumber}` : ""}</p>
  <hr/>
  ${lines}
  ${order.note ? `<p><strong>Order note:</strong> ${order.note}</p>` : ""}
  <p style="font-size:12px;color:#666">Prices hidden on kitchen ticket</p>
  <script>window.print()</script>
  </body></html>`;
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
