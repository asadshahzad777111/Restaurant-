/**
 * Outgoing mail via Resend REST (https://api.resend.com/emails).
 * Incoming: POST /api/webhooks/resend — see that route. Receiving needs MX on a
 * Resend subdomain (e.g. inbound.ordo.asfins.com), never asfins.com apex DNS.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { resendConfigured, resendFromAddress, resendApiKey } from "./env";

export type SendEmailResult =
  | { skipped: true; reason: string }
  | { ok: true; id?: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(value: string) {
  return EMAIL_RE.test(value.trim());
}

/** "Name <a@b.com>" or bare address → lowercase mailbox. */
export function parseEmailAddress(raw: string) {
  const trimmed = raw.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  return (angle?.[1] || trimmed).trim().toLowerCase();
}

export function uniqueEmails(values: Array<string | undefined | null>) {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const email = parseEmailAddress(v);
    if (!looksLikeEmail(email) || out.includes(email)) continue;
    out.push(email);
  }
  return out;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] || c;
  });
}

export function textToHtml(text: string) {
  return `<pre style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
}

/**
 * Send one email. If RESEND_API_KEY (and from-address) are missing, log and skip —
 * never report success. Health stays integrations.resend:false.
 */
export async function sendResendEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const key = resendApiKey();
  const from = resendFromAddress();
  if (!key || !from) {
    const reason = "RESEND_API_KEY / from-address not set";
    console.info("[email] skip send:", reason, input.subject);
    return { skipped: true, reason };
  }

  const to = uniqueEmails(Array.isArray(input.to) ? input.to : [input.to]);
  if (!to.length) {
    const reason = "no valid recipient";
    console.info("[email] skip send:", reason, input.subject);
    return { skipped: true, reason };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        text: input.text,
        html: input.html || textToHtml(input.text),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      const error = body.message || body.name || `Resend HTTP ${res.status}`;
      console.error("[email] Resend send failed:", error);
      return { ok: false, error };
    }
    return { ok: true, id: body.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Resend request failed";
    console.error("[email] Resend send error:", error);
    return { ok: false, error };
  }
}

/** GET https://api.resend.com/emails/receiving/:id — body is not on the webhook. */
export async function fetchReceivedEmail(emailId: string) {
  const key = resendApiKey();
  if (!key || !emailId) return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      id?: string;
      from?: string;
      to?: string[];
      subject?: string;
      text?: string | null;
      html?: string | null;
      headers?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

/**
 * Verify Resend/Svix signature when RESEND_WEBHOOK_SECRET is set.
 * If the secret is unset, callers may accept the payload (inbound stub).
 */
export function verifyResendWebhook(rawBody: string, headers: Headers, secret: string) {
  const id = headers.get("svix-id") || headers.get("webhook-id") || "";
  const timestamp = headers.get("svix-timestamp") || headers.get("webhook-timestamp") || "";
  const signature = headers.get("svix-signature") || headers.get("webhook-signature") || "";
  const bearer = (headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const headerSecret = headers.get("x-resend-secret")?.trim() || "";

  if (bearer && bearer === secret) return true;
  if (headerSecret && headerSecret === secret) return true;

  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const signed = `${id}.${timestamp}.${rawBody}`;
  const secretB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signature.split(" ").some((part) => {
    const sig = part.startsWith("v1,") ? part.slice(3) : part;
    const got = Buffer.from(sig);
    return got.length === expectedBuf.length && timingSafeEqual(got, expectedBuf);
  });
}

export { resendConfigured };
