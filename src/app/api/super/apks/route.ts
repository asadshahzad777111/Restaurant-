import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSuper } from "@/lib/session";
import { APK_APPS, listApkStatus, saveApk, type ApkId } from "@/lib/apks";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    requireSuper(req);
    return NextResponse.json({ apps: listApkStatus() });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireSuper(req);
    const form = await req.formData();
    const id = String(form.get("id") || "") as ApkId;
    const file = form.get("file");
    if (!APK_APPS.some((a) => a.id === id)) {
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
    const app = saveApk(id, buffer);
    return NextResponse.json({ app });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
