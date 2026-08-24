import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  loginSuper,
  loginTenant,
  logout,
  getBearerToken,
  getSessionUser,
  publicUser,
} from "@/lib/session";
import { HELP_MODE_COOKIE } from "@/lib/help-mode";
import { ensureStore, findSession, readTenantStaffView } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Brute-force throttle: 10 login attempts / min per IP.
    const rl = rateLimit(`login:${clientIp(req)}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts — wait a minute and try again." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    await ensureStore();
    const body = await req.json();
    const { mode, username, password, code, app } = body as {
      mode?: "super" | "tenant";
      username: string;
      password: string;
      code?: string;
      app?: string;
    };
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const staffApp = app === "staff" || app === "pos" || app === "client";
    if (staffApp && (mode === "super" || (!code && mode !== "tenant"))) {
      return NextResponse.json(
        { error: "Staff app is for kitchen login only — platform HQ is not available here." },
        { status: 403 },
      );
    }
    if (mode === "super" || (!code && mode !== "tenant")) {
      const session = await loginSuper(username, password);
      const res = NextResponse.json({ token: session.token, session });
      res.cookies.set(HELP_MODE_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }
    if (!code) return NextResponse.json({ error: "Restaurant code required" }, { status: 400 });
    const session = await loginTenant(code, username, password);
    const user = publicUser(await getSessionUser(session));
    const tenant = session.tenantId ? await readTenantStaffView(session.tenantId) : null;
    return NextResponse.json({ token: session.token, session, user, tenant });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await findSession(token);
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const user = publicUser(await getSessionUser(session));
    return NextResponse.json({ session, user });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = getBearerToken(req);
  if (token) await logout(token);
  return NextResponse.json({ ok: true });
}
