import fs from "fs";
import path from "path";

export type ApkId = "staff" | "customer";
export type ApkFormat = "apk" | "aab";

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

/** Restaurant OS host. APKs must never target /super or mix tenants. */
export function apkAppHost() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://ordo.asfins.com";
  return raw.replace(/\/$/, "");
}

/** Global template binaries (rebuild base). Distribution is per-tenant. */
export const APK_APPS: ApkApp[] = [
  {
    id: "staff",
    title: "ORDO Staff (template)",
    filename: "ORDO-Staff.apk",
    audience: "Admin / POS / billing / kitchen / staff",
    loadsPath: "/login?app=staff",
    version: "1.0.0",
    note: "Global template only. Publish a per-restaurant Staff APK so kitchens never mix.",
  },
  {
    id: "customer",
    title: "ORDO Customer (template)",
    filename: "ORDO-Customer.apk",
    audience: "Diners — dining, pickup, delivery, COD, QR scan",
    loadsPath: "/guest?app=customer",
    version: "1.0.0",
    note: "Global template only. Publish a per-restaurant Customer APK locked to that kitchen code.",
  },
];

function safeCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 24) || "KITCHEN";
}

export function parseApkFormat(raw: string | null | undefined): ApkFormat {
  return raw === "aab" ? "aab" : "apk";
}

export function tenantApkFilename(code: string, id: ApkId, format: ApkFormat = "apk") {
  const c = safeCode(code);
  const base = id === "staff" ? `ORDO-${c}-Staff` : `ORDO-${c}-Customer`;
  return `${base}.${format}`;
}

export function tenantApkDisplayTitle(restaurantName: string, id: ApkId) {
  const name = restaurantName.trim() || "Restaurant";
  return id === "staff" ? `${name} · Staff` : `${name} · Customer`;
}

export function tenantApkLoadsPath(code: string, id: ApkId) {
  const c = encodeURIComponent(safeCode(code));
  return id === "staff"
    ? `/login?app=staff&tenant=${c}`
    : `/guest?app=customer&tenant=${c}`;
}

export function apkFilePath(id: ApkId) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");
  return path.join(DATA_ROOT, app.filename);
}

export function tenantApkFilePath(tenantId: string, id: ApkId, format: ApkFormat = "apk") {
  return path.join(DATA_ROOT, "tenants", tenantId, `${id}.${format}`);
}

function fileStat(file: string) {
  const stat = fs.existsSync(file) ? fs.statSync(file) : null;
  return {
    available: Boolean(stat),
    sizeBytes: stat?.size ?? 0,
    updatedAt: stat?.mtime.toISOString() ?? null,
  };
}

export function listApkStatus() {
  const host = apkAppHost();
  return APK_APPS.map((app) => {
    const file = apkFilePath(app.id);
    const meta = fileStat(file);
    return {
      ...app,
      scope: "template" as const,
      format: "apk" as ApkFormat,
      ...meta,
      loadsUrl: `${host}${app.loadsPath}`,
    };
  });
}

export function listTenantApkStatus(input: {
  tenantId: string;
  code: string;
  name: string;
}) {
  const host = apkAppHost();
  return (["staff", "customer"] as ApkId[]).map((id) => {
    const apkFile = tenantApkFilePath(input.tenantId, id, "apk");
    const aabFile = tenantApkFilePath(input.tenantId, id, "aab");
    const apkMeta = fileStat(apkFile);
    const aabMeta = fileStat(aabFile);
    const loadsPath = tenantApkLoadsPath(input.code, id);
    return {
      id,
      scope: "tenant" as const,
      tenantId: input.tenantId,
      code: safeCode(input.code),
      title: tenantApkDisplayTitle(input.name, id),
      filename: tenantApkFilename(input.code, id, "apk"),
      aabFilename: tenantApkFilename(input.code, id, "aab"),
      audience: id === "staff" ? "This kitchen’s staff only" : "This kitchen’s guests only",
      loadsPath,
      version: "1.0.0",
      note:
        id === "staff"
          ? "APK for staff phones. AAB for Google Play listing. Never opens Super HQ."
          : "APK for diners (WhatsApp/sideload). AAB for Google Play. Locked to this kitchen only.",
      format: "apk" as ApkFormat,
      available: apkMeta.available,
      sizeBytes: apkMeta.sizeBytes,
      updatedAt: apkMeta.updatedAt,
      aabAvailable: aabMeta.available,
      aabSizeBytes: aabMeta.sizeBytes,
      aabUpdatedAt: aabMeta.updatedAt,
      loadsUrl: `${host}${loadsPath}`,
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

export function saveTenantApk(
  tenantId: string,
  code: string,
  name: string,
  id: ApkId,
  buffer: Buffer,
  format: ApkFormat = "apk",
) {
  const dest = tenantApkFilePath(tenantId, id, format);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buffer);
  const named = path.join(path.dirname(dest), tenantApkFilename(code, id, format));
  fs.writeFileSync(named, buffer);
  return listTenantApkStatus({ tenantId, code, name }).find((a) => a.id === id)!;
}

export function readApk(id: ApkId): { filename: string; buffer: Buffer; contentType: string } | null {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) return null;
  const file = apkFilePath(id);
  if (!fs.existsSync(file)) return null;
  return {
    filename: app.filename,
    buffer: fs.readFileSync(file),
    contentType: "application/vnd.android.package-archive",
  };
}

export function readTenantApk(
  tenantId: string,
  code: string,
  id: ApkId,
  format: ApkFormat = "apk",
): { filename: string; buffer: Buffer; contentType: string } | null {
  const file = tenantApkFilePath(tenantId, id, format);
  if (!fs.existsSync(file)) return null;
  return {
    filename: tenantApkFilename(code, id, format),
    buffer: fs.readFileSync(file),
    contentType:
      format === "aab"
        ? "application/octet-stream"
        : "application/vnd.android.package-archive",
  };
}

export function removeApk(id: ApkId) {
  const file = apkFilePath(id);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return listApkStatus().find((a) => a.id === id)!;
}

export function removeTenantApk(
  tenantId: string,
  code: string,
  name: string,
  id: ApkId,
  format?: ApkFormat,
) {
  const formats: ApkFormat[] = format ? [format] : ["apk", "aab"];
  for (const f of formats) {
    const file = tenantApkFilePath(tenantId, id, f);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    const named = path.join(path.dirname(file), tenantApkFilename(code, id, f));
    if (fs.existsSync(named)) fs.unlinkSync(named);
  }
  return listTenantApkStatus({ tenantId, code, name }).find((a) => a.id === id)!;
}
