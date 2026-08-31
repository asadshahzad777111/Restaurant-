import { NextRequest, NextResponse } from "next/server";
import { ensureStore, readTenant } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { buildPayout, DEFAULT_COMMISSION_PCT } from "@/lib/payout";

export const runtime = "nodejs";

/**
 * Payout summary (Phase 3 — commission transparency).
 *
 * GET /api/payouts?days=7
 *   gross, platform commission (shop.commissionPct, default 10%), COD cash
 *   collected by riders, and net payout to the restaurant.
 *
 * Auth: staff with "home" or "settings" permission (owner view).
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
    const to = new Date();
    const from = new Date(Date.now() - days * 86_400_000);

    const summary = buildPayout(tenant.orders, {
      from,
      to,
      commissionPct: tenant.shop.commissionPct ?? DEFAULT_COMMISSION_PCT,
      currency: tenant.shop.currency,
    });

    return NextResponse.json({ summary });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
