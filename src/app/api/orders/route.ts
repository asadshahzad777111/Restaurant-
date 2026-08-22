import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addOrder, readTenant, findTenantMetaByCode, findTenantMetaById } from "@/lib/db";
import { AuthError, hasAnyPermission, hasPermission, requireTenantSession } from "@/lib/session";
import { assertOrderRules } from "@/lib/guest";
import { assertGuestPaymentAllowed } from "@/lib/payments";
import { computeFees, lineUnitPrice } from "@/lib/fees";
import type { LineModifier, OrderLine } from "@/lib/tenant-types";
import type { AdvanceRail, PaymentMethod, PaymentStatus, ServiceType } from "@/lib/types";
import { sendNewOrderEmail, sendOrderWhatsapp, tenantAdminEmails } from "@/lib/notify";
import { appUrl } from "@/lib/urls";

export const runtime = "nodejs";

function trackToken() {
  return `trk_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function paymentStatusFor(method: PaymentMethod, proofUrl?: string): PaymentStatus {
  const advance =
    method === "paid_in_advance" ||
    method === "bank" ||
    method === "jazzcash" ||
    method === "easypaisa";
  if (advance && proofUrl?.trim()) return "proof_submitted";
  if (method === "paid_in_advance" || method === "card" || method === "wallet") return "paid";
  if (method === "cod") return "cod_pending";
  return "unpaid";
}

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["orders", "kitchen", "pos"]))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenant = await readTenant(session.tenantId!);
    const poll = new URL(req.url).searchParams.get("poll");
    if (poll) {
      const cutoff = Date.now() - 2 * 60 * 1000;
      const orders = tenant.orders.filter((o) => {
        if (!["completed", "cancelled"].includes(o.status)) return true;
        return new Date(o.updatedAt).getTime() >= cutoff;
      });
      return NextResponse.json({ orders: orders.slice(0, 80) });
    }
    return NextResponse.json({ orders: tenant.orders.slice(0, 200) });
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
      advanceRail,
      paymentProofUrl,
      discount: rawDiscount,
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
      advanceRail?: AdvanceRail;
      paymentProofUrl?: string;
      discount?: number;
    };

    if (!rawLines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const ruleError = assertOrderRules({
      channel,
      serviceType,
      paymentMethod,
      tableNumber,
      customerPhone,
      deliveryAddress,
    });
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 400 });
    }

    let tenantId: string;
    if (channel === "pos") {
      const session = await requireTenantSession(req);
      if (!(await hasPermission(session, "pos"))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      tenantId = session.tenantId!;
    } else {
      // Guests must send this kitchen's code/QR — never inherit another restaurant.
      // Normalize + validate BEFORE any lookup; the registry is the only mapping to tenantId.
      const tenantCode = String(body.tenantCode || "").trim().toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(tenantCode)) {
        return NextResponse.json({ error: "tenantCode required" }, { status: 400 });
      }
      const meta = await findTenantMetaByCode(tenantCode);
      if (!meta || meta.status === "suspended") {
        return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
      }
      tenantId = meta.id;
    }

    const tenant = await readTenant(tenantId);

    if (channel === "guest") {
      const payBlock = assertGuestPaymentAllowed(serviceType, paymentMethod, tenant.payments);
      if (payBlock) {
        return NextResponse.json({ error: payBlock }, { status: 400 });
      }
      if (paymentMethod === "paid_in_advance") {
        const rail = advanceRail;
        if (!rail || !["bank", "jazzcash", "easypaisa"].includes(rail)) {
          return NextResponse.json({ error: "Select a payment method (bank / JazzCash / EasyPaisa)" }, { status: 400 });
        }
        const account = tenant.payments?.methods?.[rail];
        if (!account?.enabled) {
          return NextResponse.json({ error: "That payment rail is not available" }, { status: 400 });
        }
      }
    }

    for (const line of rawLines) {
      const item = tenant.menu.find((m) => m.id === line.itemId);
      if (!item || !item.available) {
        return NextResponse.json(
          { error: `${line.name || "Item"} is 86 / unavailable` },
          { status: 400 },
        );
      }
      // Stock 86: if a stock row shares this item name and qty is 0, block sale.
      const stockHit = (tenant.stock || []).find(
        (s) => s.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      );
      if (stockHit && stockHit.quantity <= 0) {
        return NextResponse.json(
          { error: `${item.name} is out of stock (86)` },
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
    let discount = 0;
    if (channel === "pos") {
      const n = Math.round(Number(rawDiscount) || 0);
      discount = Math.max(0, Math.min(n, fees.total));
    }
    const total = Math.max(0, fees.total - discount);
    const now = new Date().toISOString();
    const order = await addOrder(tenantId, {
      channel,
      serviceType,
      tableNumber,
      tableId,
      customerName: customerName?.trim() || undefined,
      customerPhone: customerPhone?.trim() || undefined,
      deliveryAddress,
      lines,
      note: note?.trim() || undefined,
      paymentMethod,
      advanceRail:
        paymentMethod === "paid_in_advance" &&
        (advanceRail === "bank" || advanceRail === "jazzcash" || advanceRail === "easypaisa")
          ? advanceRail
          : undefined,
      paymentProofUrl: paymentProofUrl?.trim() || undefined,
      paymentStatus: paymentStatusFor(paymentMethod, paymentProofUrl),
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
      total,
      discount: discount || undefined,
    });

    // Don't block the guest/POS response on Resend — free-tier latency killer.
    void (async () => {
      try {
        const meta = await findTenantMetaById(tenantId);
        const notifyTo = tenantAdminEmails(tenant, meta);
        if (!notifyTo.length) {
          console.info("[email] skip order notify: no Admin email for tenant", tenantId);
          return;
        }
        await sendNewOrderEmail({
          to: notifyTo,
          restaurantName: tenant.branding.name || meta?.name || tenant.code,
          restaurantCode: tenant.code,
          orderId: order.id,
          orderNumber: order.number,
          serviceType: order.serviceType,
          total: order.total,
          subtotal: order.subtotal,
          currency: tenant.shop.currency || "PKR",
          trackUrl: `${appUrl()}/track/${order.trackToken}`,
        });
      } catch (err) {
        console.error("[email] order notify failed:", err instanceof Error ? err.message : err);
      }
    })();

    // Guest WhatsApp confirmation — non-blocking, skips when unconfigured or no phone.
    void (async () => {
      try {
        const result = await sendOrderWhatsapp({
          customerPhone: order.customerPhone,
          restaurantName: tenant.branding.name || tenant.code,
          orderNumber: order.number,
          total: order.total,
          currency: tenant.shop.currency || "PKR",
          trackUrl: `${appUrl()}/track/${order.trackToken}`,
        });
        if (result && "reason" in result) {
          console.info("[whatsapp] skip order confirm:", (result as { reason: string }).reason);
        }
      } catch (err) {
        console.error("[whatsapp] order confirm failed:", err instanceof Error ? err.message : err);
      }
    })();

    return NextResponse.json({ order });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
