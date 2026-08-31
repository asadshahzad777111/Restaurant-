import { NextRequest, NextResponse } from "next/server";
import { ensureStore, patchOrder, readTenant, updateStock } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { applyStockMovement } from "@/lib/stock";
import { transition } from "@/lib/order-machine";
import { emitStatusChange } from "@/lib/order-events";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (
      !(await hasPermission(session, "orders")) &&
      !(await hasPermission(session, "kitchen")) &&
      !(await hasPermission(session, "pos"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = await req.json();
    const patch: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      note?: string;
      cancelReason?: string;
    } = {};
    if (body.status) patch.status = body.status;
    if (body.paymentStatus) patch.paymentStatus = body.paymentStatus;
    if (body.note) patch.note = body.note;

    if (body.status === "cancelled") {
      const reason = String(body.cancelReason || body.reason || "").trim();
      if (!reason) {
        return NextResponse.json({ error: "Cancel reason required" }, { status: 400 });
      }
      patch.cancelReason = reason;
      patch.note = reason;
    }

    const tenantBefore = await readTenant(session.tenantId!);
    const prevOrder = tenantBefore.orders.find((o) => o.id === id);
    if (!prevOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // State machine: reject illegal transitions before touching the store.
    // Same-state patches are idempotent no-ops (webhook/retry safe).
    const actor = `${session.userId ?? session.role ?? "system"}`;
    if (patch.status) {
      const result = transition(prevOrder.status, patch.status, {
        actor,
        note: patch.note,
      });
      if (!result.changed) {
        delete patch.status; // leave the order untouched
      }
    }

    const order = await patchOrder(session.tenantId!, id, patch);

    // Restore stock when an order is cancelled (best-effort). Only restore once —
    // i.e. when the order was NOT already cancelled before this patch.
    if (
      patch.status === "cancelled" &&
      order.status === "cancelled" &&
      prevOrder &&
      prevOrder.status !== "cancelled" &&
      (tenantBefore.stock || []).length
    ) {
      try {
        await updateStock(
          session.tenantId!,
          applyStockMovement(tenantBefore.stock || [], order.lines, 1),
        );
      } catch (err) {
        console.error("[stock] restore on cancel failed:", err instanceof Error ? err.message : err);
      }
    }

    // Real-time: broadcast the status change via the isolated event service.
    if (patch.status && order.status !== prevOrder.status) {
      emitStatusChange({
        tenantId: session.tenantId!,
        orderId: order.id,
        orderNumber: order.number,
        from: prevOrder.status,
        to: order.status,
        actor,
      });
    }

    const tenant = await readTenant(session.tenantId!);
    return NextResponse.json({ order, tables: tenant.tables });
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
