/**
 * Branded ORDO email templates. Table-safe, inline-styled (email clients strip
 * <style>), responsive at 480px. Every template keeps a plain-text fallback in
 * notify.ts for non-HTML clients.
 */
import { escapeHtml } from "./email-escape";

const ORANGE = "#c45c26";
const INK = "#1c1916";
const MUTED = "#6b635a";
const LINE = "#e6ddd2";
const PAPER = "#f4efe8";

function layout(title: string, inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PAPER};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
        <tr>
          <td style="background:${INK};padding:18px 24px;">
            <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:0.06em;">ORDO<span style="color:${ORANGE};"> OS</span></span>
            <div style="color:#c9c0b4;font-size:12px;margin-top:2px;">Restaurant operating system</div>
          </td>
        </tr>
        <tr><td style="padding:24px;">
          <h1 style="margin:0 0 12px;font-size:19px;color:${INK};line-height:1.3;">${title}</h1>
          ${inner}
        </td></tr>
        <tr>
          <td style="background:${PAPER};padding:14px 24px;color:${MUTED};font-size:12px;line-height:1.5;">
            Sent by ORDO OS · <a href="https://ordo.asfins.com" style="color:${ORANGE};text-decoration:none;">ordo.asfins.com</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:${MUTED};font-size:13px;width:130px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;color:${INK};font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px;"><tr>
    <td style="background:${ORANGE};border-radius:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 20px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr></table>`;
}

export function newOrderEmail(input: {
  restaurantName: string;
  orderNumber: number;
  serviceType: string;
  subtotal: number;
  total: number;
  currency: string;
  trackUrl: string;
}): string {
  const money = (n: number) => `${input.currency} ${n.toFixed(0)}`;
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${row("Order", `#${input.orderNumber}`)}
    ${row("Type", input.serviceType)}
    ${row("Subtotal", money(input.subtotal))}
    ${row("Total", money(input.total))}
  </table>`;
  return layout(
    `New order at ${escapeHtml(input.restaurantName)}`,
    table + button(input.trackUrl, "View live ticket"),
  );
}

export function adminWelcomeEmail(input: {
  restaurantName: string;
  restaurantCode: string;
  adminUsername: string;
  loginUrl: string;
}): string {
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${row("Restaurant", input.restaurantName)}
    ${row("Code", input.restaurantCode)}
    ${row("Username", input.adminUsername)}
  </table>
  <p style="margin:14px 0 0;color:${MUTED};font-size:13px;line-height:1.6;">Sign in with that code and username, then change your password from Settings.</p>`;
  return layout(`Welcome to ORDO`, table + button(input.loginUrl, "Open Staff login"));
}

export function leadEmail(input: {
  name: string;
  email: string;
  phone?: string;
  restaurantName?: string;
  planId?: string;
  message?: string;
  whatsapp?: string;
}): string {
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${row("Name", input.name)}
    ${row("Email", input.email)}
    ${input.phone ? row("Phone", input.phone) : ""}
    ${input.restaurantName ? row("Restaurant", input.restaurantName) : ""}
    ${input.planId ? row("Plan", input.planId) : ""}
  </table>
  ${input.message ? `<p style="margin:14px 0 0;padding:12px;background:${PAPER};border-radius:8px;color:${INK};font-size:13px;line-height:1.6;">${escapeHtml(input.message)}</p>` : ""}
  ${input.whatsapp ? `<p style="margin:14px 0 0;color:${MUTED};font-size:13px;">WhatsApp: ${escapeHtml(input.whatsapp)}</p>` : ""}`;
  return layout("New ORDO lead", table);
}
