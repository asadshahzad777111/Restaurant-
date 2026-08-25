import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { printBridgePublic, printBridgeSnapshot, touchPrintBridge } from "@/lib/print-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" };

/** GET /api/print/bridge — HQ/POS: live lamp for this tenant only. */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE });
    }
    const presence = await printBridgeSnapshot(session.tenantId!);
    return NextResponse.json(presence, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST /api/print/bridge — Staff APK heartbeat { lastSeen, printerName? }. */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const lastSeen = typeof body.lastSeen === "number" ? body.lastSeen : undefined;
    const printerName =
      typeof body.printerName === "string"
        ? body.printerName
        : typeof body.name === "string"
          ? body.name
          : undefined;
    const presence = await touchPrintBridge(session.tenantId!, { lastSeen, printerName });
    return NextResponse.json(printBridgePublic(presence));
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
