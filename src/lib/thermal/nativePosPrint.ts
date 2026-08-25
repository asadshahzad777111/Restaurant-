/** Capacitor AsfixThermalPrint bridge — Bluetooth SPP ESC/POS from Staff APK. */

import { buildSlipEscPos, bytesToBase64 } from "../escpos-receipt";

export type ThermalPrinterDevice = {
  name: string;
  address: string;
  bonded?: boolean;
};

export type NativePrintResult = {
  ok: boolean;
  reason?: string;
  message?: string;
};

const ADDRESS_KEY = "ordo_pos_bt_printer_address";
const NAME_KEY = "ordo_pos_bt_printer_name";

type ThermalPlugin = {
  listPrinters: () => Promise<{ printers?: ThermalPrinterDevice[] }>;
  connect: (opts: { address: string }) => Promise<{ connected?: boolean; address?: string; name?: string }>;
  disconnect?: () => Promise<void>;
  printText: (opts: { text: string; address?: string }) => Promise<{ ok?: boolean }>;
  printEscPos?: (opts: { dataBase64: string; address?: string }) => Promise<{ ok?: boolean }>;
  getStatus?: () => Promise<{ connected?: boolean; address?: string | null; bluetoothEnabled?: boolean }>;
  requestPermissions?: () => Promise<{ granted?: boolean }>;
};

type CapWindow = {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: Record<string, ThermalPlugin>;
    registerPlugin?: (name: string) => ThermalPlugin;
  };
};

function cap() {
  if (typeof window === "undefined") return null;
  return (window as unknown as CapWindow).Capacitor || null;
}

export function isNativeStaffApp() {
  try {
    const c = cap();
    if (!c) return false;
    // Plugin presence on web is not native — laptop must poll / SSE the Staff APK.
    if (c.isNativePlatform?.() === true) return true;
    const platform = (c as { getPlatform?: () => string }).getPlatform?.();
    return platform === "android" || platform === "ios";
  } catch {
    return false;
  }
}

function getPlugin(): ThermalPlugin | null {
  const c = cap();
  if (!c) return null;
  if (c.Plugins?.AsfixThermalPrint) return c.Plugins.AsfixThermalPrint;
  if (typeof c.registerPlugin === "function") {
    try {
      return c.registerPlugin("AsfixThermalPrint");
    } catch {
      return null;
    }
  }
  return null;
}

function errMsg(err: unknown, fallback: string) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const o = err as { message?: string; errorMessage?: string };
  return o.message || o.errorMessage || String(err) || fallback;
}

export async function getSavedPrinter(): Promise<ThermalPrinterDevice | null> {
  try {
    const address = localStorage.getItem(ADDRESS_KEY);
    if (!address) return null;
    return { address, name: localStorage.getItem(NAME_KEY) || address };
  } catch {
    return null;
  }
}

export async function savePrinter(printer: ThermalPrinterDevice | null) {
  try {
    if (!printer?.address) {
      localStorage.removeItem(ADDRESS_KEY);
      localStorage.removeItem(NAME_KEY);
      return;
    }
    localStorage.setItem(ADDRESS_KEY, printer.address);
    localStorage.setItem(NAME_KEY, printer.name || printer.address);
  } catch {
    /* ignore */
  }
}

export async function clearSavedPrinter() {
  await savePrinter(null);
}

export async function requestThermalPrintPermissions() {
  const plugin = getPlugin();
  if (!isNativeStaffApp() || !plugin) {
    const e = new Error("Not running inside ORDO Staff APK") as Error & { reason?: string };
    e.reason = "not_native";
    throw e;
  }
  if (plugin.requestPermissions) {
    try {
      await plugin.requestPermissions();
    } catch (err) {
      const e = new Error(
        errMsg(err, "Bluetooth permission denied — allow Nearby devices for ORDO Staff"),
      ) as Error & { reason?: string };
      e.reason = "permission_denied";
      throw e;
    }
  }
}

export async function listBondedPrinters(): Promise<ThermalPrinterDevice[]> {
  if (!isNativeStaffApp()) return [];
  const plugin = getPlugin();
  if (!plugin) return [];
  await requestThermalPrintPermissions();
  try {
    const result = await plugin.listPrinters();
    return Array.isArray(result?.printers) ? result.printers : [];
  } catch (err) {
    const e = new Error(errMsg(err, "Could not list Bluetooth printers")) as Error & {
      reason?: string;
    };
    e.reason = "list_failed";
    throw e;
  }
}

export async function connectPrinter(address: string) {
  const plugin = getPlugin();
  if (!plugin) throw new Error("Thermal plugin missing — rebuild Staff APK with AsfixThermalPrint");
  await requestThermalPrintPermissions();
  return plugin.connect({ address });
}

async function logoBytes(opts?: { logoRaster?: ArrayLike<number> | null; logoUrl?: string | null }) {
  if (opts?.logoRaster && opts.logoRaster.length) return Array.from(opts.logoRaster);
  const url = String(opts?.logoUrl || "").trim();
  if (!url) return null;
  try {
    const { rasterizeLogoForEscPos } = await import("../receipt-logo");
    return await rasterizeLogoForEscPos(url);
  } catch {
    return null;
  }
}

export async function nativePrintText(
  text: string,
  opts?: { address?: string; qrUrl?: string | null; logoRaster?: ArrayLike<number> | null; logoUrl?: string | null },
): Promise<NativePrintResult> {
  if (!isNativeStaffApp()) return { ok: false, reason: "not_native" };
  const plugin = getPlugin();
  if (!plugin) return { ok: false, reason: "no_plugin", message: "Rebuild Staff APK with thermal plugin" };
  const saved = await getSavedPrinter();
  const address = opts?.address || saved?.address;
  if (!address) return { ok: false, reason: "no_printer", message: "Tap Printer, then Use this" };
  const qrUrl = opts?.qrUrl?.trim() || "";
  const logoRaster = await logoBytes(opts);
  const padded = `\n\n\n${String(text || "").replace(/^\n+/, "")}`;
  try {
    await requestThermalPrintPermissions();
    await plugin.connect({ address });
    if (plugin.printEscPos) {
      const bytes = buildSlipEscPos(text, qrUrl || null, logoRaster);
      await plugin.printEscPos({ dataBase64: bytesToBase64(bytes), address });
      return { ok: true };
    }
    await plugin.printText({ text: padded, address });
    return { ok: true };
  } catch (err) {
    try {
      if (plugin.printEscPos) {
        const bytes = buildSlipEscPos(text, qrUrl || null, logoRaster);
        await plugin.printEscPos({ dataBase64: bytesToBase64(bytes), address });
        return { ok: true };
      }
    } catch {
      /* fall through */
    }
    try {
      await plugin.printText({ text: padded, address });
      return { ok: true };
    } catch (err2) {
      return { ok: false, reason: "print_failed", message: errMsg(err2 || err, "Bluetooth print failed") };
    }
  }
}

/** Prefer native Bluetooth when in Staff APK + saved printer; else caller falls back to HTML print. */
export async function tryNativeThermalPrint(
  receiptText: string,
  opts?: { qrUrl?: string | null; logoRaster?: ArrayLike<number> | null; logoUrl?: string | null },
): Promise<NativePrintResult> {
  if (!isNativeStaffApp()) return { ok: false, reason: "not_native" };
  const saved = await getSavedPrinter();
  if (!saved?.address) return { ok: false, reason: "no_printer" };
  return nativePrintText(receiptText, {
    address: saved.address,
    qrUrl: opts?.qrUrl,
    logoRaster: opts?.logoRaster,
    logoUrl: opts?.logoUrl,
  });
}
