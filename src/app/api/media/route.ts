import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { saveMedia, type MediaKind } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = requireTenantSession(req);
    const tenantId = session.tenantId!;
    const form = await req.formData();
    const kind = String(form.get("kind") || "") as MediaKind;
    const file = form.get("file");
    if (kind === "logo" && !hasPermission(session, "settings")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (kind === "menu" && !hasPermission(session, "menu") && !hasPermission(session, "settings")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file required" }, { status: 400 });
    }
    const contentType = file.type || "application/octet-stream";
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = await saveMedia({ tenantId, kind, bytes, contentType });
    return NextResponse.json(saved);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
