import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSuper } from "@/lib/session";
import { APK_APPS, readApk, type ApkId } from "@/lib/apks";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSuper(req);
    const { id } = await ctx.params;
    if (!APK_APPS.some((a) => a.id === id)) {
      return NextResponse.json({ error: "Unknown APK" }, { status: 404 });
    }
    const file = readApk(id as ApkId);
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
