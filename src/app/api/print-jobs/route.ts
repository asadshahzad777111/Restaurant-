import { NextRequest, NextResponse } from "next/server";
import { printJobs, printStations, touchPrintStation } from "@/lib/print-jobs-service";

export const runtime = "nodejs";

/** POST /api/print-jobs = create a job; GET ?station=android = list pending + stations. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const job = printJobs.createPrintJob({
    text: typeof body.text === "string" ? body.text : "",
    dataBase64: typeof body.data_base64 === "string" ? body.data_base64 : "",
    target: typeof body.target === "string" ? body.target : "any",
    orderId: (body.orderId as string) ?? (body.order_id as string) ?? null,
    orderRef: (body.orderRef as string) ?? (body.order_ref as string) ?? null,
  });
  return NextResponse.json({ job }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const station = req.nextUrl.searchParams.get("station") || undefined;
  if (station) touchPrintStation(station);
  const jobs = printJobs.listPendingPrintJobs(station);
  return NextResponse.json({ jobs, stations: printStations() });
}
