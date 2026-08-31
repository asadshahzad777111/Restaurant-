import { NextRequest } from "next/server";
import { ensureStore, findOrderByTrackToken } from "@/lib/db";
import { subscribeOrderEvents } from "@/lib/order-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live order status stream (Server-Sent Events).
 *
 * Subscribes to the isolated order event bus and pushes status changes for this
 * order the moment they happen — no polling. The customer track page uses this
 * with its existing 4s polling as a fallback, so a dropped stream degrades
 * gracefully.
 *
 * Phase 2 replaces the transport with Redis Streams → WebSocket, but this route
 * keeps working because it only consumes order-events (the single emit point).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  await ensureStore();
  const { token } = await ctx.params;
  const hit = await findOrderByTrackToken(token);
  if (!hit) return new Response("Not found", { status: 404 });
  const { order } = hit;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* client disconnected */
        }
      };

      // Snapshot so the client knows the stream is live immediately.
      send({ type: "snapshot", status: order.status, orderId: order.id });

      const unsubscribe = subscribeOrderEvents((event) => {
        if (event.orderId !== order.id) return;
        if (event.type === "order.status_changed" || event.type === "order.cancelled") {
          send({
            type: event.type,
            status: event.to,
            from: event.from,
            at: event.at,
            actor: event.actor,
          });
        }
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
