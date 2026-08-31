/**
 * RIDER + DISPATCH TYPES (Phase 2 foundation).
 *
 * Food Delivery Platform: the rider app (React Native, Phase 2) and the
 * dispatch service share these contracts. Kept in one module so both sides
 * type-check against the same shape. No runtime logic here — see dispatch.ts.
 */

export interface RiderLocation {
  lat: number;
  lng: number;
  /** When this ping was recorded (ISO). */
  at: string;
}

export interface Rider {
  id: string;
  name: string;
  phone?: string;
  /** Online = available to receive dispatch offers. */
  online: boolean;
  /** Id of the order this rider is currently carrying (single-order dispatch). */
  activeOrderId?: string;
  /** Number of active orders in flight (batching ranking factor, Phase 3). */
  load: number;
  lastLocation?: RiderLocation;
  updatedAt: string;
}

export type DispatchOfferStatus = "offered" | "accepted" | "declined" | "expired";

export interface DispatchOffer {
  id: string;
  orderId: string;
  riderId: string;
  status: DispatchOfferStatus;
  /** Straight-line distance from rider to pickup (km) at offer time. */
  distanceKm: number;
  /** Offer window — rider must decide before this (ISO). */
  expiresAt: string;
  decidedAt?: string;
}

export interface DispatchPoint {
  lat: number;
  lng: number;
}

/**
 * Rider-side order lifecycle (Phase 2). Kept separate from the restaurant
 * OrderStatus so existing restaurant flows (orders/kitchen/POS) never break.
 * Mapping to the restaurant lifecycle:
 *   ready → rider_assigned → rider_arrived_restaurant → picked_up
 *        → out_for_delivery → arrived_customer → delivered
 */
export type RiderState =
  | "rider_assigned"
  | "rider_arrived_restaurant"
  | "picked_up"
  | "arrived_customer"
  | "delivered";

/** Rider dispatch defaults — safe small-scale settings. */
export const DISPATCH_DEFAULTS = {
  /** Only offer to riders within this straight-line distance (km). */
  maxRadiusKm: 8,
  /** Accept/reject window in seconds (prompt: 15–20s). */
  offerWindowSec: 18,
  /** Max riders offered per order before manual fallback. */
  maxCandidates: 5,
} as const;
