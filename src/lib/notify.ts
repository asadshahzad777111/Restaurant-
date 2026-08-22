import { contactWhatsapp, resendConfigured, resendFromAddress } from "./env";
import { appUrl } from "./urls";
import { sendResendEmail, uniqueEmails, type SendEmailResult } from "./email";
import { guestWhatsappLink } from "./whatsapp";
import type { PlatformTenantMeta, ServiceType } from "./types";
import type { TenantState } from "./tenant-types";

export type { SendEmailResult };
export { guestWhatsappLink };
import { sendWhatsappCloudApi, toE164Pakistan } from "./whatsapp";
export { sendWhatsappCloudApi };

export function serviceTypeLabel(serviceType: ServiceType) {
  if (serviceType === "table") return "Dine-in";
  if (serviceType === "pickup") return "Takeaway";
  if (serviceType === "delivery") return "Delivery";
  return "Counter";
}

/** Only this kitchen's Admin / contact email — never another tenant. */
export function tenantAdminEmails(tenant: TenantState, meta?: PlatformTenantMeta | null) {
  const fromUsers = tenant.users
    .filter((u) => u.role === "admin" && u.active !== false)
    .map((u) => u.email);
  return uniqueEmails([meta?.adminEmail, ...fromUsers]);
}

export async function sendLeadEmail(input: {
  to?: string;
  name: string;
  email: string;
  restaurantName?: string;
  message?: string;
  planId?: string;
}): Promise<SendEmailResult> {
  if (!resendConfigured()) {
    return { skipped: true, reason: "RESEND_API_KEY / from-address not set" };
  }
  const to = input.to || process.env.RESEND_NOTIFY_TO?.trim() || resendFromAddress();
  const text = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Restaurant: ${input.restaurantName || "—"}`,
    `Plan: ${input.planId || "—"}`,
    `Message: ${input.message || "—"}`,
    `WhatsApp contact: ${contactWhatsapp() || "—"}`,
  ].join("\n");
  return sendResendEmail({
    to: to ? [to] : [],
    subject: `ORDO lead: ${input.name}${input.planId ? ` (${input.planId})` : ""}`,
    text,
    replyTo: input.email && input.email.includes("@") ? input.email : undefined,
  });
}

export async function sendAdminWelcomeEmail(input: {
  to: string;
  restaurantName: string;
  restaurantCode: string;
  adminUsername: string;
}): Promise<SendEmailResult> {
  const loginUrl = `${appUrl()}/login`;
  const wa = contactWhatsapp();
  const waLine = wa
    ? `Need help? WhatsApp ORDO: ${guestWhatsappLink(`Hello ORDO — new Admin for ${input.restaurantCode}`)}`
    : "";
  const text = [
    `Your restaurant is on ORDO.`,
    ``,
    `Restaurant: ${input.restaurantName}`,
    `Restaurant code: ${input.restaurantCode}`,
    `Login: ${loginUrl}`,
    `Username: ${input.adminUsername}`,
    ``,
    `Sign in with that code and username, then change your password.`,
    waLine,
  ]
    .filter(Boolean)
    .join("\n");
  return sendResendEmail({
    to: input.to,
    subject: `ORDO: ${input.restaurantName} is ready (${input.restaurantCode})`,
    text,
  });
}

export async function sendNewOrderEmail(input: {
  to: string[];
  restaurantName: string;
  restaurantCode: string;
  orderId: string;
  orderNumber: number;
  serviceType: ServiceType;
  total: number;
  subtotal: number;
  currency: string;
}): Promise<SendEmailResult> {
  const money = (n: number) => `${input.currency} ${n.toFixed(0)}`;
  const text = [
    `New order at ${input.restaurantName} (${input.restaurantCode}).`,
    ``,
    `Order id: ${input.orderId}`,
    `Order #: ${input.orderNumber}`,
    `Type: ${serviceTypeLabel(input.serviceType)}`,
    `Subtotal: ${money(input.subtotal)}`,
    `Total: ${money(input.total)}`,
  ].join("\n");
  return sendResendEmail({
    to: input.to,
    subject: `ORDO order #${input.orderNumber} — ${serviceTypeLabel(input.serviceType)} — ${input.restaurantName}`,
    text,
  });
}

/**
 * Guest order confirmation via WhatsApp Cloud API. Non-blocking and safe:
 * skips gracefully when WHATSAPP_* env is unset or no customer phone exists.
 */
export async function sendOrderWhatsapp(input: {
  customerPhone?: string;
  restaurantName: string;
  orderNumber: number;
  total: number;
  currency: string;
  trackUrl: string;
}) {
  const to = toE164Pakistan(input.customerPhone);
  if (!to) return { skipped: true as const, reason: "no customer phone" };
  const text = [
    `${input.restaurantName} — Order #${input.orderNumber} confirmed ✅`,
    `Total: ${input.currency} ${input.total.toFixed(0)}`,
    `Track live: ${input.trackUrl}`,
  ].join("\n");
  return sendWhatsappCloudApi(to, text);
}
