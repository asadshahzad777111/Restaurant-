import { NextRequest, NextResponse } from "next/server";
import { ensureBootstrap } from "@/lib/bootstrap";
import { AuthError, requireSuper } from "@/lib/session";
import { addLead, getContactWhatsapp, listLeads } from "@/lib/platform-store";
import type { PlanId } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  ensureBootstrap();
  try {
    requireSuper(req);
    return NextResponse.json({ leads: listLeads(), contactWhatsapp: getContactWhatsapp() });
  } catch (e) {
    if (e instanceof AuthError) {
      // Public: WhatsApp only (no lead list)
      return NextResponse.json({ contactWhatsapp: getContactWhatsapp() });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    ensureBootstrap();
    const body = await req.json();
    const lead = addLead({
      name: body.name,
      email: body.email,
      phone: body.phone,
      restaurantName: body.restaurantName,
      planId: body.planId as PlanId | undefined,
      message: body.message,
      source: body.source === "plans" ? "plans" : "contact",
    });
    return NextResponse.json({ lead, contactWhatsapp: getContactWhatsapp() });
  } catch {
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
