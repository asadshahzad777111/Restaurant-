import type { OrderStatus } from "./types";

/**
 * REAL-TIME EVENT BUS (isolated service).
 *
 * Food Delivery Platform rule: real-time logic lives in isolated services, never
 * scattered across route handlers. This module is the single emit point for
 * order lifecycle events. Phase 1 broadcasts to in-process subscribers (and logs).
 * Phase 2 swaps the transport to Redis Streams / Socket.io / native ws without
 * touching any route handler — they only ever call emitOrderEvent().
 */

export type OrderEventType =
  | "order.created"
  | "order.status_changed"
  | "order.payment_changed"
  | "order.cancelled";

export interface OrderEvent {
  type: OrderEventType;
  tenantId: string;
  orderId: string;
  /** Optional order number for human-friendly notifications. */
  orderNumber?: number;
  from?: OrderStatus;
  to?: OrderStatus;
  paymentStatus?: string;
  actor?: string;
  at: string;
}

type Listener = (event: OrderEvent) => void;

const listeners = new Set<Listener>();

/** Subscribe to order events. Returns an unsubscribe function. */
export function subscribeOrderEvents(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Emit an order event. Never throws — real-time delivery must not break the
 * order write path. Phase 2: publish to Redis Stream + fan out via WebSocket
 * channels (customer:<orderId>, restaurant:<tenantId>, rider:<riderId>).
 */
export function emitOrderEvent(event: OrderEvent): void {
  try {
    for (const fn of listeners) {
      try {
        fn(event);
      } catch (err) {
        console.error("[order-events] listener failed:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error("[order-events] emit failed:", err instanceof Error ? err.message : err);
  }
}

/** Convenience: status change event with actor + timestamp. */
export function emitStatusChange(input: {
  tenantId: string;
  orderId: string;
  orderNumber?: number;
  from: OrderStatus;
  to: OrderStatus;
  actor?: string;
  at?: string;
}): void {
  emitOrderEvent({
    type: input.to === "cancelled" ? "order.cancelled" : "order.status_changed",
    tenantId: input.tenantId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    from: input.from,
    to: input.to,
    actor: input.actor,
    at: input.at ?? new Date().toISOString(),
  });
}

/** Convenience: payment change event (COD collected → paid, proof verified…). */
export function emitPaymentChange(input: {
  tenantId: string;
  orderId: string;
  orderNumber?: number;
  paymentStatus: string;
  actor?: string;
  at?: string;
}): void {
  emitOrderEvent({
    type: "order.payment_changed",
    tenantId: input.tenantId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    paymentStatus: input.paymentStatus,
    actor: input.actor,
    at: input.at ?? new Date().toISOString(),
  });
}
