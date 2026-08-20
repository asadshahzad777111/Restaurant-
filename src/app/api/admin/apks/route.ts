import { NextRequest, NextResponse } from "next/server";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { ensureStore, findTenantMetaById, readTenant } from "@/lib/db";
import { listTenantApkStatus, parseApkFormat, readTenantApk, type ApkId } from "@/lib/apks";

export const runtime = "nodejs";

/**
 * Restaurant Admin only — see/download THIS kitchen’s Staff + Customer APK/AAB.
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

    const url = new URL(req.url);
    const slot = url.searchParams.get("download") as ApkId | null;
    const format = parseApkFormat(url.searchParams.get("format"));
    if (slot === "staff" || slot === "customer") {
      const file = readTenantApk(meta.id, meta.code, slot, format);
      if (!file) {
        return NextResponse.json(
          {
            error:
              format === "aab"
                ? "Play Store AAB not ready — ask ORDO Super to upload your branded .aab"
                : "APK not ready yet — ask ORDO Super to upload your branded app",
          },
          { status: 404 },
        );
      }
      return new NextResponse(new Uint8Array(file.buffer), {
        headers: {
          "Content-Type": file.contentType,
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
      note: "Customer APK → diners (WhatsApp). Customer AAB → Google Play upload. Both locked to this code only.",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
