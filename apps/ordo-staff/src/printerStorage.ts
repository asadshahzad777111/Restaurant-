import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ordo_printer_v1";
export interface PrinterConfig { name: string; mac: string }

export async function getPrinter(): Promise<PrinterConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PrinterConfig) : null;
  } catch {
    return null;
  }
}

export async function savePrinter(p: PrinterConfig) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export async function clearPrinter() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
