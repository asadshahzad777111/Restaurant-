import { NextRequest, NextResponse } from "next/server";
import { printJobs, touchPrintStation } from "@/lib/print-jobs-service";

export const runtime = "nodejs";

/** POST /api/print-jobs/[id]/complete — mark done/failed. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const info = await req.json().catch(() => ({}));
  const status = info.status === "failed" ? "failed" : "done";
  if (info.station) touchPrintStation(String(info.station));
  const job = printJobs.completePrintJob(id, {
    status,
    error: typeof info.error === "string" ? info.error : null,
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}
