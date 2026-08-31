import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addReview, findOrderByTrackToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const body = await req.json();
    const { trackToken, rating, foodRating, deliveryRating, comment } = body as {
      trackToken: string;
      rating?: number;
      foodRating?: number;
      deliveryRating?: number;
      comment?: string;
    };
    // Split ratings (prompt: food goes to restaurant, delivery goes to rider —
    // never conflate the two). Legacy clients send a single `rating` → food.
    const food = foodRating ?? rating;
    if (!trackToken || !food || food < 1 || food > 5) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }
    if (deliveryRating != null && (deliveryRating < 1 || deliveryRating > 5)) {
      return NextResponse.json({ error: "Invalid delivery rating" }, { status: 400 });
    }
    const hit = await findOrderByTrackToken(trackToken);
    if (!hit) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const review = await addReview(hit.tenant.id, {
      trackToken,
      orderId: hit.order.id,
      rating: food,
      deliveryRating,
      comment: comment ?? "",
    });
    return NextResponse.json({ review });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
