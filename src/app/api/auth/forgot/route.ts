import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, findUserByEmail, readTenant } from "@/lib/db";
import { issueOtp, otpTtlMs } from "@/lib/password-reset";
import { sendResetOtpEmail } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Step 1 of staff password reset: accept a restaurant code + the user's email,
 * send a 6-digit OTP. Responds identically whether or not the email exists so
 * we don't leak which emails are registered.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`forgot:${clientIp(req)}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests — try again in a minute." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    await ensureStore();
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code)) {
      return NextResponse.json({ error: "Restaurant code required" }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const meta = await findTenantMetaByCode(code);
    if (!meta || meta.status === "suspended") {
      // Identical response — do not reveal whether the kitchen exists.
      return NextResponse.json({ ok: true });
    }
    const user = await findUserByEmail(meta.id, email);
    if (!user || user.active === false) {
      return NextResponse.json({ ok: true });
    }

    const otp = issueOtp(code, email);
    const tenant = await readTenant(meta.id);
    await sendResetOtpEmail({
      to: email,
      restaurantName: tenant.branding.name || meta.name || code,
      otp,
      ttlMin: Math.round(otpTtlMs() / 60000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed — try again later" }, { status: 500 });
  }
}
