/**
 * Live stack config — never log secret values.
 * Localhost: leave MONGODB_URI empty → `.data/` file store (/lab works).
 * Vercel: set env vars in Project → Settings → Environment Variables.
 */
export function useMongo() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function mongoUri() {
  return process.env.MONGODB_URI?.trim() || "";
}

export function mongoDbName() {
  return process.env.MONGODB_DB?.trim() || "ordo";
}

export { appUrl } from "./urls";

export function contactWhatsapp() {
  return process.env.CONTACT_WHATSAPP?.trim() || "";
}

export function resendApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

/**
 * From address: RESEND_FROM or EMAIL_FROM. If both empty, use
 * `ORDO <noreply@{RESEND_DOMAIN|NEXT_PUBLIC_APP_HOST}>` only when that host is a
 * real domain (not localhost). Otherwise outbound is not configured.
 */
export function resendFromAddress() {
  const explicit = process.env.RESEND_FROM?.trim() || process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;
  const domain = (process.env.RESEND_DOMAIN?.trim() || process.env.NEXT_PUBLIC_APP_HOST?.trim() || "")
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .toLowerCase();
  if (!domain || domain === "localhost" || domain.startsWith("127.")) return "";
  return `ORDO <noreply@${domain}>`;
}

export function resendConfigured() {
  return Boolean(resendApiKey() && resendFromAddress());
}

export function resendWebhookSecret() {
  return process.env.RESEND_WEBHOOK_SECRET?.trim() || "";
}

/** Accept both names used across live docs / Vercel. */
export function r2PublicBase() {
  return (process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
}

export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim() &&
      r2PublicBase(),
  );
}

export function demoSeedEnabled() {
  return process.env.DEMO_SEED !== "false";
}

export function whatsappApiConfigured() {
  return Boolean(
    process.env.WHATSAPP_API_TOKEN?.trim() && process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export function storageMode(): "mongo" | "file" {
  return useMongo() ? "mongo" : "file";
}
