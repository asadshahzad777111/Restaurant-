import { NextRequest, NextResponse } from "next/server";
import {
  ensureStore,
  listRiders,
  upsertRider,
  updateRiderPresence,
} from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";
import type { Rider } from "@/lib/rider-types";

export const runtime = "nodejs";

/**
 * Rider registry (Phase 2).
 *
 * POST — upsert a rider (register) and/or update presence (online toggle +
 * location ping every 3–5s from the rider app). Idempotent upsert by rider id.
 * GET  — list this tenant's riders (admin dispatch view).
 *
 * Auth: any staff session with the "orders" permission (dispatch/ops view).
 * Phase 2 rider app uses its own token; the store functions are tenant-scoped
 * either way, so no cross-kitchen data leak.
 */
export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "orders"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const tenantId = session.tenantId!;
    const body = (await req.json()) as {
      rider?: Partial<Rider> & { id?: string };
      online?: boolean;
      lat?: number;
      lng?: number;
    };

    if (body.rider?.id) {
      const existing = (await listRiders(tenantId)).find((r) => r.id === body.rider!.id);
      const rider: Rider = {
        id: body.rider.id,
        name: body.rider.name?.trim() || existing?.name || "Rider",
        phone: body.rider.phone ?? existing?.phone,
        // Top-level presence fields (rider app ping) win over the rider object.
        online: body.online ?? body.rider.online ?? existing?.online ?? false,
        activeOrderId: body.rider.activeOrderId ?? existing?.activeOrderId,
        load: body.rider.load ?? existing?.load ?? 0,
        lastLocation:
          body.lat != null && body.lng != null
            ? { lat: body.lat, lng: body.lng, at: new Date().toISOString() }
            : existing?.lastLocation,
        updatedAt: new Date().toISOString(),
      };
      const saved = await upsertRider(tenantId, rider);
      return NextResponse.json({ rider: saved });
    }

    // Presence ping for an existing rider.
    if (body.lat != null || body.lng != null || body.online != null) {
      const riderId = String(body.rider?.id || "");
      if (!riderId) return NextResponse.json({ error: "rider.id required" }, { status: 400 });
      const updated = await updateRiderPresence(tenantId, riderId, {
        online: body.online,
        lat: body.lat,
        lng: body.lng,
      });
      if (!updated) return NextResponse.json({ error: "Rider not found" }, { status: 404 });
      return NextResponse.json({ rider: updated });
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    const session = await requireTenantSession(req);
    if (!(await hasPermission(session, "orders"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const riders = await listRiders(session.tenantId!);
    return NextResponse.json({ riders });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
