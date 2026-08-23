import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, getPublicMenu } from "@/lib/db";
import { tenantApkLoadsPath, type ApkId } from "@/lib/apk-urls";

export const runtime = "nodejs";

function safeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24);
}

function parseApp(raw: string | null): ApkId {
  return raw === "staff" ? "staff" : "customer";
}

/**
 * Per-kitchen web manifest for iOS Add to Home Screen + Android PWA.
 * Isolation: start_url always includes tenant=CODE + app=staff|customer.
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const url = new URL(req.url);
    const code = safeCode(url.searchParams.get("tenant") || "");
    const app = parseApp(url.searchParams.get("app"));

    if (!code || code.length < 2) {
      return NextResponse.json({ error: "tenant required" }, { status: 400 });
    }

    const meta = await findTenantMetaByCode(code);
    if (!meta) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const pub = await getPublicMenu(meta.id);
    const name = (pub.branding?.name || meta.name || code).trim() || code;
    const title = app === "staff" ? `${name} · Staff` : `${name} · Order`;
    const shortName = name.length > 12 ? `${name.slice(0, 11)}…` : name;
    const startPath = tenantApkLoadsPath(code, app);
    const logo = (pub.branding?.logoUrl || "").trim();

    const icons: Array<Record<string, string>> = [];
    if (logo && /^https?:\/\//i.test(logo)) {
      icons.push({
        src: logo,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      });
    }
    icons.push(
      {
        src: "/ordo-mark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ordo-mark-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/ordo-apple-touch.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ordo-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    );

    const manifest = {
      id: `/pwa/${app}/${code}`,
      name: title,
      short_name: shortName,
      description:
        app === "staff"
          ? `${name} staff POS, orders, and kitchen — ORDO`
          : `${name} guest ordering — ORDO`,
      start_url: startPath,
      scope: "/",
      display: "standalone",
      background_color: "#14110e",
      theme_color: "#ff8500",
      orientation: "portrait",
      icons,
    };

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
