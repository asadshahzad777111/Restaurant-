import { NextRequest } from "next/server";
import { requireTenantSession } from "@/lib/session";
import { subscribeOrderEvents } from "@/lib/order-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Staff live order stream (Server-Sent Events).
 *
 * Authenticated with the staff Bearer token. Pushes this tenant's order events
 * the moment they happen (new order, status change, cancel) so /orders and
 * /kitchen update instantly. StaffAlerts keeps its 3s poll as a fallback, so a
 * dropped stream degrades gracefully.
 *
 * Phase 2 replaces the transport with Redis Streams → WebSocket; this route
 * keeps working because it only consumes order-events (the single emit point).
 */
export async function GET(req: NextRequest) {
  const session = await requireTenantSession(req);
  const tenantId = session.tenantId!;

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

      send({ type: "snapshot", connected: true, tenantId });

      const unsubscribe = subscribeOrderEvents((event) => {
        if (event.tenantId !== tenantId) return;
        send(event);
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
