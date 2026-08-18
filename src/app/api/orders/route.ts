import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { addOrder, readTenant } from "@/lib/tenant-store";
import { findTenantMetaByCode } from "@/lib/platform-store";
import type { OrderLine, Order } from "@/lib/tenant-types";
import type { PaymentMethod, PaymentStatus, ServiceType } from "@/lib/types";

export const runtime = "nodejs";

function trackToken() {
  return `trk_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function paymentStatusFor(method: PaymentMethod): PaymentStatus {
  if (method === "paid_in_advance" || method === "card" || method === "wallet") return "paid";
  if (method === "cod") return "cod_pending";
  return "unpaid";
}

export async function GET(req: NextRequest) {
  try {
    ensureBootstrap();
    const session = requireTenantSession(req);
    if (!hasPermission(session, "orders") && !hasPermission(session, "kitchen") && !hasPermission(session, "pos")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenant = readTenant(session.tenantId!);
    return NextResponse.json({ orders: tenant.orders });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrap();
    const body = await req.json();
    const {
      tenantCode,
      channel,
      serviceType,
      tableNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      lines,
      note,
      paymentMethod,
    } = body as {
      tenantCode?: string;
      channel: "guest" | "pos";
      serviceType: ServiceType;
      tableNumber?: string;
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      lines: OrderLine[];
      note?: string;
      paymentMethod: PaymentMethod;
    };

    if (!lines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let tenantId: string;
    if (channel === "pos") {
      const session = requireTenantSession(req);
      if (!hasPermission(session, "pos")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      tenantId = session.tenantId!;
    } else {
      if (!tenantCode) {
        return NextResponse.json({ error: "tenantCode required" }, { status: 400 });
      }
      const meta = findTenantMetaByCode(tenantCode);
      if (!meta || meta.status === "suspended") {
        return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
      }
      tenantId = meta.id;
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
    const now = new Date().toISOString();
    const order = addOrder(tenantId, {
      channel,
      serviceType,
      tableNumber,
      customerName,
      customerPhone,
      deliveryAddress,
      lines,
      note,
      paymentMethod,
      paymentStatus: paymentStatusFor(paymentMethod),
      status: "placed",
      statusHistory: [{ status: "placed", at: now }],
      trackToken: trackToken(),
      subtotal,
      total: subtotal,
    });

    return NextResponse.json({ order });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // bulk status convenience — prefer /api/orders/[id]
  return NextResponse.json({ error: "Use /api/orders/[id]" }, { status: 400 });
}
