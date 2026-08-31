import type { Order } from "./tenant-types";
import type { Rider } from "./rider-types";

/**
 * ANALYTICS SERVICE (isolated, pure) — Phase 3 admin panel foundation.
 *
 * Prompt section 7 (Admin panel): "Analytics: order volume, average delivery
 * time, cancellation rate, rider utilization, city-level heatmaps."
 *
 * All functions are pure so they unit-test easily. Heatmaps are Phase 3/4
 * (needs geocoded customer addresses); everything else is computed here from
 * the tenant's orders + riders.
 */

export interface VolumePoint {
  /** ISO date (YYYY-MM-DD) for day buckets. */
  date: string;
  orders: number;
  gross: number;
}

/** Order volume bucketed per calendar day (last `days` days, zero-filled). */
export function orderVolumeByDay(
  orders: Order[],
  days = 7,
  now: Date = new Date(),
): VolumePoint[] {
  const map = new Map<string, { orders: number; gross: number }>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const hit = map.get(key) || { orders: 0, gross: 0 };
    hit.orders += 1;
    hit.gross += o.total;
    map.set(key, hit);
  }
  const out: VolumePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
    const hit = map.get(key) || { orders: 0, gross: 0 };
    out.push({ date: key, orders: hit.orders, gross: hit.gross });
  }
  return out;
}

/**
 * Average fulfillment time: minutes from `placed` to `completed` for completed
 * orders that have both timestamps in statusHistory. Returns null when no
 * completed order has usable timestamps.
 */
export function avgFulfillmentMinutes(orders: Order[]): number | null {
  let total = 0;
  let count = 0;
  for (const o of orders) {
    if (o.status !== "completed") continue;
    const placed = o.statusHistory.find((h) => h.status === "placed")?.at;
    const completed = o.statusHistory.find((h) => h.status === "completed")?.at;
    if (!placed || !completed) continue;
    const ms = new Date(completed).getTime() - new Date(placed).getTime();
    if (!Number.isFinite(ms) || ms < 0) continue;
    total += ms / 60000;
    count += 1;
  }
  return count ? Math.round((total / count) * 10) / 10 : null;
}

/** Cancellation rate: cancelled / (all orders), 0–1. */
export function cancellationRate(orders: Order[]): number {
  if (!orders.length) return 0;
  return orders.filter((o) => o.status === "cancelled").length / orders.length;
}

export interface RiderUtilization {
  totalRiders: number;
  onlineRiders: number;
  busyRiders: number;
  /** Busy / online — share of online riders currently carrying an order. */
  utilizationPct: number;
}

export function riderUtilization(riders: Rider[]): RiderUtilization {
  const total = riders.length;
  const online = riders.filter((r) => r.online).length;
  const busy = riders.filter((r) => r.online && r.activeOrderId).length;
  return {
    totalRiders: total,
    onlineRiders: online,
    busyRiders: busy,
    utilizationPct: online ? Math.round((busy / online) * 100) : 0,
  };
}

/** Average delivery order value (gross / non-cancelled delivery orders). */
export function avgDeliveryOrderValue(orders: Order[]): number {
  const deliveries = orders.filter((o) => o.serviceType === "delivery" && o.status !== "cancelled");
  if (!deliveries.length) return 0;
  return Math.round(deliveries.reduce((s, o) => s + o.total, 0) / deliveries.length);
}

export interface AnalyticsReport {
  volume: VolumePoint[];
  avgFulfillmentMinutes: number | null;
  cancellationRate: number;
  riderUtilization: RiderUtilization;
  avgDeliveryOrderValue: number;
  deliveryOrderCount: number;
}

/** One-call report over a tenant's orders + riders. */
export function buildAnalytics(
  orders: Order[],
  riders: Rider[],
  opts: { days?: number; now?: Date } = {},
): AnalyticsReport {
  return {
    volume: orderVolumeByDay(orders, opts.days ?? 7, opts.now),
    avgFulfillmentMinutes: avgFulfillmentMinutes(orders),
    cancellationRate: Math.round(cancellationRate(orders) * 1000) / 1000,
    riderUtilization: riderUtilization(riders),
    avgDeliveryOrderValue: avgDeliveryOrderValue(orders),
    deliveryOrderCount: orders.filter(
      (o) => o.serviceType === "delivery" && o.status !== "cancelled",
    ).length,
  };
}
