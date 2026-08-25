import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { createPrintJob, listQueuedPrintJobs, printBridgePublic, readPrintBridge, touchPrintBridge } from "@/lib/print-bridge";

export const runtime = "nodejs";

/** Legacy alias of GET/POST /api/print/jobs — same tenant-scoped store. */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const job = await createPrintJob(session.tenantId!, {
      kind: body.kind === "kitchen" ? "kitchen" : "bill",
      text: typeof body.text === "string" ? body.text : "",
      qrUrl: typeof body.qrUrl === "string" ? body.qrUrl : undefined,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
      orderId: (body.orderId as string) ?? (body.order_id as string) ?? null,
      orderRef: (body.orderRef as string) ?? (body.order_ref as string) ?? null,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    if (req.nextUrl.searchParams.get("station") === "android") {
      await touchPrintBridge(tenantId);
    }
    const [jobs, presence] = await Promise.all([listQueuedPrintJobs(tenantId), readPrintBridge(tenantId)]);
    const bridge = printBridgePublic(presence);
    return NextResponse.json({
      jobs,
      stations: { android: { station: "android", online: bridge.connected, lastSeen: bridge.lastSeen, name: bridge.printerName } },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
