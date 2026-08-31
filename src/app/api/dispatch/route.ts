import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  listRiders,
  readTenant,
  upsertDispatchOffer,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { createOffer, rankAvailableRiders } from "@/lib/dispatch";
import { DISPATCH_DEFAULTS } from "@/lib/rider-types";
import type { DispatchOffer } from "@/lib/rider-types";

export const runtime = "nodejs";

/**
 * Rider dispatch (Phase 2, async offer flow).
 *
 * POST /api/dispatch  { orderId, maxRadiusKm?, offerWindowSec? }
 *
 * Instead of auto-assigning, this creates a dispatch OFFER for the nearest
 * available rider and persists it (status "offered", expiresAt window). The
 * rider app accepts/declines via POST /api/riders/offers — on accept the order
 * moves ready → out_for_delivery; on decline/expiry the caller (or a retry)
 * offers the next rider. The order stays "ready" until a rider accepts.
 *
 * Auth: staff with the "orders" permission.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "orders"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const { orderId, maxRadiusKm, offerWindowSec } = (await req.json()) as {
      orderId?: string;
      maxRadiusKm?: number;
      offerWindowSec?: number;
    };
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const tenant = await readTenant(tenantId);
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.serviceType !== "delivery") {
      return NextResponse.json({ error: "Dispatch is only for delivery orders" }, { status: 400 });
    }
    if (order.status !== "ready") {
      return NextResponse.json(
        { error: `Order must be ready before dispatch (now ${order.status})` },
        { status: 400 },
      );
    }

    // Already has an outstanding offer? Return it (idempotent dispatch).
    const existing = (tenant.dispatchOffers ?? []).find(
      (o) => o.orderId === orderId && o.status === "offered",
    );
    if (existing) {
      return NextResponse.json({ offer: existing, order });
    }

    const shop = tenant.shop;
    const origin = {
      lat: Number(shop.lat) || 0,
      lng: Number(shop.lng) || 0,
    };
    if (!origin.lat || !origin.lng) {
      return NextResponse.json(
        { error: "Shop location missing — set lat/lng in Settings → Fees" },
        { status: 400 },
      );
    }

    const riders = await listRiders(tenantId);
    const candidates = rankAvailableRiders(riders, origin, {
      maxRadiusKm,
      maxCandidates: DISPATCH_DEFAULTS.maxCandidates,
    });
    if (!candidates.length) {
      return NextResponse.json(
        { error: "No available rider within range", noRiderInRange: true },
        { status: 409 },
      );
    }

    const offer: DispatchOffer = createOffer(candidates[0], orderId, {
      offerWindowSec,
    });
    await upsertDispatchOffer(tenantId, offer);

    return NextResponse.json({
      offer,
      order,
      // Next fallback riders, in rank order, for the admin ops view.
      fallbackRiders: candidates.slice(1).map((r) => ({
        id: r.id,
        name: r.name,
        distanceKm: Math.round(r.distanceKm * 10) / 10,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
