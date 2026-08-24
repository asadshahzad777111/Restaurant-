import type { Order, TenantState } from "./tenant-types";

export function statusMessage(tenant: TenantState, order: Order, kind: string) {
  const name = tenant.branding.name;
  const n = order.number;
  const phone = tenant.shop.whatsapp || tenant.shop.phone;
  switch (kind) {
    case "confirmed":
      return `${name}: Order #${n} confirmed. Shukriya! Hum prepare kar rahe hain.`;
    case "preparing":
      return `${name}: Order #${n} kitchen mein prepare ho raha hai.`;
    case "ready":
      return `${name}: Order #${n} ready hai — counter se collect karain.`;
    case "out":
      return `${name}: Order #${n} rider ke saath nikal gaya. Track open rakhein.`;
    case "cancelled":
      return `${name}: Order #${n} cancel/void ho gaya.${order.cancelReason ? ` Reason: ${order.cancelReason}` : ""}`;
    default:
      return `${name}: Order #${n} update. Call: ${phone}`;
  }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* iOS Safari often blocks clipboard without a user gesture / https */
  }
}

export function whatsappShareUrl(phone: string | undefined, text: string) {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
