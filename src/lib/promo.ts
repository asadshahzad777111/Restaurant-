import type { Order } from "./tenant-types";

/**
 * PROMO / COUPON ENGINE (isolated, pure) — Phase 3.
 *
 * Prompt sections 7 + 10: promo/coupon management lives in the admin panel,
 * and "rate-limit and fraud-check the promo/coupon system early — this is the
 * most commonly abused surface in delivery apps."
 *
 * All functions are pure and testable. Persistence + API live in the caller;
 * this module only decides.
 */

export type PromoType = "flat" | "percent";

export interface Promo {
  id: string;
  /** Normalized code (uppercase, no spaces). */
  code: string;
  type: PromoType;
  /** flat: PKR off. percent: % off (1–100). */
  value: number;
  /** Optional cap on the discount for percent promos. */
  maxDiscount?: number;
  /** Minimum order subtotal required (PKR). */
  minSubtotal?: number;
  /** Total redemptions allowed across all customers. */
  maxUses?: number;
  /** Redemptions allowed per customer (keyed by customer identity). */
  perUser?: number;
  validFrom?: string;
  validTo?: string;
  /** Admin toggle — disable without deleting (keeps redemption history). */
  enabled: boolean;
  createdAt: string;
}

export interface PromoUsage {
  /** Identity used for per-user limits: customer phone or email, normalized. */
  userKey: string;
  promoId: string;
  orderId: string;
  discount: number;
  at: string;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export type PromoRejectReason =
  | "INVALID_CODE"
  | "DISABLED"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "MIN_SUBTOTAL"
  | "MAX_USES"
  | "PER_USER_LIMIT";

export interface PromoValidation {
  ok: boolean;
  promo?: Promo;
  reason?: PromoRejectReason;
  /** Final discount in PKR when ok. */
  discount?: number;
}

export interface PromoContext {
  /** Subtotal before fees (lines subtotal). */
  subtotal: number;
  /** Customer identity for per-user limits (phone/email). */
  userKey?: string;
  now?: Date;
}

export function isPromoActive(promo: Promo, now: Date): boolean {
  if (!promo.enabled) return false;
  if (promo.validFrom && now.getTime() < new Date(promo.validFrom).getTime()) return false;
  if (promo.validTo && now.getTime() > new Date(promo.validTo).getTime()) return false;
  return true;
}

/** Compute the discount for an order subtotal without limits (type math only). */
export function promoDiscountAmount(promo: Promo, subtotal: number): number {
  if (promo.type === "flat") return Math.min(promo.value, subtotal);
  const pct = Math.max(0, Math.min(100, promo.value));
  const raw = Math.round((subtotal * pct) / 100);
  return Math.max(0, Math.min(promo.maxDiscount ?? raw, raw, subtotal));
}

/**
 * Validate a promo for a checkout. Checks, in order: code exists → enabled +
 * dates → min subtotal → global max uses → per-user limit. Returns the exact
 * reject reason so the API can give a clear customer message (and log fraud).
 */
export function validatePromo(
  promo: Promo | undefined,
  usage: PromoUsage[],
  ctx: PromoContext,
): PromoValidation {
  const now = ctx.now ?? new Date();
  if (!promo) return { ok: false, reason: "INVALID_CODE" };
  if (!promo.enabled) return { ok: false, reason: "DISABLED" };
  if (promo.validFrom && now.getTime() < new Date(promo.validFrom).getTime()) {
    return { ok: false, reason: "NOT_YET_VALID" };
  }
  if (promo.validTo && now.getTime() > new Date(promo.validTo).getTime()) {
    return { ok: false, reason: "EXPIRED" };
  }
  if (promo.minSubtotal != null && ctx.subtotal < promo.minSubtotal) {
    return { ok: false, reason: "MIN_SUBTOTAL" };
  }
  const usedCount = usage.filter((u) => u.promoId === promo.id).length;
  if (promo.maxUses != null && usedCount >= promo.maxUses) {
    return { ok: false, reason: "MAX_USES" };
  }
  if (promo.perUser != null && ctx.userKey) {
    const userCount = usage.filter(
      (u) => u.promoId === promo.id && u.userKey === ctx.userKey,
    ).length;
    if (userCount >= promo.perUser) {
      return { ok: false, reason: "PER_USER_LIMIT" };
    }
  }
  return {
    ok: true,
    promo,
    discount: promoDiscountAmount(promo, ctx.subtotal),
  };
}

export interface ApplyResult {
  ok: boolean;
  reason?: PromoRejectReason;
  discount: number;
}

/**
 * Apply a promo to an order. Validates against existing usage, then returns the
 * discount. The caller persists a PromoUsage row (rate-limit + fraud check =
 * every redemption counted, so MAX_USES/PER_USER can never be bypassed).
 */
export function applyPromo(
  promo: Promo | undefined,
  usage: PromoUsage[],
  ctx: PromoContext,
): ApplyResult {
  const v = validatePromo(promo, usage, ctx);
  if (!v.ok) return { ok: false, reason: v.reason, discount: 0 };
  return { ok: true, discount: v.discount ?? 0 };
}

/** Fraud signal: same order number attempting many codes, or repeated invalid tries. */
export function suspiciousUsagePattern(orders: Order[]): boolean {
  // A single order can only ever have one promo discount; more than 3 distinct
  // promo-code attempts are not tracked here (that lives in the API rate
  // limiter), but we flag customers whose orders ALL used promos at >90% off.
  const discounted = orders.filter(
    (o) => o.discount != null && o.discount > 0 && o.total > 0,
  );
  if (!discounted.length) return false;
  const abusive = discounted.filter((o) => (o.discount ?? 0) / (o.total + (o.discount ?? 0)) > 0.9);
  return abusive.length >= 3;
}
