/** First-open Hello / welcome for Staff + Customer APKs (per kitchen, per person). */

export type ApkWelcomeKind = "staff" | "customer";

function key(kind: ApkWelcomeKind, id: string) {
  return `ordo_apk_welcome_v1_${kind}_${id}`;
}

export function hasSeenApkWelcome(kind: ApkWelcomeKind, id: string) {
  if (typeof window === "undefined" || !id) return true;
  try {
    return localStorage.getItem(key(kind, id)) === "1";
  } catch {
    return true;
  }
}

export function markApkWelcomeSeen(kind: ApkWelcomeKind, id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(key(kind, id), "1");
  } catch {
    /* ignore quota */
  }
}

export function staffWelcomeId(tenantId: string, userId: string) {
  return `${tenantId}_${userId}`;
}
