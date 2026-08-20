/**
 * Live hosts for asfins.com (ORDO). Do not change apex/www DNS from this app.
 *
 * - ordo.asfins.com     → restaurants (guest + staff). No owner panel. Admin cannot open HQ.
 * - control.asfins.com  → Super only. Creating a restaurant does not log Super in as that Admin.
 * - api.ordo.asfins.com → backend /api only
 * - media.ordo.asfins.com → R2 media + backups
 */
export const LIVE_APP_HOST = "ordo.asfins.com";
export const LIVE_CONTROL_HOST = "control.asfins.com";
export const LIVE_API_HOST = "api.ordo.asfins.com";
export const LIVE_MEDIA_HOST = "media.ordo.asfins.com";

/** Client + server: absolute API base when set. Empty = same-origin (/api). */
export function publicApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "";
}

/** Build fetch URL for `/api/...` paths. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = publicApiBase();
  return base ? `${base}${p}` : p;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

export function controlUrl(): string {
  return (
    process.env.NEXT_PUBLIC_CONTROL_URL?.trim().replace(/\/$/, "") ||
    `https://${LIVE_CONTROL_HOST}`
  );
}

export function allowedAppOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `https://${LIVE_APP_HOST}`,
    `https://${LIVE_CONTROL_HOST}`,
  ]);
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (app) origins.add(app);
  const control = process.env.NEXT_PUBLIC_CONTROL_URL?.trim().replace(/\/$/, "");
  if (control) origins.add(control);
  return [...origins];
}

function hostName(host: string) {
  return host.split(":")[0].toLowerCase();
}

export function isApiHost(host: string): boolean {
  const h = hostName(host);
  const configured = process.env.NEXT_PUBLIC_API_HOST?.trim().toLowerCase();
  return h === LIVE_API_HOST || (!!configured && h === configured);
}

export function isControlHost(host: string): boolean {
  const h = hostName(host);
  const configured = process.env.NEXT_PUBLIC_CONTROL_HOST?.trim().toLowerCase();
  return h === LIVE_CONTROL_HOST || (!!configured && h === configured);
}

export function isAppHost(host: string): boolean {
  const h = hostName(host);
  const configured = process.env.NEXT_PUBLIC_APP_HOST?.trim().toLowerCase();
  return (
    h === LIVE_APP_HOST ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    (!!configured && h === configured)
  );
}

/** Localhost: owner panel allowed via /control (dev only). */
export function isLocalHost(host: string): boolean {
  const h = hostName(host);
  return h === "localhost" || h === "127.0.0.1";
}
