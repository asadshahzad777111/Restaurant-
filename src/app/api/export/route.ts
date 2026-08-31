import { NextRequest, NextResponse } from "next/server";
import { ensureStore, findSession, queryArchivedOrders, readTenant } from "@/lib/db";
import { AuthError, getBearerToken, hasPermission, requireTenantSession } from "@/lib/session";

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
    await ensureStore();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "menu";
    const format = searchParams.get("format") || "json";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const session = await findSession(token);
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    let tenantId = session.tenantId;
    if (session.role === "super") {
      tenantId = searchParams.get("tenantId") || undefined;
      if (!tenantId) return NextResponse.json({ error: "tenantId required for super" }, { status: 400 });
    } else {
      await requireTenantSession(req);
      if (!(await hasPermission(session, "settings")) && session.role !== "tenant_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const tenant = await readTenant(tenantId!);

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
      const live = tenant.orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= fromMs && t <= toMs;
      });
      // includeArchived=1 merges orders moved to the archive by retention.
      let archived: Awaited<ReturnType<typeof queryArchivedOrders>> = [];
      if (searchParams.get("includeArchived") === "1") {
        archived = await queryArchivedOrders(tenantId!, {
          from: from || undefined,
          to: to || undefined,
          limit: 5000,
        });
      }
      const orders = [...live, ...archived];
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
        archivedCount: archived.length,
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
