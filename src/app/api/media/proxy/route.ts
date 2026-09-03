import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { resolveLocalMedia } from "@/lib/media";
import { r2PublicBase } from "@/lib/env";
import { getR2Object } from "@/lib/r2";
import { LIVE_APP_HOST, LIVE_MEDIA_HOST } from "@/lib/urls";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
} as const;

function imageResponse(body: Buffer | Uint8Array, contentType: string) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType || "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
      ...CORS,
    },
  });
}

function isAllowedLogoHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === LIVE_MEDIA_HOST || h === LIVE_APP_HOST) return true;
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (h.endsWith(".r2.dev")) return true;
  const base = r2PublicBase();
  if (base) {
    try {
      if (new URL(base).hostname.toLowerCase() === h) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function localFromPath(pathname: string): ReturnType<typeof resolveLocalMedia> {
  const clean = pathname.replace(/^\/api\/media\//, "").replace(/^\//, "");
  if (!clean.startsWith("tenants/")) return null;
  return resolveLocalMedia(clean.split("/"));
}

/**
 * Same-origin logo proxy.
 *
 * The 58mm logo can live on R2 (https://…r2.dev/… or media.ordo.asfins.com) or
 * the local file-store (/api/media/…). The ESC/POS rasterizer draws the logo on
 * a <canvas> from the STAFF page origin. A raw R2 URL is cross-origin, which
 * taints the canvas → getImageData() throws → logo silently missing from the
 * thermal bill.
 *
 * This route streams the logo through the app origin (server-side fetch / R2
 * get, no browser CORS). Only this kitchen's media hosts are accepted (SSRF guard).
 */
export async function GET(req: NextRequest) {
  const raw = (req.nextUrl.searchParams.get("url") || "").trim();
  if (!raw) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Local file-store: relative /api/media/tenants/… or already that path.
  if (raw.startsWith("/api/media/") && !raw.startsWith("//") && !raw.startsWith("/api/media/proxy")) {
    const found = localFromPath(raw);
    if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return imageResponse(fs.readFileSync(found.file), found.contentType);
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }
  if (!isAllowedLogoHost(target.hostname)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  // Absolute app URL pointing at the local file-store.
  if (target.pathname.startsWith("/api/media/") && !target.pathname.startsWith("/api/media/proxy")) {
    const found = localFromPath(target.pathname);
    if (found) return imageResponse(fs.readFileSync(found.file), found.contentType);
  }

  const key = target.pathname.replace(/^\//, "");
  if (key.startsWith("tenants/") && !key.includes("..")) {
    const hit = await getR2Object(key);
    if (hit) return imageResponse(hit.body, hit.contentType);
  }

  try {
    const res = await fetch(target.toString(), { redirect: "follow" });
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get("content-type") || "image/png";
    if (ct.startsWith("text/") || ct.includes("html")) {
      return NextResponse.json({ error: "Not an image" }, { status: 415 });
    }
    return imageResponse(buf, ct);
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
