import { NextRequest, NextResponse } from "next/server";
import { addLead, ensureStore, listLeads } from "@/lib/db";
import { resendWebhookSecret } from "@/lib/env";
import { fetchReceivedEmail, parseEmailAddress, verifyResendWebhook } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Resend inbound + delivery events.
 * Set the webhook URL in Resend to https://api.ordo.asfins.com/api/webhooks/resend
 * (or same-origin /api/webhooks/resend).
 *
 * Verify with RESEND_WEBHOOK_SECRET (Svix signing secret from the Resend webhook page)
 * when present. Outbound still works without inbound MX.
 *
 * Receiving (Gmail-style inbox) needs MX on a Resend receiving subdomain such as
 * inbound.ordo.asfins.com — do not change asfins.com apex DNS.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = resendWebhookSecret();
  if (secret && !verifyResendWebhook(raw, req.headers, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = String(payload.type || payload.event || "");
  const data = (payload.data && typeof payload.data === "object"
    ? payload.data
    : payload) as Record<string, unknown>;

  if (type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: type || "unknown" });
  }

  try {
    await ensureStore();
    const emailId = String(data.email_id || data.id || "");
    const leadId = emailId ? `lead_resend_${emailId}` : `lead_resend_${Date.now()}`;
    const existing = (await listLeads()).some((l) => l.id === leadId);
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const received = emailId ? await fetchReceivedEmail(emailId) : null;
    const fromRaw = String(received?.from || data.from || "");
    const fromEmail = fromRaw ? parseEmailAddress(fromRaw) : "";
    const subject = String(received?.subject || data.subject || "(no subject)");
    const toList = Array.isArray(received?.to)
      ? received.to.map(String)
      : Array.isArray(data.to)
        ? (data.to as unknown[]).map(String)
        : [];
    const bodyText =
      (received?.text && String(received.text).trim()) ||
      stripTags(received?.html ? String(received.html) : "") ||
      "";

    await addLead({
      id: leadId,
      name: displayName(fromRaw) || fromEmail || "Incoming email",
      email: fromEmail || "unknown@inbound",
      restaurantName: toList[0],
      message: [`Subject: ${subject}`, toList.length ? `To: ${toList.join(", ")}` : "", bodyText]
        .filter(Boolean)
        .join("\n"),
      source: "inbound_email",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[email] inbound webhook failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to store inbound mail" }, { status: 500 });
  }
}

function displayName(raw: string) {
  const before = raw.split("<")[0]?.trim().replace(/^"|"$/g, "");
  return before && !before.includes("@") ? before : "";
}

function stripTags(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
