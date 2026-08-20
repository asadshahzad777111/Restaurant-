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

const STARTER_CAPS: PlanCapability[] = ["pos", "orders"];

const PRO_CAPS: PlanCapability[] = [
  "pos",
  "orders",
  "kitchen",
  "menu",
  "tables",
  "dayClose",
  "sales",
  "logo",
  "staff",
  "stock",
  "reviews",
];

const ENTERPRISE_CAPS: PlanCapability[] = [...PRO_CAPS];

const CAPS: Record<PlanId, PlanCapability[]> = {
  starter: STARTER_CAPS,
  pro: PRO_CAPS,
  enterprise: ENTERPRISE_CAPS,
};

/** Canonical plans — Starter is bare POS to push Pro. */
export const CANONICAL_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    pricePkr: 800,
    maxStaff: 1,
    description: "Simple counter billing only — upgrade when you need more",
    features: [
      "POS billing (cash / card / wallet)",
      "Basic order list",
      "1 owner login only",
      "No logo, staff, or sales reports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pricePkr: 2500,
    maxStaff: 20,
    description: "Full restaurant tools — the plan most kitchens need",
    features: [
      "Everything useful for one branch",
      "Sales & daily profit strip",
      "Logo + receipt branding",
      "Staff logins & roles",
      "Kitchen, tables, menu, day close",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePkr: 8000,
    maxStaff: 100,
    description: "Groups · priority help · printer package",
    features: [
      "Everything in Pro",
      "Higher staff limit",
      "Priority support",
      "Multi-outlet roadmap",
      "Printer package",
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
    return "Starter is billing-only. Pro (₨2,500) unlocks sales, logo, staff, kitchen, and menu.";
  }
  if (planId === "pro") {
    return "Need more staff seats or priority support? Talk to ORDO about Enterprise.";
  }
  return "";
}
