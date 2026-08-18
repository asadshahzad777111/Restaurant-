import { NextResponse } from "next/server";
import { ensureStore, listTenantsMeta } from "@/lib/db";
import { r2Configured, resendConfigured, storageMode, whatsappApiConfigured } from "@/lib/env";
import { LIVE_API_HOST, LIVE_APP_HOST, LIVE_MEDIA_HOST, publicApiBase, appUrl } from "@/lib/urls";

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
      hosts: {
        app: appUrl(),
        api: publicApiBase() || "(same-origin)",
        live: {
          app: `https://${LIVE_APP_HOST}`,
          api: `https://${LIVE_API_HOST}`,
          media: `https://${LIVE_MEDIA_HOST}`,
        },
      },
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
