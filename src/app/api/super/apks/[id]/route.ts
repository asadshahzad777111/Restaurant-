import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSuper } from "@/lib/session";
import {
  APK_APPS,
  readApk,
  readTenantApk,
  removeApk,
  removeTenantApk,
  type ApkId,
} from "@/lib/apks";
import { ensureStore, findTenantMetaById } from "@/lib/db";

export const runtime = "nodejs";

/** Super-only. Template or per-restaurant Staff/Customer APK download & remove. */

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper(req);
    await ensureStore();
    const { id: raw } = await ctx.params;
    const tenantId = new URL(req.url).searchParams.get("tenantId");

    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      if (!["staff", "customer"].includes(raw)) {
        return NextResponse.json({ error: "Unknown APK" }, { status: 404 });
      }
      const file = readTenantApk(meta.id, meta.code, raw as ApkId);
      if (!file) {
        return NextResponse.json({ error: "APK not uploaded yet for this restaurant" }, { status: 404 });
      }
      return new NextResponse(new Uint8Array(file.buffer), {
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": `attachment; filename="${file.filename}"`,
          "Content-Length": String(file.buffer.length),
          "Cache-Control": "no-store",
        },
      });
    }

    if (!APK_APPS.some((a) => a.id === raw)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 404 });
    }
    const file = readApk(raw as ApkId);
    if (!file) {
      return NextResponse.json({ error: "APK not uploaded yet" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Content-Length": String(file.buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper(req);
    await ensureStore();
    const { id: raw } = await ctx.params;
    const tenantId = new URL(req.url).searchParams.get("tenantId");

    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      if (!["staff", "customer"].includes(raw)) {
        return NextResponse.json({ error: "Unknown APK" }, { status: 404 });
      }
      const app = removeTenantApk(meta.id, meta.code, meta.name, raw as ApkId);
      return NextResponse.json({ app, tenant: meta });
    }

    if (!APK_APPS.some((a) => a.id === raw)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 404 });
    }
    const app = removeApk(raw as ApkId);
    return NextResponse.json({ app });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }
}
