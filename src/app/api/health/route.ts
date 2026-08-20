import { NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { isR2Configured, mediaBackend } from "@/lib/media";

export const runtime = "nodejs";

/** Public liveness — no secrets. integrations.r2 is true only when R2 env vars are all set. */
export async function GET() {
  ensureBootstrap();
  return NextResponse.json({
    ok: true,
    service: "ordo",
    integrations: {
      r2: isR2Configured(),
      media: mediaBackend(),
    },
  });
}
