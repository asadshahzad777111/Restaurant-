import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import {
  readTenant,
  updateBranding,
  updateMenu,
  updateStock,
  updateUsers,
} from "@/lib/tenant-store";
import type { MenuItem, StockItem, TenantUser } from "@/lib/tenant-types";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    ensureBootstrap();
    const session = requireTenantSession(req);
    const body = await req.json();
    const { action } = body as { action: string };
    const tenantId = session.tenantId!;

    if (action === "menu") {
      if (!hasPermission(session, "menu")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const menu = body.menu as MenuItem[];
      const tenant = updateMenu(tenantId, menu);
      return NextResponse.json({ tenant });
    }

    if (action === "stock") {
      if (!hasPermission(session, "stock")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const stock = body.stock as StockItem[];
      const tenant = updateStock(tenantId, stock);
      return NextResponse.json({ tenant });
    }

    if (action === "staff") {
      if (!hasPermission(session, "staff")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const users = body.users as TenantUser[];
      const tenant = updateUsers(tenantId, users);
      return NextResponse.json({ tenant });
    }

    if (action === "branding") {
      if (!hasPermission(session, "settings")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tenant = updateBranding(tenantId, body.branding ?? {}, body.shop);
      return NextResponse.json({ tenant });
    }

    if (action === "get") {
      return NextResponse.json({ tenant: readTenant(tenantId) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Admin update failed" }, { status: 500 });
  }
}
