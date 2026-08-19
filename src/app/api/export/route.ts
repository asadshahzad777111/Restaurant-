import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession, getBearerToken } from "@/lib/session";
import { findSession } from "@/lib/platform-store";
import { readTenant } from "@/lib/tenant-store";

export const runtime = "nodejs";

function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(","))].join(
    "\n",
  );
}

export async function GET(req: NextRequest) {
  try {
    ensureBootstrap();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "menu";
    const format = searchParams.get("format") || "json";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = findSession(token);
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    let tenantId = session.tenantId;
    if (session.role === "super") {
      tenantId = searchParams.get("tenantId") || undefined;
      if (!tenantId) return NextResponse.json({ error: "tenantId required for super" }, { status: 400 });
    } else {
      requireTenantSession(req);
      if (!hasPermission(session, "settings") && session.role !== "tenant_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const tenant = readTenant(tenantId!);

    if (type === "menu") {
      if (format === "csv") {
        const rows = tenant.menu.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          price: m.price,
          available: m.available ? 1 : 0,
          isDeal: m.isDeal ? 1 : 0,
        }));
        return new NextResponse(toCsv(rows), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${tenant.code}-menu.csv"`,
          },
        });
      }
      return NextResponse.json({
        code: tenant.code,
        exportedAt: new Date().toISOString(),
        menu: tenant.menu,
      });
    }

    if (type === "orders") {
      const fromMs = from ? new Date(from).getTime() : 0;
      const toMs = to ? new Date(to).getTime() : Date.now();
      const orders = tenant.orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= fromMs && t <= toMs;
      });
      if (format === "csv") {
        const rows = orders.map((o) => ({
          number: o.number,
          status: o.status,
          channel: o.channel,
          serviceType: o.serviceType,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
          total: o.total,
          cancelReason: o.cancelReason || "",
          createdAt: o.createdAt,
        }));
        return new NextResponse(toCsv(rows), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${tenant.code}-orders.csv"`,
          },
        });
      }
      return NextResponse.json({
        code: tenant.code,
        from,
        to,
        exportedAt: new Date().toISOString(),
        orders,
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
