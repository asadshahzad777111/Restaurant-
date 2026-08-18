import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { findOrderByTrackToken } from "@/lib/tenant-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    ensureBootstrap();
    const { token } = await ctx.params;
    const hit = findOrderByTrackToken(token);
    if (!hit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { tenant, order } = hit;
    const review = tenant.reviews.find((r) => r.trackToken === token);
    return NextResponse.json({
      branding: tenant.branding,
      shop: {
        phone: tenant.shop.phone,
        whatsapp: tenant.shop.whatsapp,
        currency: tenant.shop.currency,
      },
      order: {
        id: order.id,
        number: order.number,
        status: order.status,
        statusHistory: order.statusHistory,
        serviceType: order.serviceType,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        lines: order.lines,
        total: order.total,
        tableNumber: order.tableNumber,
        createdAt: order.createdAt,
      },
      review: review ?? null,
      canReview: order.status === "completed" && !review,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
