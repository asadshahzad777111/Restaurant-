import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import {
  readTenant,
  readTenantSafe,
  updateBranding,
  updateMenu,
  updateStock,
  updateTables,
  updateUsers,
} from "@/lib/tenant-store";
import type { DiningTable, MenuItem, StockItem, TenantUser } from "@/lib/tenant-types";

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
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "toggle86") {
      if (!hasPermission(session, "menu")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const t = readTenant(tenantId);
      const menu = t.menu.map((m) =>
        m.id === body.itemId ? { ...m, available: !m.available } : m,
      );
      updateMenu(tenantId, menu);
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "stock") {
      if (!hasPermission(session, "stock")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const stock = body.stock as StockItem[];
      updateStock(tenantId, stock);
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "staff") {
      if (!hasPermission(session, "staff")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const users = body.users as TenantUser[];
      updateUsers(tenantId, users);
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "tables") {
      if (!hasPermission(session, "settings") && !hasPermission(session, "pos")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tables = body.tables as DiningTable[];
      updateTables(tenantId, tables);
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "branding" || action === "fees") {
      if (!hasPermission(session, "settings")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      updateBranding(tenantId, body.branding ?? {}, body.shop);
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    if (action === "changePassword") {
      const t = readTenant(tenantId);
      const user = t.users.find((u) => u.id === session.userId);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (body.currentPassword && user.password !== body.currentPassword) {
        return NextResponse.json({ error: "Current password wrong" }, { status: 400 });
      }
      if (!body.newPassword || String(body.newPassword).length < 6) {
        return NextResponse.json({ error: "New password too short" }, { status: 400 });
      }
      user.password = String(body.newPassword);
      user.mustChangePassword = false;
      updateUsers(tenantId, t.users);
      return NextResponse.json({ ok: true });
    }

    if (action === "get") {
      return NextResponse.json({ tenant: readTenantSafe(tenantId) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Admin update failed" }, { status: 500 });
  }
}
