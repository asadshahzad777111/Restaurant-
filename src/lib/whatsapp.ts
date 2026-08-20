import { contactWhatsapp, whatsappApiConfigured } from "./env";

/** Click-to-chat always works. Cloud API only if WHATSAPP_* set. */
export function guestWhatsappLink(text: string, phone?: string) {
  const digits = (phone || contactWhatsapp() || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function sendWhatsappCloudApi(toE164: string, body: string) {
  if (!whatsappApiConfigured()) {
    return { skipped: true as const, reason: "WhatsApp Cloud API env not set — use wa.me link" };
  }
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_API_TOKEN!;
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toE164.replace(/\D/g, ""),
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false as const, error: err.slice(0, 200) };
  }
  return { ok: true as const };
}
