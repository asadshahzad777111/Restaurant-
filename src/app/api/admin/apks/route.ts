import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { ensureStore, findTenantMetaById, readTenant } from "@/lib/db";
import { listTenantApkStatus, readTenantApk, type ApkId } from "@/lib/apks";

export const runtime = "nodejs";

/**
 * Restaurant Admin only — see/download THIS kitchen’s Staff + Customer APKs.
 * Never lists another tenant. Upload stays Super-only.
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings")) && session.role !== "tenant_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const meta = await findTenantMetaById(tenantId);
    const tenant = await readTenant(tenantId);
    if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

    const slot = new URL(req.url).searchParams.get("download") as ApkId | null;
    if (slot === "staff" || slot === "customer") {
      const file = readTenantApk(meta.id, meta.code, slot);
      if (!file) {
        return NextResponse.json(
          { error: "APK not ready yet — ask ORDO Super to upload your branded app" },
          { status: 404 },
        );
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

    const apps = listTenantApkStatus({
      tenantId: meta.id,
      code: meta.code,
      name: tenant.branding.name || meta.name,
    });
    return NextResponse.json({
      restaurant: {
        id: meta.id,
        code: meta.code,
        name: tenant.branding.name || meta.name,
        logoUrl: tenant.branding.logoUrl || "",
      },
      apps,
      note: "Give Customer APK to diners only. Staff APK is for your kitchen team. Both are locked to this code — no mix-up.",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
