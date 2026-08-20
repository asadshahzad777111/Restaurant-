import { NextRequest, NextResponse } from "next/server";
import { HELP_MODE_COOKIE, helpModeCookieSetOptions } from "@/lib/help-mode";
import {
  ensureStore,
  createEmptyTenantState,
  createTenantMeta,
  listPlans,
  listTenantsMeta,
  setTenantStatus,
  updateBranding,
  updateTenantMeta,
  getPlatformFeatures,
  setPlatformFeatures,
} from "@/lib/db";
import { AuthError, impersonateTenant, requireSuper } from "@/lib/session";
import type { PlanId, TenantStatus } from "@/lib/types";
import { looksLikeEmail } from "@/lib/email";
import { sendAdminWelcomeEmail } from "@/lib/notify";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureStore();
    await requireSuper(req);
    return NextResponse.json({
      tenants: await listTenantsMeta(),
      plans: await listPlans(),
      features: await getPlatformFeatures(),
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
      const adminEmail = String(body.adminEmail || "").trim();
      if (!code || !name) {
        return NextResponse.json({ error: "code and name required" }, { status: 400 });
      }
      if (adminEmail && !looksLikeEmail(adminEmail)) {
        return NextResponse.json({ error: "Invalid Admin email" }, { status: 400 });
      }
      // New kitchen + its Admin only. Super session is unchanged — do not impersonate.
      await createEmptyTenantState({
        id,
        code,
        name,
        adminUsername,
        adminPassword,
        adminEmail: adminEmail || undefined,
      });
      const meta = await createTenantMeta({
        id,
        code,
        name,
        planId,
        adminEmail: adminEmail || undefined,
      });
      let email: Awaited<ReturnType<typeof sendAdminWelcomeEmail>> | undefined;
      if (adminEmail) {
        try {
          email = await sendAdminWelcomeEmail({
            to: adminEmail,
            restaurantName: name,
            restaurantCode: meta.code,
            adminUsername,
          });
        } catch (err) {
          console.error("[email] Admin welcome failed:", err instanceof Error ? err.message : err);
          email = { ok: false, error: "send failed" };
        }
      } else {
        console.info("[email] skip Admin welcome: no adminEmail for", meta.code);
      }
      return NextResponse.json({ tenant: meta, email });
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

    if (action === "rename" || action === "update") {
      const name = String(body.name || "").trim();
      if (!body.id || !name) {
        return NextResponse.json({ error: "id and name required" }, { status: 400 });
      }
      const adminEmail = String(body.adminEmail || "").trim();
      if (adminEmail && !looksLikeEmail(adminEmail)) {
        return NextResponse.json({ error: "Invalid Admin email" }, { status: 400 });
      }
      const patch: { name: string; planId?: PlanId; adminEmail?: string } = { name };
      if (body.planId && ["starter", "pro", "enterprise"].includes(body.planId)) {
        patch.planId = body.planId as PlanId;
      }
      if (adminEmail) patch.adminEmail = adminEmail;
      const meta = await updateTenantMeta(body.id, patch);
      await updateBranding(body.id, { name });
      return NextResponse.json({ tenant: meta });
    }

    if (action === "impersonate") {
      const newSession = await impersonateTenant(session, body.id);
      const res = NextResponse.json({ token: newSession.token, session: newSession });
      res.cookies.set(HELP_MODE_COOKIE, "1", helpModeCookieSetOptions());
      return res;
    }

    if (action === "renew") {
      if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const days = Math.min(366, Math.max(1, Number(body.days) || 30));
      const renewsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const meta = await updateTenantMeta(body.id, {
        renewsAt,
        status: "active",
        ...(typeof body.billingNote === "string" ? { billingNote: body.billingNote } : {}),
      });
      return NextResponse.json({ tenant: meta });
    }

    if (action === "billing") {
      if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const patch: {
        status?: TenantStatus;
        billingNote?: string;
        renewsAt?: string;
        planId?: PlanId;
      } = {};
      if (body.status && ["active", "suspended", "past_due"].includes(body.status)) {
        patch.status = body.status as TenantStatus;
      }
      if (typeof body.billingNote === "string") patch.billingNote = body.billingNote;
      if (body.renewsAt) patch.renewsAt = String(body.renewsAt);
      if (body.planId && ["starter", "pro", "enterprise"].includes(body.planId)) {
        patch.planId = body.planId as PlanId;
      }
      const meta = await updateTenantMeta(body.id, patch);
      return NextResponse.json({ tenant: meta });
    }

    if (action === "features") {
      if (typeof body.fbrOptional === "boolean") {
        const features = await setPlatformFeatures({ fbrOptional: body.fbrOptional });
        return NextResponse.json({ features });
      }
      return NextResponse.json({ features: await getPlatformFeatures() });
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
