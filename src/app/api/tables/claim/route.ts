import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, readTenant, claimTable } from "@/lib/db";

export const runtime = "nodejs";

/** Guest claims a reserved table on arrival (within the window). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tenantCode = String(body.tenantCode || "").trim().toUpperCase();
  const tableId = String(body.tableId || "").trim();
  const token = String(body.token || "").trim();

  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(tenantCode) || !tableId || !token) {
    return NextResponse.json({ error: "tenantCode/tableId/token required" }, { status: 400 });
  }

  await ensureStore();
  const meta = await findTenantMetaByCode(tenantCode);
  if (!meta || meta.status === "suspended") {
    return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
  }

  try {
    const table = await claimTable(meta.id, tableId, token);
    const tenant = await readTenant(meta.id);
    return NextResponse.json({
      ok: true,
      table,
      tables: tenant.tables.map((tb) => ({
        id: tb.id,
        label: tb.label,
        status: tb.status,
        reservedBy: tb.reservedBy,
        reservedUntil: tb.reservedUntil,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not claim" }, { status: 409 });
  }
}
