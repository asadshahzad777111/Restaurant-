import type { PaymentMethod, ServiceType } from "./types";

export type GuestMode = "table" | "pickup" | "delivery";

export const LAST_GUEST_TENANT_KEY = "ordo_guest_tenant";

export function paymentChoices(mode: ServiceType): { id: PaymentMethod; label: string; hint: string }[] {
  if (mode === "table") {
    return [
      {
        id: "pay_at_counter",
        label: "Pay at counter",
        hint: "Settle with staff at the restaurant. No card is charged here.",
      },
    ];
  }
  if (mode === "pickup") {
    return [
      {
        id: "pay_at_counter",
        label: "Pay at counter",
        hint: "Pay when you collect.",
      },
      {
        id: "paid_in_advance",
        label: "Paid in advance",
        hint: "Records the ticket as already paid. ORDO does not run a card or wallet charge.",
      },
    ];
  }
  if (mode === "delivery") {
    return [
      {
        id: "cod",
        label: "Cash on delivery",
        hint: "Pay the rider in cash.",
      },
      {
        id: "paid_in_advance",
        label: "Paid in advance",
        hint: "Records the ticket as already paid. ORDO does not run a card or wallet charge.",
      },
    ];
  }
  return [{ id: "cash", label: "Cash", hint: "Counter sale." }];
}

export function assertOrderRules(input: {
  channel: "guest" | "pos";
  serviceType: ServiceType;
  paymentMethod: PaymentMethod;
  tableNumber?: string;
  customerPhone?: string;
  deliveryAddress?: string;
}): string | null {
  if (input.channel === "pos") {
    if (input.serviceType !== "counter") return "POS orders must use counter service";
    if (!["cash", "card", "wallet"].includes(input.paymentMethod)) return "Invalid POS payment";
    return null;
  }
  if (input.serviceType === "table") {
    if (!input.tableNumber?.trim()) return "Table number required";
    if (input.paymentMethod !== "pay_at_counter") return "Table orders pay at the counter";
    return null;
  }
  if (input.serviceType === "pickup") {
    if (!["pay_at_counter", "paid_in_advance"].includes(input.paymentMethod)) {
      return "Pickup is pay at counter or paid in advance";
    }
    return null;
  }
  if (input.serviceType === "delivery") {
    if (!input.deliveryAddress?.trim()) return "Delivery address required";
    if (!input.customerPhone?.trim()) return "Phone required for delivery";
    if (!["cod", "paid_in_advance"].includes(input.paymentMethod)) {
      return "Delivery is cash on delivery or paid in advance";
    }
    return null;
  }
  return "Invalid service type for guest order";
}

export function guestOrderPath(opts: { tenant: string; table?: string; mode?: GuestMode }) {
  const q = new URLSearchParams();
  q.set("tenant", opts.tenant.toUpperCase());
  if (opts.table) q.set("table", opts.table);
  else if (opts.mode && opts.mode !== "table") q.set("mode", opts.mode);
  return `/order?${q.toString()}`;
}

export function parseGuestQr(raw: string): { tenant: string; table?: string; mode?: GuestMode } | null {
  const text = raw.trim();
  if (!text) return null;

  try {
    const url = new URL(text, "https://ordo.local");
    const tenant = (url.searchParams.get("tenant") || "").trim().toUpperCase();
    const table = url.searchParams.get("table")?.trim() || undefined;
    const modeRaw = url.searchParams.get("mode");
    const mode: GuestMode | undefined =
      modeRaw === "pickup" || modeRaw === "delivery" || modeRaw === "table" ? modeRaw : undefined;
    if (isTenantCode(tenant)) {
      return { tenant, table, mode };
    }
  } catch {
    /* not a URL */
  }

  const pair = text.match(/^([A-Za-z0-9_-]{2,24})\s*[:/#-]\s*([A-Za-z0-9_-]{1,12})$/);
  if (pair) {
    return { tenant: pair[1].toUpperCase(), table: pair[2] };
  }

  if (isTenantCode(text)) return { tenant: text.toUpperCase() };
  return null;
}

export function isTenantCode(value: string) {
  return /^[A-Za-z0-9_-]{2,24}$/.test(value.trim());
}

export function trackSteps(serviceType: string): string[] {
  if (serviceType === "delivery") {
    return ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed"];
  }
  return ["placed", "accepted", "preparing", "ready", "completed"];
}

export function modeLabel(mode: ServiceType | string) {
  if (mode === "table") return "Dining";
  if (mode === "pickup") return "Takeaway";
  if (mode === "delivery") return "Delivery";
  if (mode === "counter") return "Counter";
  return mode;
}

export function cartStorageKey(tenant: string) {
  return `ordo_cart_${tenant.toUpperCase()}`;
}
