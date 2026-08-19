import fs from "fs";
import path from "path";

export type ApkId = "pos" | "customer" | "client";

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
const PUBLIC_DIR = path.join(process.cwd(), "public", "downloads");

/** Public restaurant OS host the APKs open. Super `/super` is never the WebView target. */
export function apkAppHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";
  return raw.replace(/\/$/, "");
}

export const APK_APPS: ApkApp[] = [
  {
    id: "pos",
    title: "ORDO POS",
    filename: "ORDO-POS.apk",
    audience: "Kitchen counter staff",
    loadsPath: "/login?app=pos",
    version: "1.0.0",
    note: "Download only on Super. Opens restaurant POS — not the Super panel, and not a Super domain.",
  },
  {
    id: "customer",
    title: "ORDO Customer",
    filename: "ORDO-Customer.apk",
    audience: "Diners / guests",
    loadsPath: "/guest",
    version: "1.0.0",
    note: "Public order app: dining, takeaway, delivery, QR. Super Admin is never the start screen.",
  },
  {
    id: "client",
    title: "ORDO Client",
    filename: "ORDO-Client.apk",
    audience: "Restaurant owner / client",
    loadsPath: "/login?app=client",
    version: "1.0.0",
    note: "For your restaurant clients. Login with kitchen code. Super Admin toggle is hidden in this app.",
  },
];

export function apkFilePath(id: ApkId) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");
  const inData = path.join(DATA_ROOT, app.filename);
  if (fs.existsSync(inData)) return inData;
  return path.join(PUBLIC_DIR, app.filename);
}

export function apkExists(id: ApkId) {
  return fs.existsSync(apkFilePath(id));
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
