import { NextRequest, NextResponse } from "next/server";
import { ensureStore, addLead, getContactWhatsapp, listLeads } from "@/lib/db";
import { AuthError, requireSuper } from "@/lib/session";
import { sendLeadEmail } from "@/lib/notify";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  await ensureStore();
  try {
    await requireSuper(req);
    return NextResponse.json({
      leads: await listLeads(),
      contactWhatsapp: await getContactWhatsapp(),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ contactWhatsapp: await getContactWhatsapp() });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureStore();
    const body = await req.json();
    const lead = await addLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      restaurantName: body.restaurantName,
      planId: body.planId as PlanId | undefined,
      message: body.message,
      source: body.source === "plans" ? "plans" : "contact",
    });
    const mail = await sendLeadEmail({
      name: lead.name,
      email: lead.email,
      restaurantName: lead.restaurantName,
      message: lead.message,
      planId: lead.planId,
    });
    return NextResponse.json({
      lead,
      contactWhatsapp: await getContactWhatsapp(),
      email: mail,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
