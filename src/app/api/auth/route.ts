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
import { findSession } from "@/lib/platform-store";
import { ensureBootstrap } from "@/lib/bootstrap";
import { readTenantStaffView } from "@/lib/tenant-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    ensureBootstrap();
    const body = await req.json();
    const { mode, username, password, code } = body as {
      mode?: "super" | "tenant";
      username: string;
      password: string;
      code?: string;
    };
    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    if (mode === "super" || (!code && mode !== "tenant")) {
      const session = loginSuper(username, password);
      return NextResponse.json({ token: session.token, session });
    }
    if (!code) return NextResponse.json({ error: "Restaurant code required" }, { status: 400 });
    const session = loginTenant(code, username, password);
    const user = publicUser(getSessionUser(session));
    const tenant = session.tenantId ? readTenantStaffView(session.tenantId) : null;
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
    ensureBootstrap();
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = findSession(token);
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    const user = publicUser(getSessionUser(session));
    return NextResponse.json({ session, user });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = getBearerToken(req);
  if (token) logout(token);
  return NextResponse.json({ ok: true });
}
