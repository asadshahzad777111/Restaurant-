import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, readTenant, reserveTable, tableToken } from "@/lib/db";

export const runtime = "nodejs";

/** Guest reserves a table (anti double-book): only when the table is empty. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tenantCode = String(body.tenantCode || "").trim().toUpperCase();
  const tableId = String(body.tableId || "").trim();
  const name = String(body.name || "").trim().slice(0, 60);
  const minutes = Math.min(Math.max(Number(body.minutes) || 20, 5), 120);

  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(tenantCode) || !tableId) {
    return NextResponse.json({ error: "tenantCode/tableId required" }, { status: 400 });
  }

  await ensureStore();
  const meta = await findTenantMetaByCode(tenantCode);
  if (!meta || meta.status === "suspended") {
    return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
  }

  try {
    const token = tableToken();
    const table = await reserveTable(meta.id, tableId, name, minutes, token);
    const tenant = await readTenant(meta.id);
    return NextResponse.json({
      ok: true,
      table: table.status === "reserved" ? table : undefined,
      token: table.status === "reserved" ? token : undefined,
      reservedBy: table.reservedBy,
      reservedUntil: table.reservedUntil,
      tables: tenant.tables.map((tb) => ({
        id: tb.id,
        label: tb.label,
        status: tb.status,
        reservedBy: tb.reservedBy,
        reservedUntil: tb.reservedUntil,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not reserve" }, { status: 409 });
  }
}
