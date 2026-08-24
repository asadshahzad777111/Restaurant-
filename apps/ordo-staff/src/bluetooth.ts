import { Platform } from "react-native";

export interface BtDevice {
  address: string;
  name: string | null;
}

/**
 * Read the phone's paired Bluetooth devices (thermal printer MAC).
 * Uses react-native-bluetooth-classic when available and falls back to
 * gracefully returning [] so the app never crashes without it.
 */
export async function getBondedDevices(): Promise<BtDevice[]> {
  if (Platform.OS !== "android") return [];
  try {
    const BluetoothClassic = require("react-native-bluetooth-classic") as any;
    if (!BluetoothClassic?.getBondedDevices) return [];
    const list = await BluetoothClassic.getBondedDevices();
    return (list || []).map((d: any) => ({ address: d.address, name: d.name || null }));
  } catch {
    return [];
  }
}

/** Prefer devices that look like a printer. */
export function pickPrinter(devices: BtDevice[]): BtDevice | null {
  if (!devices.length) return null;
  const isPrinter = (d: BtDevice) => /print|58mm|thermal|printer/i.test((d.name || "") + d.address);
  return devices.find(isPrinter) || devices[0];
}

/**
 * One-tap "Connect printer": read the phone's paired Bluetooth devices, pick the
 * thermal printer (name or first device), and return it. The caller saves the
 * MAC so the app auto-prints thereafter — no MAC to type.
 */
export async function connectPrinter(): Promise<BtDevice | null> {
  const bonded = await getBondedDevices();
  return pickPrinter(bonded);
}
