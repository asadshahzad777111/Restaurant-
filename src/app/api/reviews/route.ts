import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addReview, findOrderByTrackToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const body = await req.json();
    const { trackToken, rating, comment } = body as {
      trackToken: string;
      rating: number;
      comment?: string;
    };
    if (!trackToken || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }
    const hit = await findOrderByTrackToken(trackToken);
    if (!hit) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const review = await addReview(hit.tenant.id, {
      trackToken,
      orderId: hit.order.id,
      rating,
      comment: comment ?? "",
    });
    return NextResponse.json({ review });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
