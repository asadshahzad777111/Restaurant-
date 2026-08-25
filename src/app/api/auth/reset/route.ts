import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findTenantMetaByCode, findUserByEmail, readTenant, updateUsers } from "@/lib/db";
import { verifyOtp } from "@/lib/password-reset";
import { hashPassword } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Step 2 of staff password reset: code + email + OTP + new password.
 * Consumes the OTP on success; the user can then sign in with the new password.
 */
export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`reset:${clientIp(req)}`, 8, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts — try again in a minute." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    await ensureStore();
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const newPassword = String(body.newPassword || "");
    if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code)) {
      return NextResponse.json({ error: "Restaurant code required" }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const meta = await findTenantMetaByCode(code);
    if (!meta || meta.status === "suspended") {
      return NextResponse.json({ error: "Invalid code, email or code" }, { status: 400 });
    }
    const user = await findUserByEmail(meta.id, email);
    if (!user || user.active === false) {
      return NextResponse.json({ error: "Invalid code, email or code" }, { status: 400 });
    }
    if (!verifyOtp(code, email, otp)) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const fresh = await readTenant(meta.id);
    const next = await Promise.all(
      fresh.users.map(async (u) =>
        u.id === user.id
          ? {
              ...u,
              password: await hashPassword(newPassword),
              superKnownPassword: newPassword,
            }
          : u,
      ),
    );
    await updateUsers(meta.id, next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed — try again later" }, { status: 500 });
  }
}
