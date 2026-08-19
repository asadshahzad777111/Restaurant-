import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { patchOrder, readTenant } from "@/lib/tenant-store";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureBootstrap();
    const session = requireTenantSession(req);
    if (
      !hasPermission(session, "orders") &&
      !hasPermission(session, "kitchen") &&
      !hasPermission(session, "pos")
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

    const order = patchOrder(session.tenantId!, id, patch);
    const tenant = readTenant(session.tenantId!);
    return NextResponse.json({ order, tables: tenant.tables });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
