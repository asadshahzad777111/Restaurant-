import { NextRequest, NextResponse } from "next/server";
import { ensureStore, listTenantsMeta } from "@/lib/db";
import { r2Configured, resendConfigured, storageMode, useMongo, whatsappApiConfigured } from "@/lib/env";
import { mediaBackend } from "@/lib/media";
import { LIVE_API_HOST, LIVE_APP_HOST, LIVE_CONTROL_HOST, LIVE_MEDIA_HOST, publicApiBase, appUrl, controlUrl } from "@/lib/urls";
import { getDb } from "@/lib/mongo";

export const runtime = "nodejs";

/**
 * Uptime monitors: prefer `?ping=1` (cheap) every few minutes on free Vercel/Mongo
 * so instances stay warm. Full JSON is for dashboards.
 */
export async function GET(req: NextRequest) {
  try {
    const pingOnly = new URL(req.url).searchParams.get("ping") === "1";
    if (pingOnly) {
      if (useMongo()) {
        await getDb().then((db) => db.command({ ping: 1 }));
      } else {
        await ensureStore();
      }
      return NextResponse.json(
        { ok: true, ping: true, time: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    await ensureStore();
    const tenants = await listTenantsMeta();
    const mongo = useMongo();
    const r2 = r2Configured();
    return NextResponse.json({
      ok: true,
      service: "ordo",
      mongo,
      r2,
      storage: storageMode(),
      tenants: tenants.length,
      isolation: "per-tenant documents",
      hosts: {
        app: appUrl(),
        control: controlUrl(),
        api: publicApiBase() || "(same-origin)",
        live: {
          app: `https://${LIVE_APP_HOST}`,
          control: `https://${LIVE_CONTROL_HOST}`,
          api: `https://${LIVE_API_HOST}`,
          media: `https://${LIVE_MEDIA_HOST}`,
        },
      },
      integrations: {
        r2,
        media: mediaBackend(),
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
