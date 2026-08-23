import { buildReceiptEscPos, receiptRows } from "./escpos";
import type { Order } from "./types";

/**
 * Native 58mm print transport. In Expo Go / web there is no BLE printer, so
 * this resolves false and the UI falls back gracefully. In a development build
 * wire the bottom of sendBytes() to your ESC/POS Bluetooth plugin (e.g.
 * react-native-thermal-printer, or the AsFix Capacitor bridge in the Staff APK).
 */
async function sendBytes(bytes: Uint8Array): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RN = (globalThis as any);
  /* React Native BLE thermal printer */
  // if (RN?.ThermalPrinter?.printRaw) { await RN.ThermalPrinter.printRaw(bytes); return true; }
  /* Capacitor AsFix bridge (Staff APK) */
  // if (window?.Capacitor?.Plugins?.AsfixThermalPrint?.printEscPos) {
  //   const { printEscPos } = window.Capacitor.Plugins.AsfixThermalPrint;
  //   const r = await printEscPos({ dataBase64: btoa(String.fromCharCode(...bytes)) });
  //   if (r?.ok) return true;
  // }
  // eslint-disable-next-line no-console
  console.log("ESC/POS bytes built (", bytes.length, ") — no native printer transport in this run");
  return false;
}

export async function printOrder(order: Order, currency: string): Promise<boolean> {
  const shop = order.serviceType.toUpperCase();
  const date = new Date(order.createdAt).toLocaleString();
  const lines = order.lines.map((l) => ({
    name: l.name,
    qty: l.qty,
    amount: `${currency} ${l.unitPrice * l.qty}`,
  }));
  const rows = receiptRows({
    shop,
    billNo: `#${order.number}`,
    date,
    lines,
    total: `${currency} ${order.total}`,
    footer: "Thank you",
  });
  const bytes = buildReceiptEscPos(rows, { cut: true });
  return sendBytes(bytes);
}
