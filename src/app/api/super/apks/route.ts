import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSuper } from "@/lib/session";
import {
  APK_APPS,
  listApkStatus,
  listTenantApkStatus,
  saveApk,
  saveTenantApk,
  type ApkId,
} from "@/lib/apks";
import { ensureStore, findTenantMetaById, listTenantsMeta } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await requireSuper(req);
    await ensureStore();
    const tenantId = new URL(req.url).searchParams.get("tenantId");
    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      return NextResponse.json({
        apps: listTenantApkStatus({ tenantId: meta.id, code: meta.code, name: meta.name }),
        tenant: meta,
      });
    }
    const tenants = await listTenantsMeta();
    return NextResponse.json({
      templates: listApkStatus(),
      restaurants: tenants.map((t) => ({
        tenant: t,
        apps: listTenantApkStatus({ tenantId: t.id, code: t.code, name: t.name }),
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuper(req);
    await ensureStore();
    const form = await req.formData();
    const id = String(form.get("id") || "") as ApkId;
    const tenantId = String(form.get("tenantId") || "").trim();
    const file = form.get("file");
    if (!["staff", "customer"].includes(id)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "APK file required" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".apk")) {
      return NextResponse.json({ error: "File must be .apk" }, { status: 400 });
    }
    if (file.size > 120 * 1024 * 1024) {
      return NextResponse.json({ error: "APK too large" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      const app = saveTenantApk(meta.id, meta.code, meta.name, id, buffer);
      return NextResponse.json({ app, tenant: meta });
    }

    if (!APK_APPS.some((a) => a.id === id)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 400 });
    }
    const app = saveApk(id, buffer);
    return NextResponse.json({ app });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
