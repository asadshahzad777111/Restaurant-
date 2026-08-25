import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addOrder, readTenant, findTenantMetaByCode, findTenantMetaById, updateStock } from "@/lib/db";
import { AuthError, hasAnyPermission, hasPermission, requireTenantSession } from "@/lib/session";
import { assertOrderRules } from "@/lib/guest";
import { assertGuestPaymentAllowed } from "@/lib/payments";
import { computeFees, lineUnitPrice } from "@/lib/fees";
import { applyStockMovement } from "@/lib/stock";
import type { LineModifier, OrderLine } from "@/lib/tenant-types";
import type { AdvanceRail, PaymentMethod, PaymentStatus, ServiceType } from "@/lib/types";
import { sendNewOrderEmail, sendOrderWhatsapp, tenantAdminEmails } from "@/lib/notify";
import { appUrl } from "@/lib/urls";
import { enqueueOrderSlip, shouldAutoPrintGuestOrder } from "@/lib/print-bridge";

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

    if (channel === "pos" && !customerName?.trim()) {
      return NextResponse.json({ error: "Customer name required" }, { status: 400 });
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

    // Track requested quantities per menu item for stock enforcement.
    const requestedQtyByItem = new Map<string, number>();
    for (const line of rawLines) {
      const qty = Math.round(Number(line.qty));
      if (!Number.isFinite(qty) || qty <= 0) {
        return NextResponse.json(
          { error: `${line.name || "Item"} has an invalid quantity` },
          { status: 400 },
        );
      }
      const item = tenant.menu.find((m) => m.id === line.itemId);
      if (!item || !item.available) {
        return NextResponse.json(
          { error: `${line.name || "Item"} is unavailable` },
          { status: 400 },
        );
      }
      const itemQty = (requestedQtyByItem.get(item.id) || 0) + qty;
      requestedQtyByItem.set(item.id, itemQty);
      // Stock 86: block sale once requested qty exceeds what's available.
      const stockHit = (tenant.stock || []).find(
        (s) => s.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
      );
      if (stockHit && stockHit.quantity < itemQty) {
        return NextResponse.json(
          {
            error:
              stockHit.quantity <= 0
                ? `${item.name} is out of stock`
                : `${item.name}: only ${stockHit.quantity} in stock`,
          },
          { status: 400 },
        );
      }
    }

    // Build authoritative lines from the tenant menu so a client can't tamper
    // with prices. unitPrice = menu base + validated modifier priceDeltas.
    const lines: OrderLine[] = rawLines.map((l) => {
      const item = tenant.menu.find((m) => m.id === l.itemId)!;
      const validMods = (l.modifiers || []).filter((m) => {
        const group = (item.modifiers || []).find((g) => g.id === m.groupId);
        return group && group.options.some((o) => o.id === m.optionId);
      });
      return {
        itemId: item.id,
        name: item.name,
        qty: Math.round(Number(l.qty)),
        modifiers: validMods,
        lineNote: l.lineNote,
        unitPrice: lineUnitPrice(item.price, validMods),
      };
    });

    const fees = computeFees(tenant.shop, serviceType, lines, rawDiscount && channel === "pos" ? Math.round(Number(rawDiscount)) : 0);
    const discount = fees.discount;
    const total = fees.total;
    const now = new Date().toISOString();

    // Idempotency guard: if an identical order (same channel, service type,
    // payment, and line signature) was just placed within 10s, return it instead
    // of creating a duplicate from a double-tap / network retry.
    const sig = JSON.stringify(
      [...lines.map((l) => `${l.itemId}:${l.qty}:${l.unitPrice}`).sort(), serviceType, paymentMethod, total],
    );
    const dup = tenant.orders.find(
      (o) =>
        o.channel === channel &&
        o.status === "placed" &&
        Date.now() - new Date(o.createdAt).getTime() < 10_000 &&
        JSON.stringify(
          [...o.lines.map((l) => `${l.itemId}:${l.qty}:${l.unitPrice}`).sort(), o.serviceType, o.paymentMethod, o.total],
        ) === sig,
    );
    if (dup) {
      return NextResponse.json({ order: dup });
    }

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
      // POS/counter sales are collected at the till at checkout (cash taken, change
      // given) — so they are paid immediately and never need a manual "Mark paid".
      // Guest orders keep the online logic (COD stays pending until the person pays).
      paymentStatus: channel === "pos" ? "paid" : paymentStatusFor(paymentMethod, paymentProofUrl),
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

    if (shouldAutoPrintGuestOrder(order)) {
      void (async () => {
        try {
          await enqueueOrderSlip(tenantId, tenant, order, "bill");
        } catch (err) {
          console.error("[print-bridge] auto bill failed:", err instanceof Error ? err.message : err);
        }
      })();
    }

    // Deduct stock for this sale (POS / guest). Best-effort — don't block the order.
    if ((tenant.stock || []).length) {
      void (async () => {
        try {
          const t = await readTenant(tenantId);
          await updateStock(tenantId, applyStockMovement(t.stock || [], lines, -1));
        } catch (err) {
          console.error("[stock] deduct failed:", err instanceof Error ? err.message : err);
        }
      })();
    }

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
