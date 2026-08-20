import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  findTenantMetaByCode,
  readTenantStaffView,
  upsertGuestClient,
} from "@/lib/db";
import { googleClientId, googleSignInEnabled, verifyGoogleIdToken } from "@/lib/google-auth";
import {
  AuthError,
  getSessionUser,
  loginTenantByEmail,
  publicUser,
} from "@/lib/session";
import { HELP_MODE_COOKIE } from "@/lib/help-mode";

export const runtime = "nodejs";

/**
 * Sign in / register with Google.
 * - staff: restaurant code required; Gmail must already be on that kitchen's user.
 * - guest: restaurant code required; creates/links a guest client profile for that kitchen only.
 */
export async function GET() {
  return NextResponse.json({
    enabled: googleSignInEnabled(),
    clientId: googleSignInEnabled() ? googleClientId() : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    if (!googleSignInEnabled()) {
      return NextResponse.json(
        {
          error:
            "Google Sign-In is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID on the deployment.",
        },
        { status: 503 },
      );
    }
    const body = await req.json();
    const mode = String(body.mode || "guest") as "staff" | "guest";
    const code = String(body.code || body.tenantCode || "").trim().toUpperCase();
    const idToken = String(body.idToken || "").trim();
    if (!code) return NextResponse.json({ error: "Restaurant code required" }, { status: 400 });
    if (!idToken) return NextResponse.json({ error: "Google token required" }, { status: 400 });

    const identity = await verifyGoogleIdToken(idToken);
    const meta = await findTenantMetaByCode(code);
    if (!meta) return NextResponse.json({ error: "Restaurant code not found" }, { status: 404 });

    if (mode === "staff") {
      if (meta.status === "suspended") {
        return NextResponse.json({ error: "Restaurant is suspended" }, { status: 403 });
      }
      const session = await loginTenantByEmail(code, identity.email);
      const user = publicUser(await getSessionUser(session));
      const tenant = session.tenantId ? await readTenantStaffView(session.tenantId) : null;
      const res = NextResponse.json({
        token: session.token,
        session,
        user,
        tenant,
        identity: { email: identity.email, name: identity.name },
      });
      res.cookies.set(HELP_MODE_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    }

    // Guest / Customer APK — register or return profile for this kitchen only.
    const client = await upsertGuestClient(meta.id, {
      email: identity.email,
      name: identity.name,
      googleSub: identity.sub,
    });
    return NextResponse.json({
      mode: "guest",
      tenant: { id: meta.id, code: meta.code, name: meta.name, status: meta.status },
      client,
      identity: { email: identity.email, name: identity.name, picture: identity.picture },
      orderingClosed: meta.status === "suspended",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Google sign-in failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
