/**
 * Live hosts for asfins.com (ORDO).
 * App UI and API are split so the public restaurant surface and backend
 * do not share the same hostname.
 */
export const LIVE_APP_HOST = "ordo.asfins.com";
export const LIVE_API_HOST = "api.ordo.asfins.com";
export const LIVE_MEDIA_HOST = "media.ordo.asfins.com";

/** Client + server: absolute API base when set (Vercel). Empty = same-origin (/api). */
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

export function allowedAppOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `https://${LIVE_APP_HOST}`,
  ]);
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (app) origins.add(app);
  return [...origins];
}

export function isApiHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  const configured = process.env.NEXT_PUBLIC_API_HOST?.trim().toLowerCase();
  return h === LIVE_API_HOST || (!!configured && h === configured);
}

export function isAppHost(host: string): boolean {
  const h = host.split(":")[0].toLowerCase();
  const configured = process.env.NEXT_PUBLIC_APP_HOST?.trim().toLowerCase();
  return (
    h === LIVE_APP_HOST ||
    h === "localhost" ||
    h === "127.0.0.1" ||
    (!!configured && h === configured)
  );
}
