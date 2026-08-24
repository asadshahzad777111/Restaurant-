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

/** Scan for nearby BLE printers (react-native-ble-plx). */
export async function getBondedDevices(): Promise<BtDevice[]> {
  if (Platform.OS !== "android") return [];
  try {
    const { BleManager } = require("react-native-ble-plx") as any;
    if (!BleManager) return [];
    const manager = new BleManager();
    const found: BtDevice[] = [];
    await new Promise<void>((resolve) => {
      manager.startDeviceScan(null, null, (_err: any, device: any) => {
        if (device && !found.some((d) => d.address === device.id)) {
          found.push({ address: device.id, name: device.name || null });
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
    return found;
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

/** One-tap "Connect printer": scan BLE, pick the thermal printer. */
export async function connectPrinter(): Promise<BtDevice | null> {
  const found = await getBondedDevices();
  return pickPrinter(found);
}
