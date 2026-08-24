import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { printBridgePublic, touchPrintBridge } from "@/lib/print-bridge";

export const runtime = "nodejs";

/** Legacy alias of POST /api/print/bridge. */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const presence = await touchPrintBridge(session.tenantId!, {
      printerName: typeof body.name === "string" ? body.name : typeof body.printerName === "string" ? body.printerName : undefined,
    });
    return NextResponse.json(printBridgePublic(presence));
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
