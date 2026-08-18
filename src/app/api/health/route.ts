import { NextResponse } from "next/server";
import { ensureStore, listTenantsMeta } from "@/lib/db";
import { r2Configured, resendConfigured, storageMode, whatsappApiConfigured } from "@/lib/env";

export const runtime = "nodejs";

/** Uptime monitors can hit this. No secrets returned. */
export async function GET() {
  try {
    await ensureStore();
    const tenants = await listTenantsMeta();
    return NextResponse.json({
      ok: true,
      storage: storageMode(),
      tenants: tenants.length,
      isolation: "per-tenant documents",
      integrations: {
        r2: r2Configured(),
        resend: resendConfigured(),
        whatsappApi: whatsappApiConfigured(),
      },
      time: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unhealthy" },
      { status: 500 },
    );
  }
}
