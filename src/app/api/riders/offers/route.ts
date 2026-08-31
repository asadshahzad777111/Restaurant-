import { NextRequest, NextResponse } from "next/server";
import {
  decideDispatchOffer,
  ensureStore,
  listDispatchOffers,
  listRiders,
  patchOrder,
  readTenant,
  setRiderActiveOrder,
  upsertDispatchOffer,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { createOffer, decideOffer, rankAvailableRiders } from "@/lib/dispatch";
import { transition } from "@/lib/order-machine";
import { emitStatusChange } from "@/lib/order-events";
import { DISPATCH_DEFAULTS, type DispatchOffer } from "@/lib/rider-types";

export const runtime = "nodejs";

/**
 * Rider offer decisions (Phase 2, async accept/decline).
 *
 * POST /api/riders/offers  { offerId, accept: boolean }
 *
 * The rider app shows the job + route preview with the accept/reject countdown.
 *  - accept  → rider marked busy, order ready → out_for_delivery via the state
 *              machine, order.status_changed emitted (customer track updates).
 *  - decline → the offer is recorded declined and the NEXT ranked rider gets a
 *              fresh offer (fall-to-next per the prompt). Order stays ready.
 *  - expired → recorded as expired, 409 so the caller can retry dispatch.
 *
 * Auth: staff with the "orders" permission (Phase 2 rider app uses its own
 * session; the store layer stays tenant-scoped).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "orders"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const { offerId, accept } = (await req.json()) as {
      offerId?: string;
      accept?: boolean;
    };
    if (!offerId) return NextResponse.json({ error: "offerId required" }, { status: 400 });
    if (typeof accept !== "boolean") {
      return NextResponse.json({ error: "accept (boolean) required" }, { status: 400 });
    }

    const offers = await listDispatchOffers(tenantId);
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    if (offer.status !== "offered") {
      return NextResponse.json(
        { error: `Offer already ${offer.status}`, offer },
        { status: 409 },
      );
    }

    const decided = decideOffer(offer, accept);
    if (decided.status === "expired") {
      await decideDispatchOffer(tenantId, offerId, "expired");
      return NextResponse.json(
        { error: "Offer expired", offer: { ...offer, status: "expired" } },
        { status: 409 },
      );
    }
    if (decided.status === "offered") {
      // Should not happen after decideOffer; guard for safety.
      return NextResponse.json({ error: "Offer not decided" }, { status: 500 });
    }

    await decideDispatchOffer(tenantId, offerId, decided.status);

    if (decided.status === "declined") {
      // Fall to the next ranked rider — fresh offer for the same order.
      const tenant = await readTenant(tenantId);
      const order = tenant.orders.find((o) => o.id === offer.orderId);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const shop = tenant.shop;
      const origin = { lat: Number(shop.lat) || 0, lng: Number(shop.lng) || 0 };
      const riders = await listRiders(tenantId);
      // Exclude riders who already declined/expired for THIS order (fall-to-next),
      // and riders already accepted/busy on it.
      const excluded = new Set(
        (tenant.dispatchOffers ?? [])
          .filter(
            (o) =>
              o.orderId === offer.orderId &&
              (o.status === "declined" || o.status === "expired" || o.status === "accepted"),
          )
          .map((o) => o.riderId),
      );
      const candidates = rankAvailableRiders(riders, origin, {
        maxRadiusKm: DISPATCH_DEFAULTS.maxRadiusKm,
        maxCandidates: DISPATCH_DEFAULTS.maxCandidates,
      }).filter((r) => !excluded.has(r.id));

      if (candidates.length) {
        const next: DispatchOffer = createOffer(candidates[0], offer.orderId);
        await upsertDispatchOffer(tenantId, next);
        return NextResponse.json({
          declined: { ...decided, status: "declined" },
          nextOffer: next,
        });
      }
      return NextResponse.json(
        { declined: { ...decided, status: "declined" }, noMoreRiders: true },
        { status: 409 },
      );
    }

    // Accepted → assign rider + advance order.
    const tenant = await readTenant(tenantId);
    const order = tenant.orders.find((o) => o.id === offer.orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    await setRiderActiveOrder(tenantId, offer.riderId, order.id);

    const actor = `${session.userId ?? session.role ?? "system"}`;
    const tr = transition(order.status, "out_for_delivery", {
      actor: `${actor} · rider-accept`,
      note: `Rider ${offer.riderId}`,
    });
    await patchOrder(tenantId, order.id, { status: tr.status });

    emitStatusChange({
      tenantId,
      orderId: order.id,
      orderNumber: order.number,
      from: order.status,
      to: tr.status,
      actor: `${actor} · rider-accept`,
    });

    const t2 = await readTenant(tenantId);
    return NextResponse.json({
      offer: { ...decided, status: "accepted" },
      order: t2.orders.find((o) => o.id === order.id),
      rider: (await listRiders(tenantId)).find((r) => r.id === offer.riderId),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof Error && /Order cannot move/.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
