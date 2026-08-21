import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  readTenant,
  readTenantStaffView,
  updateBranding,
  updateMenu,
  updateStock,
  updateTables,
  updateUsers,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import type { DiningTable, MenuItem, StockItem, TenantUser } from "@/lib/tenant-types";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    const body = await req.json();
    const { action } = body as { action: string };
    // Mutations stay on session.tenantId — Super cannot hit this without Help (tenant_admin).
    const tenantId = session.tenantId!;

    if (action === "menu") {
      if (!(await hasPermission(session, "menu"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await updateMenu(tenantId, body.menu as MenuItem[]);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "toggle86") {
      if (!(await hasPermission(session, "menu"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const t = await readTenant(tenantId);
      const menu = t.menu.map((m) =>
        m.id === body.itemId ? { ...m, available: !m.available } : m,
      );
      await updateMenu(tenantId, menu);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "stock") {
      if (!(await hasPermission(session, "stock"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await updateStock(tenantId, body.stock as StockItem[]);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "staff") {
      if (!(await hasPermission(session, "staff"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await updateUsers(tenantId, body.users as TenantUser[]);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "tables") {
      if (!(await hasPermission(session, "settings")) && !(await hasPermission(session, "pos"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await updateTables(tenantId, body.tables as DiningTable[]);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "branding" || action === "fees") {
      if (!(await hasPermission(session, "settings"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (action === "branding") {
        const name = String(body.branding?.name ?? "").trim();
        if (!name) {
          return NextResponse.json({ error: "Restaurant name required" }, { status: 400 });
        }
        body.branding = { ...body.branding, name };
      }
      await updateBranding(tenantId, body.branding ?? {}, body.shop);
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    if (action === "changePassword") {
      const t = await readTenant(tenantId);
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
      await updateUsers(tenantId, t.users);
      return NextResponse.json({ ok: true });
    }

    if (action === "get") {
      return NextResponse.json({ tenant: await readTenantStaffView(tenantId) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Admin update failed" }, { status: 500 });
  }
}
