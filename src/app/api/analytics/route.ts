import { NextRequest, NextResponse } from "next/server";
import { ensureStore, listRiders, readTenant } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { buildAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Admin analytics (Phase 3, prompt section 7).
 *
 * GET /api/analytics?days=7
 *   volume: order count + gross per day (zero-filled)
 *   avgFulfillmentMinutes: placed → completed (delivery + all service types)
 *   cancellationRate: cancelled / all
 *   riderUtilization: busy / online riders
 *   avgDeliveryOrderValue + deliveryOrderCount
 *
 * Auth: staff with "home" or "settings" permission (dashboard/owner view).
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings")) && !(await hasPermission(session, "home"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 7));

    const tenant = await readTenant(tenantId);
    const riders = await listRiders(tenantId);
    const report = buildAnalytics(tenant.orders, riders, { days });

    return NextResponse.json({
      from: new Date(Date.now() - days * 86400000).toISOString(),
      to: new Date().toISOString(),
      currency: tenant.shop.currency,
      report,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
