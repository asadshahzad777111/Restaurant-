import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, readTenant, releaseTable } from "@/lib/db";

export const runtime = "nodejs";

/** Guest cancels a reservation / frees the table. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tenantCode = String(body.tenantCode || "").trim().toUpperCase();
  const tableId = String(body.tableId || "").trim();
  const token = String(body.token || "").trim();

  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(tenantCode) || !tableId) {
    return NextResponse.json({ error: "tenantCode/tableId required" }, { status: 400 });
  }

  await ensureStore();
  const meta = await findTenantMetaByCode(tenantCode);
  if (!meta || meta.status === "suspended") {
    return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
  }

  try {
    const table = await releaseTable(meta.id, tableId, token || undefined);
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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not release" }, { status: 409 });
  }
}
