import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  listRiders,
  patchOrder,
  readTenant,
  setRiderActiveOrder,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { emitPaymentChange } from "@/lib/order-events";

export const runtime = "nodejs";

/**
 * COD collection (Phase 2 — prompt point 10: COD reconciliation from day one).
 *
 * POST /api/riders/collect  { orderId }
 *
 * The rider collects cash on delivery and marks the order paid. This records:
 *  - paymentStatus: cod_pending → paid
 *  - codCollectedAt / codCollectedBy (rider id + name) — the audit trail
 *  - an order.payment_changed event (admin day-close + sales pick it up)
 *  - releases the rider (activeOrderId cleared) — job done
 *
 * Guard: only delivery COD orders that are out_for_delivery (or completed) and
 * still cod_pending may be collected. Idempotent: already-paid → no-op success.
 *
 * Auth: staff with the "orders" permission (Phase 2 rider app uses its own
 * session; store layer stays tenant-scoped).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "orders"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const tenant = await readTenant(tenantId);
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (order.paymentMethod !== "cod") {
      return NextResponse.json({ error: "Not a COD order" }, { status: 400 });
    }
    if (order.paymentStatus === "paid" || order.paymentStatus === "verified") {
      // Idempotent — already collected.
      return NextResponse.json({ order, alreadyPaid: true });
    }
    if (order.paymentStatus !== "cod_pending") {
      return NextResponse.json(
        { error: `COD order is ${order.paymentStatus} — cannot collect` },
        { status: 400 },
      );
    }
    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Cancelled order cannot collect COD" }, { status: 400 });
    }

    const actor = `${session.userId ?? session.role ?? "system"}`;
    const riders = await listRiders(tenantId);
    const rider = riders.find((r) => r.activeOrderId === order.id);

    const patched = await patchOrder(tenantId, orderId, {
      paymentStatus: "paid",
      codCollectedAt: new Date().toISOString(),
      codCollectedBy: rider ? `${rider.id} (${rider.name})` : actor,
    });

    // Release the rider — job done.
    if (rider) {
      await setRiderActiveOrder(tenantId, rider.id, undefined);
    }

    emitPaymentChange({
      tenantId,
      orderId,
      orderNumber: order.number,
      paymentStatus: "paid",
      actor: rider ? `${actor} · rider ${rider.id}` : actor,
    });

    return NextResponse.json({
      order: patched,
      riderReleased: rider ? rider.id : null,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
