import type { OrderStatus, PaymentStatus } from "./types";

/**
 * ORDER STATE MACHINE — the single source of truth for order lifecycle.
 *
 * Food Delivery Platform design (Foodpanda-class):
 *   PLACED → ACCEPTED → PREPARING → READY_FOR_PICKUP → RIDER_ASSIGNED
 *   → RIDER_ARRIVED_RESTAURANT → PICKED_UP → OUT_FOR_DELIVERY
 *   → ARRIVED_CUSTOMER → DELIVERED
 *   (CANCELLED / REFUNDED / FAILED exit from any active state)
 *
 * Phase 1 (this repo today) runs the restaurant-side subset with the existing
 * OrderStatus values. Phase 2 adds rider states; they are listed here as the
 * canonical extension points so the machine never needs restructuring.
 *
 * Rules:
 *  - Transitions are validated (invalid jumps rejected at the API layer).
 *  - Same-state patches are idempotent no-ops (webhook/retry safe).
 *  - Every change carries an actor + timestamp → audit trail for disputes/refunds.
 */

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
];

/** Terminal states — nothing may leave them. */
export const TERMINAL_STATUSES: OrderStatus[] = ["completed", "cancelled"];

/** Active (in-flight) states shown on dashboards. */
export const ACTIVE_STATUSES: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
];

/** Canonical lifecycle (restaurant-side subset mapped onto OrderStatus). */
export const CANONICAL_LIFECYCLE: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
];

/**
 * Phase 2 rider states — not in OrderStatus yet. Kept as documentation of the
 * extension points so dispatch/riders slot in without touching this module.
 */
export const RIDER_STATES = [
  "rider_assigned",
  "rider_arrived_restaurant",
  "picked_up",
  "arrived_customer",
  "delivered",
] as const;

export type RiderState = (typeof RIDER_STATES)[number];

/**
 * Rider-side lifecycle (prompt section 2) mapped onto the restaurant
 * OrderStatus that each rider state syncs with on the shared order.
 * `delivered` marks the order completed and releases the rider.
 */
export const RIDER_FLOW: Record<RiderState, OrderStatus> = {
  rider_assigned: "out_for_delivery",
  rider_arrived_restaurant: "out_for_delivery",
  picked_up: "out_for_delivery",
  arrived_customer: "out_for_delivery",
  delivered: "completed",
};

/** Allowed rider transitions — additive, idempotent, audit-friendly. */
export const RIDER_TRANSITIONS: Record<RiderState, Array<RiderState | "cancelled">> = {
  rider_assigned: ["rider_arrived_restaurant", "cancelled"],
  rider_arrived_restaurant: ["picked_up", "cancelled"],
  picked_up: ["arrived_customer"],
  arrived_customer: ["delivered"],
  delivered: [],
};

/** Rider states that release the rider back to available. */
export const RIDER_END_STATES: RiderState[] = ["delivered"];

export function canRiderTransition(
  from: RiderState,
  to: RiderState | "cancelled",
): boolean {
  if (from === to) return true;
  return RIDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRiderTransition(
  from: RiderState,
  to: RiderState | "cancelled",
): void {
  if (canRiderTransition(from, to)) return;
  throw new Error(`Rider cannot move ${from} → ${to}`);
}

/**
 * Valid transitions. Additive only — a state may gain new exits later, but an
 * existing allowed exit must never be removed (idempotent webhooks depend on it).
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Terminal + auto-paid statuses (POS collects at the till). */
export const PAID_STATUSES: PaymentStatus[] = ["paid", "verified"];

/**
 * Default "next" action per state for single-action UI buttons (dine-in
 * default). The API still validates against VALID_TRANSITIONS; this only
 * drives which button label the UI shows. Kept here so Orders/Kitchen/POS
 * never duplicate the lifecycle by hand.
 */
export const PRIMARY_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true; // idempotent no-op
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** All legal next states from `from` (excludes the no-op same-state case). */
export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/** Throws a descriptive Error for an illegal transition (safe for API 400s). */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (canTransition(from, to)) return;
  throw new Error(`Order cannot move ${from} → ${to}`);
}

export interface TransitionInput {
  /** Who performed the action (user id / role / "system"). */
  actor?: string;
  /** Optional reason (cancel reason, kitchen note…). */
  note?: string;
  /** Timestamp; defaults to now. */
  at?: string;
}

export interface TransitionResult {
  /** New status (same as `to`), or `from` when it was an idempotent no-op. */
  status: OrderStatus;
  /** True when the status actually changed. */
  changed: boolean;
  /** Audit event to append to statusHistory. */
  event: { status: OrderStatus; at: string; note?: string };
}

/**
 * Compute a transition. Pure — callers persist the returned event themselves.
 * Same-state requests resolve to `changed: false` (retry/webhook safe).
 */
export function transition(
  from: OrderStatus,
  to: OrderStatus,
  input: TransitionInput = {},
): TransitionResult {
  assertTransition(from, to);
  const at = input.at ?? new Date().toISOString();
  if (from === to) {
    return { status: from, changed: false, event: { status: from, at } };
  }
  const note = [input.note, input.actor ? `by ${input.actor}` : ""]
    .filter(Boolean)
    .join(" · ");
  return {
    status: to,
    changed: true,
    event: { status: to, at, note: note || undefined },
  };
}
