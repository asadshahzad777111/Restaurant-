import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, readTenant } from "@/lib/db";

export const runtime = "nodejs";

const CUSTOMER_APK_URL =
  "https://github.com/asadshahzad777111/Restaurant-/releases/download/ordo-apps-v1/ORDO-Customer.apk";
const STAFF_APK_URL =
  "https://github.com/asadshahzad777111/Restaurant-/releases/download/ordo-apps-v1/ORDO-Staff.apk";

/**
 * Per-restaurant APK install link for a receipt QR / admin share.
 * Gated by tenant.branding.allowApk: if a kitchen hasn't enabled APK
 * distribution, this returns 404 (no content, no warning) so customers can't
 * download unless the admin allowed it. Slot = staff | customer.
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

  const url = slotNorm === "staff" ? STAFF_APK_URL : CUSTOMER_APK_URL;
  return NextResponse.redirect(url, { status: 302 });
}
