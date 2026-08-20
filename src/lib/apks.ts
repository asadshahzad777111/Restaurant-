import fs from "fs";
import path from "path";

export type ApkId = "staff" | "customer";

export interface ApkApp {
  id: ApkId;
  title: string;
  filename: string;
  audience: string;
  loadsPath: string;
  version: string;
  note: string;
}

const DATA_ROOT = path.join(process.cwd(), ".data", "apks");

/** Restaurant OS host. Super `/super` is never the WebView target and has no extra domain. */
export function apkAppHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";
  return raw.replace(/\/$/, "");
}

export const APK_APPS: ApkApp[] = [
  {
    id: "staff",
    title: "ORDO Staff",
    filename: "ORDO-Staff.apk",
    audience: "Admin / POS / billing / kitchen / staff",
    loadsPath: "/login?app=staff",
    version: "1.0.0",
    note: "Restaurant floor app. After kitchen-code login: Home, POS, orders, kitchen, menu, staff. Super panel is not inside this APK. Download only from Super → Apps.",
  },
  {
    id: "customer",
    title: "ORDO Customer",
    filename: "ORDO-Customer.apk",
    audience: "Diners — dining, pickup, delivery, COD, QR scan",
    loadsPath: "/guest?app=customer",
    version: "1.0.0",
    note: "Guest app: find kitchen, scan table QR, dine-in, pickup, delivery / cash on delivery. No Super download, no public demo download.",
  },
];

export function apkFilePath(id: ApkId) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");
  return path.join(DATA_ROOT, app.filename);
}

export function listApkStatus() {
  const host = apkAppHost();
  return APK_APPS.map((app) => {
    const file = apkFilePath(app.id);
    const stat = fs.existsSync(file) ? fs.statSync(file) : null;
    return {
      ...app,
      available: Boolean(stat),
      sizeBytes: stat?.size ?? 0,
      updatedAt: stat?.mtime.toISOString() ?? null,
      loadsUrl: `${host}${app.loadsPath}`,
    };
  });
}

export function saveApk(id: ApkId, buffer: Buffer) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");
  const dest = path.join(DATA_ROOT, app.filename);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  return listApkStatus().find((a) => a.id === id)!;
}

export function readApk(id: ApkId): { filename: string; buffer: Buffer } | null {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) return null;
  const file = apkFilePath(id);
  if (!fs.existsSync(file)) return null;
  return { filename: app.filename, buffer: fs.readFileSync(file) };
}
