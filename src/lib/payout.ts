import type { Order } from "./tenant-types";

/**
 * PAYOUT SERVICE (isolated, pure) — Phase 3.
 *
 * Prompt section 5 (Restaurant dashboard): "Payout/earnings view with clear
 * breakdown (order total, platform commission, net payout) — commission
 * transparency reduces vendor churn." Section 7: "Commission/pricing rules per
 * restaurant" live in the admin panel.
 *
 * All functions are pure and testable. The commission % comes from
 * TenantShop.commissionPct (default 10).
 */

export const DEFAULT_COMMISSION_PCT = 10;

export interface PayoutSummary {
  from: string;
  to: string;
  currency: string;
  commissionPct: number;
  /** Gross sales (non-cancelled orders in window). */
  gross: number;
  /** Platform commission = gross × commissionPct%. */
  commission: number;
  /** COD cash already collected by riders (banked against this window). */
  codCollected: number;
  /** Net payout to the restaurant = gross − commission − COD collected. */
  netPayout: number;
  orderCount: number;
  deliveryCount: number;
}

export interface PayoutOptions {
  from: Date;
  to: Date;
  commissionPct?: number;
  currency?: string;
}

/**
 * Build the payout summary for a window. COD orders whose cash was collected
 * by riders are excluded from the net payout (the rider already banked that
 * cash); COD still pending is paid to the restaurant until collected.
 */
export function buildPayout(
  orders: Order[],
  opts: PayoutOptions,
): PayoutSummary {
  const pct = opts.commissionPct ?? DEFAULT_COMMISSION_PCT;
  const fromMs = opts.from.getTime();
  const toMs = opts.to.getTime();

  let gross = 0;
  let codCollected = 0;
  let orderCount = 0;
  let deliveryCount = 0;

  for (const o of orders) {
    const t = new Date(o.createdAt).getTime();
    if (t < fromMs || t > toMs) continue;
    if (o.status === "cancelled") continue;
    gross += o.total;
    orderCount += 1;
    if (o.serviceType === "delivery") deliveryCount += 1;
    // Rider already took this cash — it never flows through the payout.
    if (o.paymentMethod === "cod" && o.paymentStatus === "paid") {
      codCollected += o.total;
    }
  }

  const commission = Math.round((gross * pct) / 100);
  const netPayout = Math.max(0, gross - commission - codCollected);

  return {
    from: opts.from.toISOString(),
    to: opts.to.toISOString(),
    currency: opts.currency ?? "PKR",
    commissionPct: pct,
    gross,
    commission,
    codCollected,
    netPayout,
    orderCount,
    deliveryCount,
  };
}

/** Format a PKR-like amount without decimals (matches `money` style). */
export function formatPayout(currency: string, n: number): string {
  return `${currency || "PKR"} ${Math.round(n).toLocaleString()}`;
}
