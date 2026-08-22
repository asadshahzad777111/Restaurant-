import fs from "fs";
import path from "path";
import { apkAppHost, tenantApkLoadsPath, type ApkId } from "./apk-urls";
import { r2Configured } from "./env";
import { deleteR2Object, getR2Object, headR2Object, putR2Object } from "./r2";

export type { ApkId } from "./apk-urls";
export { apkAppHost, tenantApkLoadsPath } from "./apk-urls";

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

function safeTenantId(tenantId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid tenant id");
  }
  return tenantId;
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

export function apkContentType(format: ApkFormat) {
  return format === "aab"
    ? "application/octet-stream"
    : "application/vnd.android.package-archive";
}

/** R2 object keys — per-tenant isolation. Downloads still go through auth APIs. */
export function tenantApkR2Key(tenantId: string, id: ApkId, format: ApkFormat = "apk") {
  return `tenants/${safeTenantId(tenantId)}/apks/${id}.${format}`;
}

export function templateApkR2Key(id: ApkId) {
  return `templates/apks/${id}.apk`;
}

export function apkFilePath(id: ApkId) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");
  return path.join(DATA_ROOT, app.filename);
}

export function tenantApkFilePath(tenantId: string, id: ApkId, format: ApkFormat = "apk") {
  return path.join(DATA_ROOT, "tenants", safeTenantId(tenantId), `${id}.${format}`);
}

function useR2ApkStore() {
  return r2Configured();
}

/** On Vercel, local `.data/` is ephemeral/read-only — R2 is required. */
function assertWritableLocalStore() {
  if (process.env.VERCEL) {
    throw new Error(
      "APK storage on Vercel requires Cloudflare R2. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL (or R2_PUBLIC_BASE_URL).",
    );
  }
}

function fileStat(file: string) {
  const stat = fs.existsSync(file) ? fs.statSync(file) : null;
  return {
    available: Boolean(stat),
    sizeBytes: stat?.size ?? 0,
    updatedAt: stat?.mtime.toISOString() ?? null,
  };
}

async function objectStat(key: string) {
  const meta = await headR2Object(key);
  return {
    available: Boolean(meta),
    sizeBytes: meta?.sizeBytes ?? 0,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function listApkStatus() {
  const host = apkAppHost();
  const r2 = useR2ApkStore();
  return Promise.all(
    APK_APPS.map(async (app) => {
      const meta = r2 ? await objectStat(templateApkR2Key(app.id)) : fileStat(apkFilePath(app.id));
      return {
        ...app,
        scope: "template" as const,
        format: "apk" as ApkFormat,
        storage: r2 ? ("r2" as const) : ("file-store" as const),
        ...meta,
        loadsUrl: `${host}${app.loadsPath}`,
      };
    }),
  );
}

export async function listTenantApkStatus(input: {
  tenantId: string;
  code: string;
  name: string;
}) {
  const host = apkAppHost();
  const r2 = useR2ApkStore();
  const tenantId = safeTenantId(input.tenantId);
  return Promise.all(
    (["staff", "customer"] as ApkId[]).map(async (id) => {
      const apkMeta = r2
        ? await objectStat(tenantApkR2Key(tenantId, id, "apk"))
        : fileStat(tenantApkFilePath(tenantId, id, "apk"));
      const aabMeta = r2
        ? await objectStat(tenantApkR2Key(tenantId, id, "aab"))
        : fileStat(tenantApkFilePath(tenantId, id, "aab"));
      const loadsPath = tenantApkLoadsPath(input.code, id);
      return {
        id,
        scope: "tenant" as const,
        tenantId,
        code: safeCode(input.code),
        title: tenantApkDisplayTitle(input.name, id),
        filename: tenantApkFilename(input.code, id, "apk"),
        aabFilename: tenantApkFilename(input.code, id, "aab"),
        audience: id === "staff" ? "This kitchen’s staff only" : "This kitchen’s guests only",
        loadsPath,
        version: "1.0.0",
        note:
          id === "staff"
            ? `Home screen: ${tenantApkDisplayTitle(input.name, "staff")}. POS, kitchen, thermal print. Never Super HQ.`
            : `Home screen: ${tenantApkDisplayTitle(input.name, "customer")}. Guests only — locked to this kitchen.`,
        format: "apk" as ApkFormat,
        storage: r2 ? ("r2" as const) : ("file-store" as const),
        available: apkMeta.available,
        sizeBytes: apkMeta.sizeBytes,
        updatedAt: apkMeta.updatedAt,
        aabAvailable: aabMeta.available,
        aabSizeBytes: aabMeta.sizeBytes,
        aabUpdatedAt: aabMeta.updatedAt,
        loadsUrl: `${host}${loadsPath}`,
      };
    }),
  );
}

export async function saveApk(id: ApkId, buffer: Buffer) {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) throw new Error("Unknown APK");

  if (useR2ApkStore()) {
    const result = await putR2Object({
      key: templateApkR2Key(id),
      body: buffer,
      contentType: apkContentType("apk"),
    });
    if ("error" in result) throw new Error(result.error);
  } else {
    assertWritableLocalStore();
    const dest = path.join(DATA_ROOT, app.filename);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
  }

  const rows = await listApkStatus();
  return rows.find((a) => a.id === id)!;
}

export async function saveTenantApk(
  tenantId: string,
  code: string,
  name: string,
  id: ApkId,
  buffer: Buffer,
  format: ApkFormat = "apk",
) {
  const tid = safeTenantId(tenantId);

  if (useR2ApkStore()) {
    const result = await putR2Object({
      key: tenantApkR2Key(tid, id, format),
      body: buffer,
      contentType: apkContentType(format),
    });
    if ("error" in result) throw new Error(result.error);
  } else {
    assertWritableLocalStore();
    const dest = tenantApkFilePath(tid, id, format);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buffer);
    const named = path.join(path.dirname(dest), tenantApkFilename(code, id, format));
    fs.writeFileSync(named, buffer);
  }

  const rows = await listTenantApkStatus({ tenantId: tid, code, name });
  return rows.find((a) => a.id === id)!;
}

export async function readApk(
  id: ApkId,
): Promise<{ filename: string; buffer: Buffer; contentType: string } | null> {
  const app = APK_APPS.find((a) => a.id === id);
  if (!app) return null;

  if (useR2ApkStore()) {
    const obj = await getR2Object(templateApkR2Key(id));
    if (!obj) return null;
    return {
      filename: app.filename,
      buffer: obj.body,
      contentType: apkContentType("apk"),
    };
  }

  const file = apkFilePath(id);
  if (!fs.existsSync(file)) return null;
  return {
    filename: app.filename,
    buffer: fs.readFileSync(file),
    contentType: apkContentType("apk"),
  };
}

export async function readTenantApk(
  tenantId: string,
  code: string,
  id: ApkId,
  format: ApkFormat = "apk",
): Promise<{ filename: string; buffer: Buffer; contentType: string } | null> {
  const tid = safeTenantId(tenantId);

  if (useR2ApkStore()) {
    const obj = await getR2Object(tenantApkR2Key(tid, id, format));
    if (!obj) return null;
    return {
      filename: tenantApkFilename(code, id, format),
      buffer: obj.body,
      contentType: apkContentType(format),
    };
  }

  const file = tenantApkFilePath(tid, id, format);
  if (!fs.existsSync(file)) return null;
  return {
    filename: tenantApkFilename(code, id, format),
    buffer: fs.readFileSync(file),
    contentType: apkContentType(format),
  };
}

export async function removeApk(id: ApkId) {
  if (useR2ApkStore()) {
    const result = await deleteR2Object(templateApkR2Key(id));
    if ("error" in result) throw new Error(result.error);
  } else {
    assertWritableLocalStore();
    const file = apkFilePath(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  const rows = await listApkStatus();
  return rows.find((a) => a.id === id)!;
}

export async function removeTenantApk(
  tenantId: string,
  code: string,
  name: string,
  id: ApkId,
  format?: ApkFormat,
) {
  const tid = safeTenantId(tenantId);
  const formats: ApkFormat[] = format ? [format] : ["apk", "aab"];

  if (useR2ApkStore()) {
    for (const f of formats) {
      const result = await deleteR2Object(tenantApkR2Key(tid, id, f));
      if ("error" in result) throw new Error(result.error);
    }
  } else {
    assertWritableLocalStore();
    for (const f of formats) {
      const file = tenantApkFilePath(tid, id, f);
      if (fs.existsSync(file)) fs.unlinkSync(file);
      const named = path.join(path.dirname(file), tenantApkFilename(code, id, f));
      if (fs.existsSync(named)) fs.unlinkSync(named);
    }
  }

  const rows = await listTenantApkStatus({ tenantId: tid, code, name });
  return rows.find((a) => a.id === id)!;
}
