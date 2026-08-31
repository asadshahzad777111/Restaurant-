import { NextRequest, NextResponse } from "next/server";
import { deletePromo, ensureStore } from "@/lib/db";
import { AuthError, hasPermission, requireTenantSession } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await ensureStore();
    const session = await requireTenantSession(_req);
    if (!(await hasPermission(session, "settings"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const removed = await deletePromo(session.tenantId!, id);
    if (!removed) return NextResponse.json({ error: "Promo not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
