/** Client-safe APK / PWA URL helpers (no Node fs). */

export type ApkId = "staff" | "customer";

function safeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24) || "KITCHEN";
}

/** Restaurant OS host. APKs / PWAs must never target /super or mix tenants. */
export function apkAppHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";
  return raw.replace(/\/$/, "");
}

/** Locked deep-link path for Staff or Customer shell. */
export function tenantApkLoadsPath(code: string, id: ApkId) {
  const c = encodeURIComponent(safeCode(code));
  return id === "staff"
    ? `/login?app=staff&tenant=${c}`
    : `/guest?app=customer&tenant=${c}`;
}
