import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addOrder, readTenant, findTenantMetaByCode } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { computeFees, lineUnitPrice } from "@/lib/fees";
import type { LineModifier, OrderLine } from "@/lib/tenant-types";
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
    await ensureStore();
    const session = await requireTenantSession(req);
    if (
      !(await hasPermission(session, "orders")) &&
      !(await hasPermission(session, "kitchen")) &&
      !(await hasPermission(session, "pos"))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenant = await readTenant(session.tenantId!);
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
    await ensureStore();
    const body = await req.json();
    const {
      tenantCode,
      channel,
      serviceType,
      tableNumber,
      tableId,
      customerName,
      customerPhone,
      deliveryAddress,
      lines: rawLines,
      note,
      paymentMethod,
    } = body as {
      tenantCode?: string;
      channel: "guest" | "pos";
      serviceType: ServiceType;
      tableNumber?: string;
      tableId?: string;
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      lines: Array<{
        itemId: string;
        name: string;
        qty: number;
        basePrice: number;
        modifiers?: LineModifier[];
        lineNote?: string;
        unitPrice?: number;
      }>;
      note?: string;
      paymentMethod: PaymentMethod;
    };

    if (!rawLines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let tenantId: string;
    if (channel === "pos") {
      const session = await requireTenantSession(req);
      if (!(await hasPermission(session, "pos"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      tenantId = session.tenantId!;
    } else {
      if (!tenantCode) {
        return NextResponse.json({ error: "tenantCode required" }, { status: 400 });
      }
      const meta = await findTenantMetaByCode(tenantCode);
      if (!meta || meta.status === "suspended") {
        return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
      }
      tenantId = meta.id;
    }

    const tenant = await readTenant(tenantId);
    for (const line of rawLines) {
      const item = tenant.menu.find((m) => m.id === line.itemId);
      if (!item || !item.available) {
        return NextResponse.json(
          { error: `${line.name || "Item"} is unavailable (86)` },
          { status: 400 },
        );
      }
    }

    const lines: OrderLine[] = rawLines.map((l) => ({
      itemId: l.itemId,
      name: l.name,
      qty: l.qty,
      modifiers: l.modifiers,
      lineNote: l.lineNote,
      unitPrice: l.unitPrice ?? lineUnitPrice(l.basePrice, l.modifiers),
    }));

    const fees = computeFees(tenant.shop, serviceType, lines);
    const now = new Date().toISOString();
    const order = await addOrder(tenantId, {
      channel,
      serviceType,
      tableNumber,
      tableId,
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
      fees: {
        subtotal: fees.subtotal,
        deliveryFee: fees.deliveryFee,
        packingFee: fees.packingFee,
        serviceCharge: fees.serviceCharge,
        tax: fees.tax,
      },
      subtotal: fees.subtotal,
      total: fees.total,
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
