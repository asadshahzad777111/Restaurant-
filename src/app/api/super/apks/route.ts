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
import { r2Configured } from "@/lib/env";

export const runtime = "nodejs";
/** Large APK/AAB uploads (Vercel Pro soft limit; platform request cap is still ~4.5MB). */
export const maxDuration = 60;

function errorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}

export async function GET(req: NextRequest) {
  try {
    await requireSuper(req);
    await ensureStore();
    const tenantId = new URL(req.url).searchParams.get("tenantId");
    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      return NextResponse.json({
        apps: await listTenantApkStatus({ tenantId: meta.id, code: meta.code, name: meta.name }),
        tenant: meta,
        storage: r2Configured() ? "r2" : "file-store",
        playStoreNote:
          "Upload .aab for Google Play Console. Upload .apk for Admin → customer sideload. Same kitchen code — no mix-up.",
      });
    }
    const tenants = await listTenantsMeta();
    return NextResponse.json({
      templates: await listApkStatus(),
      storage: r2Configured() ? "r2" : "file-store",
      restaurants: await Promise.all(
        tenants.map(async (t) => ({
          tenant: t,
          apps: await listTenantApkStatus({ tenantId: t.id, code: t.code, name: t.name }),
        })),
      ),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: errorMessage(e, "Failed") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuper(req);
    await ensureStore();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not read upload body (often over Vercel’s ~4.5MB request limit). Use a smaller APK or contact support for direct R2 upload.",
        },
        { status: 413 },
      );
    }

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
      return NextResponse.json({ error: "File too large (max 200MB)" }, { status: 400 });
    }
    if (file.size > 4.2 * 1024 * 1024 && process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "File is over ~4.2MB — Vercel serverless rejects larger request bodies. Build a smaller APK or ask for direct R2 upload support.",
        },
        { status: 413 },
      );
    }

    if (process.env.VERCEL && !r2Configured()) {
      return NextResponse.json(
        {
          error:
            "R2 not configured on Vercel — APK uploads need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL",
        },
        { status: 503 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (tenantId) {
      const meta = await findTenantMetaById(tenantId);
      if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
      const app = await saveTenantApk(meta.id, meta.code, meta.name, id, buffer, format);
      return NextResponse.json({
        app,
        tenant: meta,
        format,
        storage: r2Configured() ? "r2" : "file-store",
      });
    }

    if (format === "aab") {
      return NextResponse.json({ error: "Templates are APK only; use per-restaurant AAB upload" }, { status: 400 });
    }
    if (!APK_APPS.some((a) => a.id === id)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 400 });
    }
    const app = await saveApk(id, buffer);
    return NextResponse.json({
      app,
      format: parseApkFormat("apk"),
      storage: r2Configured() ? "r2" : "file-store",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: errorMessage(e, "Upload failed") }, { status: 500 });
  }
}
