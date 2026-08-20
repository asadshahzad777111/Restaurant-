import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaById } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { r2Configured } from "@/lib/env";
import { uploadPublicAsset } from "@/lib/r2";
import { planAllows } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings")) && !(await hasPermission(session, "menu"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!r2Configured()) {
      return NextResponse.json(
        {
          error: "R2 not configured",
          hint: "Add R2_* env vars in Vercel → Project → Settings → Environment Variables",
        },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const kind = String(form.get("kind") || "menu");
    const meta = session.tenantId ? await findTenantMetaById(session.tenantId) : null;
    if (kind === "logo" && !planAllows(meta?.planId, "logo")) {
      return NextResponse.json({ error: "Upgrade to Pro to upload a logo" }, { status: 403 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = `tenants/${session.tenantId}/${kind}/${Date.now()}.${ext}`;
    const result = await uploadPublicAsset({
      key,
      body: buf,
      contentType: file.type || "application/octet-stream",
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({ url: result.url, key: result.key });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
