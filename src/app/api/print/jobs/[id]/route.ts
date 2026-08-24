import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { updatePrintJob, type PrintJobStatus } from "@/lib/print-bridge";

export const runtime = "nodejs";

function asStatus(raw: unknown): PrintJobStatus | null {
  if (raw === "queued" || raw === "printing" || raw === "done" || raw === "failed") return raw;
  if (raw === "pending") return "queued";
  if (raw === "claimed") return "printing";
  return null;
}

/** POST /api/print/jobs/[id] — claim (printing) or ack done/failed. Tenant-scoped. */
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
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const status = asStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "status must be printing, done, or failed" }, { status: 400 });
    }
    const job = await updatePrintJob(session.tenantId!, id, {
      status,
      error: typeof body.error === "string" ? body.error : null,
      claimedBy: typeof body.station === "string" ? body.station : "android",
    });
    if (!job) return NextResponse.json({ error: "Not found or already claimed" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
