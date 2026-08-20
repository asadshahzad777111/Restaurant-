import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  findTenantMetaByCode,
  findTenantMetaById,
  listPlans,
  getPublicMenu,
  getPlatformFeatures,
  readTenantStaffView,
} from "@/lib/db";
import { AuthError, publicUser, requireSession } from "@/lib/session";
import { storageMode } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const { searchParams } = new URL(req.url);
    const tenantCode = searchParams.get("tenant");

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const session = await requireSession(req);
        if (session.role === "super") {
          // Super has no restaurant payload. Do not pick a tenant or impersonate.
          return NextResponse.json({
            session,
            plans: await listPlans(),
            storage: storageMode(),
          });
        }
        if (!session.tenantId) {
          return NextResponse.json({ error: "No tenant" }, { status: 400 });
        }
        const [meta, tenant, features] = await Promise.all([
          findTenantMetaById(session.tenantId),
          readTenantStaffView(session.tenantId),
          getPlatformFeatures(),
        ]);
        const user =
          session.userId && tenant
            ? publicUser(tenant.users.find((u) => u.id === session.userId) ?? null)
            : null;
        return NextResponse.json({
          session,
          user,
          meta,
          tenant,
          features,
          storage: storageMode(),
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
    const meta = await findTenantMetaByCode(tenantCode);
    if (!meta) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    if (meta.status === "suspended") {
      return NextResponse.json({ error: "Restaurant suspended" }, { status: 403 });
    }
    const pub = await getPublicMenu(meta.id);
    return NextResponse.json(
      {
        public: pub,
        meta,
        storage: storageMode(),
      },
      {
        headers: {
          // Short browser cache so flipping menu↔cart↔checkout feels instant on free tier.
          "Cache-Control": "private, max-age=8, stale-while-revalidate=20",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
