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

export function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
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
