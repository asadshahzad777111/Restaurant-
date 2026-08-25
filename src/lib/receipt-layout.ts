import type { Order, TenantState } from "./tenant-types";
import { LIVE_APP_HOST } from "./urls";

/** Seed / demo numbers that must never print on a real 58mm slip. */
const PLACEHOLDER_DIGIT_SET = new Set([
  "3000000000",
  "03000000000",
  "923000000000",
  "92300000000",
  "0000000000",
  "00000000000",
]);

export function isPlaceholderPhone(phone?: string | null): boolean {
  const raw = String(phone || "").trim();
  if (!raw) return true;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return true;
  if (PLACEHOLDER_DIGIT_SET.has(digits)) return true;
  const core = digits.replace(/^0+/, "").replace(/^92/, "").replace(/^0+/, "");
  if (!core) return true;
  if (core === "3000000000") return true;
  if (/^3000+$/.test(core) && core.length >= 10) return true;
  return false;
}

/** Settings phone for the slip header — empty when missing or placeholder. */
export function printableShopPhone(phone?: string | null): string {
  const raw = String(phone || "").trim();
  if (isPlaceholderPhone(raw)) return "";
  return raw;
}

export function printableShopAddress(address?: string | null): string {
  return String(address || "").trim();
}

/** Auto “Thank you for dining with …” wraps on 58mm and duplicates Thank you / Visit again. */
export function isGenericReceiptFooter(footer?: string | null): boolean {
  const f = String(footer || "").trim();
  if (!f) return true;
  if (/demo\s*restaurant/i.test(f)) return true;
  if (/^thank you for dining with/i.test(f)) return true;
  return false;
}

export function customReceiptFooter(footer?: string | null): string {
  const f = String(footer || "").trim();
  if (isGenericReceiptFooter(f)) return "";
  return f;
}

export function shouldPrintGst(shop?: { printGstOnBill?: boolean } | null): boolean {
  return shop?.printGstOnBill === true;
}

/** 58mm QR caption — short so it does not wrap. Same copy on ESC/POS and HTML. */
export const RECEIPT_QR_CAPTION = ["Scan to order", "Cash - Pickup - Delivery"] as const;

/** Print the uploaded shop logo on the bill only when the admin ticks Settings. Off by default. */
export function shouldPrintLogoOnBill(tenant?: {
  shop?: { printLogoOnBill?: boolean } | null;
  branding?: { logoUrl?: string } | null;
} | null): boolean {
  if (tenant?.shop?.printLogoOnBill !== true) return false;
  return Boolean(String(tenant.branding?.logoUrl || "").trim());
}

export function receiptLogoUrl(tenant?: {
  shop?: { printLogoOnBill?: boolean } | null;
  branding?: { logoUrl?: string } | null;
} | null): string | null {
  if (!shouldPrintLogoOnBill(tenant)) return null;
  return String(tenant?.branding?.logoUrl || "").trim() || null;
}

export function sanitizeReceiptLogoUrl(raw?: string | null): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 500);
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s.slice(0, 500);
  } catch {
    /* ignore */
  }
  return null;
}

export function printedGrandTotal(order: Order, printGst: boolean): number {
  const tax = Number(order.fees?.tax) || 0;
  const total = Number(order.total) || 0;
  if (printGst) return total;
  return Math.max(0, total - tax);
}

/** Live guest order page for this kitchen only — never localhost, never Super. */
export function guestOrderPageUrl(tenantCode: string): string {
  const code = String(tenantCode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
  return `https://${LIVE_APP_HOST}/order?tenant=${encodeURIComponent(code || "KITCHEN")}`;
}

export function payCompact(method?: string | null): string {
  const raw = String(method || "cash")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  if (!raw || raw === "cash" || raw === "cash sale") return "Cash";
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function serviceCompact(order: Order): string {
  const t = String(order.serviceType || "counter")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();
  const names: Record<string, string> = {
    counter: "Counter",
    "dine in": "Dine-in",
    dinein: "Dine-in",
    pickup: "Pickup",
    delivery: "Delivery",
    takeaway: "Pickup",
  };
  const bits = [names[t] || t.replace(/\b\w/g, (c) => c.toUpperCase())];
  if (order.tableNumber) bits.push(`T${order.tableNumber}`);
  return bits.join(" · ");
}

/** Lahore / Islamabad — Pakistan Standard Time. Never UTC, never the host TZ. */
export const RECEIPT_TZ = "Asia/Karachi";

function pkParts(d: Date): Partial<Record<Intl.DateTimeFormatPartTypes, string>> {
  const fmt = new Intl.DateTimeFormat("en-PK", {
    timeZone: RECEIPT_TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const bag: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of fmt.formatToParts(d)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return bag;
}

function amPm(d: Date, dayPeriod?: string): "AM" | "PM" {
  const cleaned = String(dayPeriod || "")
    .replace(/\./g, "")
    .replace(/\s/g, "")
    .toUpperCase();
  if (cleaned === "AM" || cleaned.startsWith("AM")) return "AM";
  if (cleaned === "PM" || cleaned.startsWith("PM")) return "PM";
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: RECEIPT_TZ,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(d),
  );
  return hour >= 12 ? "PM" : "AM";
}

/** Compact 58mm stamp: `24/08  6:11 PM` in Pakistan time. Converts ISO/UTC correctly. */
export function billStamp(iso?: string | null): { date: string; time: string; line: string } {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—", line: "—" };
  const p = pkParts(d);
  const date = p.day && p.month ? `${p.day}/${p.month}` : "—";
  const hourNum = Number(p.hour);
  const hour = Number.isFinite(hourNum) && hourNum > 0 ? String(hourNum) : p.hour || "12";
  const minute = String(p.minute || "00").padStart(2, "0");
  const time = `${hour}:${minute} ${amPm(d, p.dayPeriod)}`;
  return { date, time, line: `${date}  ${time}` };
}

/** Line 2: Cash - Counter — skip redundant “cash sale” / POS. */
export function billKindLine(order: Order): string {
  return [payCompact(order.paymentMethod), serviceCompact(order)].filter(Boolean).join(" - ");
}

export function kitchenServiceLine(order: Order): string {
  const bits: string[] = [String(order.serviceType || "counter").toUpperCase()];
  if (order.tableNumber) bits.push(`T${order.tableNumber}`);
  if (order.channel === "pos") bits.push("POS");
  return bits.join(" - ");
}

export function receiptQrUrl(tenant: Pick<TenantState, "code">): string {
  return guestOrderPageUrl(tenant.code);
}

export function sanitizeGuestOrderQrUrl(raw?: string | null): string | null {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    if (u.hostname.toLowerCase() !== LIVE_APP_HOST) return null;
    if (u.pathname !== "/order" && u.pathname !== "/guest") return null;
    const code = (u.searchParams.get("tenant") || "").trim();
    if (!code) return null;
    return guestOrderPageUrl(code);
  } catch {
    return null;
  }
}
