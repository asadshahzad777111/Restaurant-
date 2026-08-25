import type { Plan, PlanId } from "./types";

/** Capabilities unlocked by each restaurant plan (enforced in UI + API). */
export type PlanCapability =
  | "pos"
  | "orders"
  | "kitchen"
  | "menu"
  | "tables"
  | "dayClose"
  | "sales"
  | "logo"
  | "staff"
  | "stock"
  | "reviews"
  | "apk"
  | "whatsapp"
  | "multiKitchen";

const STARTER_CAPS: PlanCapability[] = [
  "pos",
  "orders",
  "kitchen",
  "menu",
  "tables",
  "dayClose",
  "logo",
  "staff",
];

const PRO_CAPS: PlanCapability[] = [
  ...STARTER_CAPS,
  "sales",
  "stock",
  "reviews",
  "apk",
  "whatsapp",
];

const ENTERPRISE_CAPS: PlanCapability[] = [...PRO_CAPS, "multiKitchen"];

const CAPS: Record<PlanId, PlanCapability[]> = {
  starter: STARTER_CAPS,
  pro: PRO_CAPS,
  enterprise: ENTERPRISE_CAPS,
};

/** Canonical plans — Starter ₨999 with guest QR + kitchen. */
export const CANONICAL_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    pricePkr: 999,
    maxStaff: 5,
    description: "One kitchen · guest QR · kitchen tickets",
    features: [
      "Guest dining, takeaway, delivery",
      "QR / scan entry",
      "Counter POS + kitchen display",
      "Public menu in sync with POS",
      "Browser receipts",
      "Up to 5 staff",
      "Web order alerts (in-app)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pricePkr: 1999,
    maxStaff: 15,
    description: "Most popular — customer app + stock + reviews",
    features: [
      "Everything in Starter",
      "Customer app (APK) for your restaurant",
      "WhatsApp order alerts to your phone",
      "Staff roles & permissions",
      "Stock alerts + sales & profit reports",
      "Guest tracking + reviews",
      "Receipt branding (logo, footer)",
      "Up to 15 staff",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePkr: 4499,
    maxStaff: 40,
    description: "Multi-kitchen Super desk · thermal printer · priority",
    features: [
      "Everything in Pro",
      "Multiple kitchens under one Super desk",
      "Create / suspend kitchens, billing notes",
      "Thermal printer package on request",
      "Priority onboarding & support",
      "Up to 40 staff",
    ],
  },
];

export function capabilitiesFor(planId: PlanId | string | null | undefined): Set<PlanCapability> {
  const id = (planId as PlanId) in CAPS ? (planId as PlanId) : "starter";
  return new Set(CAPS[id]);
}

export function planAllows(
  planId: PlanId | string | null | undefined,
  cap: PlanCapability,
): boolean {
  return capabilitiesFor(planId).has(cap);
}

export function upgradeHint(planId: PlanId | string | null | undefined): string {
  if (planId === "starter") {
    return "Pro (₨1,999) adds your customer app, WhatsApp order alerts, stock & sales reports, and receipt branding.";
  }
  if (planId === "pro") {
    return "Need more kitchens or a thermal printer package? Talk to ORDO about Enterprise.";
  }
  return "";
}
