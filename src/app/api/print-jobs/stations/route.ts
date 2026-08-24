import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { printBridgePublic, readPrintBridge } from "@/lib/print-bridge";

export const runtime = "nodejs";

/** Legacy alias of GET /api/print/bridge. */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const bridge = printBridgePublic(await readPrintBridge(session.tenantId!));
    return NextResponse.json({
      stations: {
        android: {
          station: "android",
          online: bridge.connected,
          lastSeen: bridge.lastSeen,
          name: bridge.printerName,
        },
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
