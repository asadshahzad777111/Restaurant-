import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { updatePrintJob } from "@/lib/print-bridge";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const info = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const job = await updatePrintJob(session.tenantId!, id, {
      status: info.status === "failed" ? "failed" : "done",
      error: typeof info.error === "string" ? info.error : null,
      claimedBy: typeof info.station === "string" ? info.station : "android",
    });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
