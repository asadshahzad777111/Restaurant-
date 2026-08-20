import { NextRequest, NextResponse } from "next/server";
import { HELP_MODE_COOKIE, helpModeCookieSetOptions } from "@/lib/help-mode";
import {
  ensureStore,
  createEmptyTenantState,
  createTenantMeta,
  listPlans,
  listTenantsMeta,
  setTenantStatus,
  updateTenantMeta,
} from "@/lib/db";
import { AuthError, impersonateTenant, requireSuper } from "@/lib/session";
import type { PlanId, TenantStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    await requireSuper(req);
    return NextResponse.json({
      tenants: await listTenantsMeta(),
      plans: await listPlans(),
    });
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
    const session = await requireSuper(req);
    const body = await req.json();
    const { action } = body as { action: string };

    if (action === "create") {
      const id = `tenant_${Date.now()}`;
      const code = String(body.code || "").toUpperCase();
      const name = String(body.name || "");
      const planId = (body.planId || "starter") as PlanId;
      const adminUsername = String(body.adminUsername || "admin");
      const adminPassword = String(body.adminPassword || "admin123");
      if (!code || !name) {
        return NextResponse.json({ error: "code and name required" }, { status: 400 });
      }
      // New kitchen + its Admin only. Super session is unchanged — do not impersonate.
      await createEmptyTenantState({ id, code, name, adminUsername, adminPassword });
      const meta = await createTenantMeta({ id, code, name, planId });
      return NextResponse.json({ tenant: meta });
    }

    if (action === "status") {
      const meta = await setTenantStatus(body.id, body.status as TenantStatus);
      return NextResponse.json({ tenant: meta });
    }

    if (action === "plan") {
      const planId = body.planId as PlanId;
      if (!["starter", "pro", "enterprise"].includes(planId)) {
        return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
      }
      const meta = await updateTenantMeta(body.id, { planId });
      return NextResponse.json({ tenant: meta });
    }

    if (action === "rename") {
      const meta = await updateTenantMeta(body.id, { name: body.name });
      return NextResponse.json({ tenant: meta });
    }

    if (action === "impersonate") {
      const newSession = await impersonateTenant(session, body.id);
      const res = NextResponse.json({ token: newSession.token, session: newSession });
      res.cookies.set(HELP_MODE_COOKIE, "1", helpModeCookieSetOptions());
      return res;
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
