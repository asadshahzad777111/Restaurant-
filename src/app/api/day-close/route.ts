import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { addDayClose, readTenant } from "@/lib/tenant-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    ensureBootstrap();
    const session = requireTenantSession(req);
    if (!hasPermission(session, "settings") && !hasPermission(session, "home")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenant = readTenant(session.tenantId!);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to") || new Date().toISOString();
    const fromMs = from ? new Date(from).getTime() : Date.now() - 24 * 60 * 60 * 1000;
    const toMs = new Date(to).getTime();

    const slice = tenant.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });

    const byPayment: Record<string, number> = {};
    let grossTotal = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    for (const o of slice) {
      if (o.status === "cancelled") {
        cancelledCount += 1;
        continue;
      }
      if (o.status === "completed") completedCount += 1;
      grossTotal += o.total;
      const key = o.paymentMethod;
      byPayment[key] = (byPayment[key] || 0) + o.total;
    }

    return NextResponse.json({
      preview: {
        from: new Date(fromMs).toISOString(),
        to: new Date(toMs).toISOString(),
        orderCount: slice.length,
        cancelledCount,
        completedCount,
        grossTotal,
        byPayment,
      },
      history: tenant.dayCloses || [],
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrap();
    const session = requireTenantSession(req);
    if (!hasPermission(session, "settings") && session.role !== "tenant_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const from = body.from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = body.to || new Date().toISOString();
    const tenant = readTenant(session.tenantId!);
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const slice = tenant.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });
    const byPayment: Record<string, number> = {};
    let grossTotal = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    for (const o of slice) {
      if (o.status === "cancelled") {
        cancelledCount += 1;
        continue;
      }
      if (o.status === "completed") completedCount += 1;
      grossTotal += o.total;
      byPayment[o.paymentMethod] = (byPayment[o.paymentMethod] || 0) + o.total;
    }
    const summary = addDayClose(session.tenantId!, {
      closedAt: new Date().toISOString(),
      closedBy: session.userId,
      from,
      to,
      orderCount: slice.length,
      cancelledCount,
      completedCount,
      grossTotal,
      byPayment,
      note: body.note,
    });
    return NextResponse.json({ summary });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
