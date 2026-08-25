import type { Order, Review } from "./tenant-types";

export interface ItemRating {
  avg: number;
  count: number;
}

/**
 * Per-item star ratings derived from guest reviews. A review points at an
 * order; each order line is an item, so the review's rating applies to every
 * item on that order (weighted once per review per item).
 */
export function itemRatings(orders: Order[], reviews: Review[]): Record<string, ItemRating> {
  const sums: Record<string, { total: number; count: number }> = {};
  if (!reviews?.length) return {};

  const reviewedOrderIds = new Set(reviews.map((r) => r.orderId));
  const orderItems = new Map<string, Set<string>>();
  for (const o of orders) {
    if (!reviewedOrderIds.has(o.id)) continue;
    const ids = new Set((o.lines || []).map((l) => l.itemId));
    orderItems.set(o.id, ids);
  }

  for (const r of reviews) {
    const itemIds = orderItems.get(r.orderId);
    if (!itemIds || !Number.isFinite(r.rating)) continue;
    for (const itemId of itemIds) {
      const s = sums[itemId] || { total: 0, count: 0 };
      s.total += r.rating;
      s.count += 1;
      sums[itemId] = s;
    }
  }

  const out: Record<string, ItemRating> = {};
  for (const [id, s] of Object.entries(sums)) {
    out[id] = { avg: Math.round((s.total / s.count) * 10) / 10, count: s.count };
  }
  return out;
}

/** Number of times an item appears across all orders (bestseller ranking). */
export function itemOrderCounts(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const l of o.lines || []) {
      counts[l.itemId] = (counts[l.itemId] || 0) + l.qty;
    }
  }
  return counts;
}
