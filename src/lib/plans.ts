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
  | "reviews";

const STARTER_CAPS: PlanCapability[] = [
  "pos",
  "orders",
  "kitchen",
  "menu",
  "tables",
  "dayClose",
  "sales",
  "logo",
  "staff",
];

const PRO_CAPS: PlanCapability[] = [...STARTER_CAPS, "stock", "reviews"];

const ENTERPRISE_CAPS: PlanCapability[] = [...PRO_CAPS];

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
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pricePkr: 1999,
    maxStaff: 15,
    description: "Staff roles · stock · reviews",
    features: [
      "Everything in Starter",
      "Staff roles & permissions",
      "Stock alerts",
      "Guest tracking + reviews",
      "Receipt branding",
      "Up to 15 staff",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePkr: 4499,
    maxStaff: 40,
    description: "Multi-kitchen Super desk · printer quote",
    features: [
      "Everything in Pro",
      "Super Admin: create / suspend kitchens",
      "Open restaurant (help without mixing data)",
      "Thermal printer package on request",
      "Priority onboarding",
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
    return "Starter covers one kitchen. Pro (₨1,999) adds stock alerts and reviews.";
  }
  if (planId === "pro") {
    return "Need more staff seats or priority support? Talk to ORDO about Enterprise.";
  }
  return "";
}
