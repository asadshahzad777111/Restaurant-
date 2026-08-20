import { apkAppHost, tenantApkLoadsPath, type ApkId } from "./apk-urls";

/** Absolute install / Add-to-Home-Screen URLs for one kitchen (Android webview + iOS Safari). */
export function tenantInstallUrl(code: string, id: ApkId) {
  const host = apkAppHost();
  return `${host}${tenantApkLoadsPath(code, id)}`;
}

export function tenantManifestPath(code: string, id: ApkId) {
  const c = encodeURIComponent(code.trim().toUpperCase());
  return `/api/manifest?tenant=${c}&app=${id}`;
}

export function tenantManifestUrl(code: string, id: ApkId) {
  return `${apkAppHost()}${tenantManifestPath(code, id)}`;
}
