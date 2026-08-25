import { NextRequest } from "next/server";
import { AuthError, hasAnyPermission, requireTenantSession } from "@/lib/session";
import { ensureStore } from "@/lib/db";
import { printBridgeSnapshot, waitBridgePulse } from "@/lib/print-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live Android-printer presence for this tenant.
 * Pushes as soon as Staff APK heartbeats (green) and every ~1s so red flips
 * when the phone drops off. Auth: staff bearer (same as GET /api/print/bridge).
 */
export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasAnyPermission(session, ["pos", "orders", "kitchen"]))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    const tenantId = session.tenantId!;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let last = "";
        const send = async () => {
          const snap = await printBridgeSnapshot(tenantId);
          const key = `${snap.connected}:${snap.lastSeen}:${snap.printerName}:${snap.queued}`;
          if (key === last) return;
          last = key;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snap)}\n\n`));
        };
        try {
          await send();
          while (!req.signal.aborted) {
            await waitBridgePulse(tenantId, 1000);
            if (req.signal.aborted) break;
            await send();
          }
        } catch {
          /* client gone or store error */
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      },
      cancel() {
        /* abort via req.signal */
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
