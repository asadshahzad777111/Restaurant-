import { NextRequest, NextResponse } from "next/server";
import {
  archiveOldOrders,
  countArchivedOrders,
  ensureStore,
  queryArchivedOrders,
  readTenant,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Order archive endpoints (tenant session required):
 * - GET  ?limit&offset&from&to → query archived orders for this kitchen
 * - GET  ?count=1              → archived order count (Settings card)
 * - POST { retentionDays? }    → run the archive sweep now
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const { searchParams } = new URL(req.url);

    if (searchParams.get("count") === "1") {
      return NextResponse.json({ count: await countArchivedOrders(tenantId) });
    }

    const limit = Math.min(Number(searchParams.get("limit") || 500), 1000);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
    const orders = await queryArchivedOrders(tenantId, {
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit,
      offset,
    });
    return NextResponse.json({ orders });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const body = await req.json().catch(() => ({}));
    const t = await readTenant(tenantId);
    const retentionDays =
      Number(body.retentionDays) || t.shop?.archiveRetentionDays || 90;
    const result = await archiveOldOrders(tenantId, retentionDays);
    return NextResponse.json({
      ok: true,
      archived: result.archived,
      skipped: result.skipped,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  }
}
