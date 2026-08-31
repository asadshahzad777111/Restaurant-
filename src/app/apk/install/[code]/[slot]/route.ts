import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, readTenant } from "@/lib/db";

export const runtime = "nodejs";

const STAFF_APK_URL =
  "https://github.com/asadshahzad777111/Restaurant-/releases/download/ordo-apps-v1/ORDO-Staff.apk";

/**
 * Per-restaurant APK install link for a receipt QR / admin share.
 * Gated by tenant.branding.allowApk. Public distribution is Staff APK only —
 * guest ordering is web/QR (no Customer APK). Slot = staff.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; slot: string }> },
) {
  const { code: rawCode, slot } = await params;
  const code = String(rawCode || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code)) {
    return new NextResponse(null, { status: 404 });
  }
  const slotNorm = String(slot || "").toLowerCase();
  // Customer Android APK is retired — guests use the web menu / table QR.
  if (slotNorm !== "staff") {
    return new NextResponse(null, { status: 404 });
  }

  await ensureStore();
  const meta = await findTenantMetaByCode(code);
  if (!meta || meta.status === "suspended") {
    return new NextResponse(null, { status: 404 });
  }
  const tenant = await readTenant(meta.id);
  if (!tenant.branding.allowApk) {
    // Not permitted → no content, no warning, no download.
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(STAFF_APK_URL, { status: 302 });
}
