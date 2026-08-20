import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, getSessionUser, publicUser, requireSession } from "@/lib/session";
import { findTenantMetaByCode, findTenantMetaById, listPlans } from "@/lib/platform-store";
import { getPublicMenu, readTenantStaffView } from "@/lib/tenant-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    ensureBootstrap();
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get("tenant");

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const session = requireSession(req);
        if (session.role === "super") {
          return NextResponse.json({
            session,
            plans: listPlans(),
          });
        }
        if (!session.tenantId) {
          return NextResponse.json({ error: "No tenant" }, { status: 400 });
        }
        const meta = findTenantMetaById(session.tenantId);
        const tenant = readTenantStaffView(session.tenantId);
        const user = publicUser(getSessionUser(session));
        return NextResponse.json({
          session,
          user,
          meta,
          tenant,
        });
      } catch (e) {
        if (e instanceof AuthError && !tenantCode) {
          return NextResponse.json({ error: e.message }, { status: e.status });
        }
      }
    }

    if (!tenantCode) {
      return NextResponse.json({ error: "tenant query required" }, { status: 400 });
    }
    const meta = findTenantMetaByCode(tenantCode);
    if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    if (meta.status === "suspended") {
      return NextResponse.json({ error: "Restaurant suspended" }, { status: 403 });
    }
    return NextResponse.json({ public: getPublicMenu(meta.id), meta });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
