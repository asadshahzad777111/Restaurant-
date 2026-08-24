import { Platform } from "react-native";

export interface BtDevice {
  address: string;
  name: string | null;
}

/** Check the runtime Bluetooth permission (Android 12+). */
export async function hasBlePermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const { PermissionsAndroid } = require("react-native") as any;
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    );
    return status === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/** Read paired Classic (SPP) devices, then fall back to a BLE scan. */
export async function getBondedDevices(): Promise<BtDevice[]> {
  if (Platform.OS !== "android") return [];
  const out: BtDevice[] = [];
  // Classic paired devices first (most 58mm printers).
  try {
    const BluetoothClassic = require("react-native-bluetooth-classic") as any;
    if (BluetoothClassic?.getBondedDevices) {
      const list = await BluetoothClassic.getBondedDevices();
      for (const d of list || []) out.push({ address: d.address, name: d.name || null });
    }
  } catch {
    /* ignore */
  }
  if (out.length) return out;
  // BLE scan fallback.
  try {
    const { BleManager } = require("react-native-ble-plx") as any;
    if (!BleManager) return out;
    const manager = new BleManager();
    await new Promise<void>((resolve) => {
      manager.startDeviceScan(null, null, (_e: any, device: any) => {
        if (device && !out.some((d) => d.address === device.id)) {
          out.push({ address: device.id, name: device.name || null });
        }
      });
      setTimeout(() => {
        try {
          manager.stopDeviceScan();
        } catch {
          /* ignore */
        }
        resolve();
      }, 6000);
    });
  } catch {
    /* ignore */
  }
  return out;
}

/** Prefer devices that look like a printer. */
export function pickPrinter(devices: BtDevice[]): BtDevice | null {
  if (!devices.length) return null;
  const isPrinter = (d: BtDevice) => /print|58mm|thermal|printer/i.test((d.name || "") + d.address);
  return devices.find(isPrinter) || devices[0];
}

/** One-tap "Connect printer": scan BLE, pick the thermal printer. */
export async function connectPrinter(): Promise<BtDevice | null> {
  const found = await getBondedDevices();
  return pickPrinter(found);
}
