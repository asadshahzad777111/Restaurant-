import { NextRequest, NextResponse } from "next/server";
import { printJobs, touchPrintStation } from "@/lib/print-jobs-service";

export const runtime = "nodejs";

/** POST /api/print-jobs/[id]/claim — a station claims the job to print it. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const info = await req.json().catch(() => ({}));
  const station = String(info.station || "");
  const job = printJobs.claimPrintJob(id, { station });
  if (station) touchPrintStation(station, String(info.name || ""));
  if (!job) return NextResponse.json({ error: "Not found or expired" }, { status: 404 });
  return NextResponse.json({ job });
}
