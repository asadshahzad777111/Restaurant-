export const APP_SHELL_KEY = "ordo_app_shell";

export type AppShellKind = "staff" | "customer" | "web";

/** Capacitor shells persist after the first URL so later routes stay on that tenant app. */
export function readAppShell(): AppShellKind {
  if (typeof window === "undefined") return "web";
  const q = new URLSearchParams(window.location.search).get("app");
  if (q === "staff" || q === "pos") {
    localStorage.setItem(APP_SHELL_KEY, "staff");
    return "staff";
  }
  if (q === "customer" || q === "guest") {
    localStorage.setItem(APP_SHELL_KEY, "customer");
    return "customer";
  }
  /* Retired third APK used app=client — treat as Staff, never Super. */
  if (q === "client") {
    localStorage.setItem(APP_SHELL_KEY, "staff");
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
