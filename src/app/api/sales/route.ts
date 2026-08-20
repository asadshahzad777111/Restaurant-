import { NextRequest, NextResponse } from "next/server";
import { ensureStore, readTenant } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";

export const runtime = "nodejs";

/** Profit Profile data — same catalog as POS/guest; costs never leave staff session. */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings")) && !(await hasPermission(session, "home"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenant = await readTenant(session.tenantId!);
    const { searchParams } = new URL(req.url);
    const to = searchParams.get("to") || new Date().toISOString();
    const from =
      searchParams.get("from") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();

    const costById = new Map(tenant.menu.map((m) => [m.id, m.costPrice ?? 0]));
    const slice = tenant.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });

    const byPayment: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const itemQty = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    let gross = 0;
    let cogs = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    let openCount = 0;

    for (const o of slice) {
      if (o.status === "cancelled") {
        cancelledCount += 1;
        continue;
      }
      if (o.status === "completed") completedCount += 1;
      else openCount += 1;

      gross += o.total;
      byPayment[o.paymentMethod] = (byPayment[o.paymentMethod] || 0) + o.total;
      byChannel[o.channel] = (byChannel[o.channel] || 0) + o.total;
      byService[o.serviceType] = (byService[o.serviceType] || 0) + o.total;

      for (const line of o.lines) {
        const unitCost = costById.get(line.itemId) || 0;
        const lineCost = unitCost * line.qty;
        const lineRev = line.unitPrice * line.qty;
        cogs += lineCost;
        const hit = itemQty.get(line.itemId) || {
          name: line.name,
          qty: 0,
          revenue: 0,
          cost: 0,
        };
        hit.qty += line.qty;
        hit.revenue += lineRev;
        hit.cost += lineCost;
        itemQty.set(line.itemId, hit);
      }
    }

    const topItems = [...itemQty.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12)
      .map((i) => ({
        name: i.name,
        qty: i.qty,
        revenue: i.revenue,
        cost: i.cost,
        margin: i.revenue - i.cost,
      }));

    const estimatedProfit = gross - cogs;
    const marginPct = gross > 0 ? Math.round((estimatedProfit / gross) * 1000) / 10 : 0;

    return NextResponse.json({
      from: new Date(fromMs).toISOString(),
      to: new Date(toMs).toISOString(),
      currency: tenant.shop.currency,
      summary: {
        orderCount: slice.length,
        completedCount,
        cancelledCount,
        openCount,
        gross,
        cogs,
        estimatedProfit,
        marginPct,
        costsConfigured: tenant.menu.some((m) => (m.costPrice || 0) > 0),
      },
      byPayment,
      byChannel,
      byService,
      topItems,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
