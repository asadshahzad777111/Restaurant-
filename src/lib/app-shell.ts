export const APP_SHELL_KEY = "ordo_app_shell";
/** Baked kitchen for Customer PWA/APK — never open another code while locked. */
export const LOCKED_CUSTOMER_TENANT_KEY = "ordo_customer_locked_tenant";
/** Preferred staff kitchen code for Staff PWA/APK (login preset). */
export const LOCKED_STAFF_TENANT_KEY = "ordo_staff_locked_tenant";

export type AppShellKind = "staff" | "customer" | "web";

function safeTenant(raw: string | null | undefined) {
  const c = (raw || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(c)) return "";
  return c;
}

/** Capacitor / PWA shells persist after the first URL so later routes stay on that tenant app. */
export function readAppShell(): AppShellKind {
  if (typeof window === "undefined") return "web";
  const params = new URLSearchParams(window.location.search);
  const q = params.get("app");
  const tenant = safeTenant(params.get("tenant") || params.get("code"));

  if (q === "staff" || q === "pos") {
    localStorage.setItem(APP_SHELL_KEY, "staff");
    if (tenant) localStorage.setItem(LOCKED_STAFF_TENANT_KEY, tenant);
    return "staff";
  }
  if (q === "customer" || q === "guest") {
    localStorage.setItem(APP_SHELL_KEY, "customer");
    if (tenant) localStorage.setItem(LOCKED_CUSTOMER_TENANT_KEY, tenant);
    return "customer";
  }
  /* Retired third APK used app=client — treat as Staff, never Super. */
  if (q === "client") {
    localStorage.setItem(APP_SHELL_KEY, "staff");
    if (tenant) localStorage.setItem(LOCKED_STAFF_TENANT_KEY, tenant);
    return "staff";
  }
  const saved = localStorage.getItem(APP_SHELL_KEY);
  if (saved === "staff" || saved === "customer") return saved;
  return "web";
}

export function isStaffShell() {
  const kind = readAppShell();
  return kind === "staff";
}

export function isCustomerShell() {
  return readAppShell() === "customer";
}

/** Locked Customer kitchen code (PWA/APK). Empty if not locked. */
export function readLockedCustomerTenant(): string {
  if (typeof window === "undefined") return "";
  if (!isCustomerShell()) return "";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = safeTenant(params.get("tenant") || params.get("code"));
  if (fromUrl) {
    localStorage.setItem(LOCKED_CUSTOMER_TENANT_KEY, fromUrl);
    return fromUrl;
  }
  return safeTenant(localStorage.getItem(LOCKED_CUSTOMER_TENANT_KEY));
}

export function readLockedStaffTenant(): string {
  if (typeof window === "undefined") return "";
  if (!isStaffShell()) return "";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = safeTenant(params.get("tenant") || params.get("code"));
  if (fromUrl) {
    localStorage.setItem(LOCKED_STAFF_TENANT_KEY, fromUrl);
    return fromUrl;
  }
  return safeTenant(localStorage.getItem(LOCKED_STAFF_TENANT_KEY));
}

/** True when Customer shell must stay on one kitchen. */
export function isCustomerTenantLocked() {
  return Boolean(readLockedCustomerTenant());
}
