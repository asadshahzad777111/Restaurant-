import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { createPrintJob, listQueuedPrintJobs, printBridgePublic, readPrintBridge, touchPrintBridge } from "@/lib/print-bridge";

export const runtime = "nodejs";

/** GET /api/print/jobs — queued slips for this tenant only. Staff APK polls ~1.5s. */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const station = req.nextUrl.searchParams.get("station");
    if (station === "android") {
      await touchPrintBridge(tenantId);
    }
    const [jobs, presence] = await Promise.all([listQueuedPrintJobs(tenantId), readPrintBridge(tenantId)]);
    return NextResponse.json({ jobs, bridge: printBridgePublic(presence, jobs.length) });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST /api/print/jobs — laptop / iPhone enqueue a bill or kitchen ticket. */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = body.kind === "kitchen" ? "kitchen" : "bill";
    const job = await createPrintJob(session.tenantId!, {
      kind,
      text: typeof body.text === "string" ? body.text : "",
      html: typeof body.html === "string" ? body.html : undefined,
      qrUrl: typeof body.qrUrl === "string" ? body.qrUrl : undefined,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
      logoEscPosBase64: typeof body.logoEscPosBase64 === "string" ? body.logoEscPosBase64 : undefined,
      orderId: typeof body.orderId === "string" ? body.orderId : typeof body.order_id === "string" ? body.order_id : null,
      orderRef: typeof body.orderRef === "string" ? body.orderRef : typeof body.order_ref === "string" ? body.order_ref : null,
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
