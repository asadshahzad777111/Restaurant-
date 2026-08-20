import { NextRequest, NextResponse } from "next/server";
import { ensureStore, readTenant } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession, requireSuper } from "@/lib/session";
import { r2Configured } from "@/lib/env";
import { uploadPublicAsset } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Backup full tenant snapshot to Cloudflare R2.
 * Restaurant admin: own tenant. Owner (control): any tenantId.
 * No Vercel paid plan required — R2 stores the files.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    if (!r2Configured()) {
      return NextResponse.json(
        {
          error: "R2 not configured",
          hint: "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL or R2_PUBLIC_BASE_URL",
        },
        { status: 503 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { tenantId?: string };
    let tenantId = body.tenantId;

    try {
      const owner = await requireSuper(req);
      if (!tenantId) {
        return NextResponse.json({ error: "tenantId required for owner backup" }, { status: 400 });
      }
      void owner;
    } catch {
      const session = await requireTenantSession(req);
      if (!(await hasPermission(session, "settings")) && session.role !== "tenant_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      tenantId = session.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    const tenant = await readTenant(tenantId);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `backups/${tenant.code}/${stamp}.json`;
    const payload = {
      exportedAt: new Date().toISOString(),
      code: tenant.code,
      id: tenant.id,
      branding: tenant.branding,
      shop: tenant.shop,
      menu: tenant.menu,
      stock: tenant.stock,
      tables: tenant.tables,
      orders: tenant.orders,
      reviews: tenant.reviews,
      dayCloses: tenant.dayCloses,
      users: tenant.users.map((u) => {
        const { password: _pw, ...rest } = u;
        return rest;
      }),
    };
    const buf = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
    const result = await uploadPublicAsset({
      key,
      body: buf,
      contentType: "application/json",
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      key: result.key,
      url: result.url,
      bytes: buf.length,
      note: "Passwords excluded from backup users. Change R2 keys anytime.",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
