import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  findTenantMetaByCode,
  listPromos,
  listPromoUsage,
  recordPromoUsage,
  upsertPromo,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import { normalizeCode, validatePromo, type Promo } from "@/lib/promo";

export const runtime = "nodejs";

/**
 * Promo / coupon management (Phase 3).
 *
 * GET /api/promos                — list promos + redemption usage (admin)
 * POST /api/promos               — create/update a promo (admin, "settings")
 * POST /api/promos/validate      — validate a code for a checkout subtotal
 *                                  (guest-facing; returns discount or reason)
 * DELETE /api/promos/[id]        — remove a promo (admin)
 *
 * Fraud/limits: every redemption is appended to promoUsage, and validatePromo
 * enforces MAX_USES + PER_USER from that ledger — the two most common promo
 * abuse vectors are closed by construction.
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings")) && !(await hasPermission(session, "home"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const [promos, usage] = await Promise.all([
      listPromos(tenantId),
      listPromoUsage(tenantId),
    ]);
    return NextResponse.json({ promos, usage });
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

    // Guest-facing validation (no staff permission required — checkout path).
    // Guests identify their kitchen by code, same as the orders route.
    if (body.action === "validate" || body.subtotal != null) {
      const code = normalizeCode(String(body.code || ""));
      const subtotal = Math.round(Number(body.subtotal) || 0);
      const userKey = String(body.userKey || "").trim();
      const tenantCode = String(body.tenantCode || "").trim().toUpperCase();
      if (!tenantCode) {
        return NextResponse.json({ error: "tenantCode required" }, { status: 400 });
      }
      const meta = await findTenantMetaByCode(tenantCode);
      if (!meta || meta.status === "suspended") {
        return NextResponse.json({ error: "Restaurant unavailable" }, { status: 403 });
      }
      const promos = await listPromos(meta.id);
      const usage = await listPromoUsage(meta.id);
      const promo = promos.find((p) => p.code === code);
      const result = validatePromo(promo, usage, { subtotal, userKey: userKey || undefined });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, reason: result.reason },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        code,
        discount: result.discount,
        promo: { id: result.promo!.id, code, type: result.promo!.type, value: result.promo!.value },
      });
    }

    // Admin create/update.
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "settings"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const input = body.promo as Partial<Promo> & { id?: string };
    const id = input.id || `promo_${Date.now()}`;
    const code = normalizeCode(String(input.code || ""));
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });
    if (input.type !== "flat" && input.type !== "percent") {
      return NextResponse.json({ error: "type must be flat or percent" }, { status: 400 });
    }
    const value = Math.round(Number(input.value) || 0);
    if (value <= 0) return NextResponse.json({ error: "Value must be > 0" }, { status: 400 });
    if (input.type === "percent" && value > 100) {
      return NextResponse.json({ error: "Percent cannot exceed 100" }, { status: 400 });
    }

    const promo: Promo = {
      id,
      code,
      type: input.type,
      value,
      maxDiscount: input.maxDiscount != null ? Math.round(Number(input.maxDiscount)) : undefined,
      minSubtotal: input.minSubtotal != null ? Math.round(Number(input.minSubtotal)) : undefined,
      maxUses: input.maxUses != null ? Math.round(Number(input.maxUses)) : undefined,
      perUser: input.perUser != null ? Math.round(Number(input.perUser)) : undefined,
      validFrom: input.validFrom,
      validTo: input.validTo,
      enabled: input.enabled !== false,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    const saved = await upsertPromo(tenantId, promo);
    return NextResponse.json({ promo: saved });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Record a redemption (called by the checkout flow after order creation). */
export async function applyPromoToOrder(input: {
  tenantId: string;
  code: string;
  subtotal: number;
  userKey?: string;
  orderId: string;
  discount: number;
}) {
  const promos = await listPromos(input.tenantId);
  const usage = await listPromoUsage(input.tenantId);
  const promo = promos.find((p) => p.code === normalizeCode(input.code));
  const result = validatePromo(promo, usage, {
    subtotal: input.subtotal,
    userKey: input.userKey,
  });
  if (!result.ok || !promo) return { ok: false as const, reason: result.reason };
  await recordPromoUsage(input.tenantId, {
    userKey: input.userKey || "guest",
    promoId: promo.id,
    orderId: input.orderId,
    discount: result.discount ?? 0,
    at: new Date().toISOString(),
  });
  return { ok: true as const, discount: result.discount ?? 0, promoId: promo.id };
}
