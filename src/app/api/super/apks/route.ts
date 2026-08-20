import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSuper } from "@/lib/session";
import {
  APK_APPS,
  listApkStatus,
  listTenantApkStatus,
  parseApkFormat,
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
        playStoreNote:
          "Upload .aab for Google Play Console. Upload .apk for Admin → customer sideload. Same kitchen code — no mix-up.",
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
      return NextResponse.json({ error: "APK/AAB file required" }, { status: 400 });
    }
    const lower = file.name.toLowerCase();
    const format = lower.endsWith(".aab") ? "aab" : lower.endsWith(".apk") ? "apk" : null;
    if (!format) {
      return NextResponse.json({ error: "File must be .apk or .aab (Play Store)" }, { status: 400 });
    }
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      const app = saveTenantApk(meta.id, meta.code, meta.name, id, buffer, format);
      return NextResponse.json({ app, tenant: meta, format });
    }

    if (format === "aab") {
      return NextResponse.json({ error: "Templates are APK only; use per-restaurant AAB upload" }, { status: 400 });
    }
    if (!APK_APPS.some((a) => a.id === id)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 400 });
    }
    const app = saveApk(id, buffer);
    return NextResponse.json({ app, format: parseApkFormat("apk") });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
