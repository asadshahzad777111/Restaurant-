import { apkAppHost, tenantApkLoadsPath, type ApkId } from "./apk-urls";

/** Absolute install / Add-to-Home-Screen URLs for one kitchen (Android webview + iOS Safari). */
export function tenantInstallUrl(code: string, id: ApkId) {
  const host = apkAppHost();
  const path = tenantApkLoadsPath(code, id);
  const join = path.includes("?") ? "&" : "?";
  // guide=1 → first open on iPhone shows Add to Home Screen picture steps
  return `${host}${path}${join}guide=1`;
}

export function tenantManifestPath(code: string, id: ApkId) {
  const c = encodeURIComponent(code.trim().toUpperCase());
  return `/api/manifest?tenant=${c}&app=${id}`;
}

export function tenantManifestUrl(code: string, id: ApkId) {
  return `${apkAppHost()}${tenantManifestPath(code, id)}`;
}
