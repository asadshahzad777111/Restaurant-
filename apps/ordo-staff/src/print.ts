import { buildReceiptEscPos, receiptRows } from "./escpos";
import { getPrinter } from "./printerStorage";
import type { Order } from "./types";

/**
 * Native 58mm print transport. In Expo Go / web there is no BLE printer, so
 * this resolves false and the UI falls back gracefully. In a development build
 * wire the bottom of sendBytes() to your ESC/POS Bluetooth plugin (e.g.
 * react-native-thermal-printer, or the AsFix Capacitor bridge in the Staff APK).
 */
async function sendBytes(bytes: Uint8Array, printer?: { name: string; mac: string }): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RN = (globalThis as any);
  /* React Native BLE thermal printer — use printer?.mac to connect */
  // if (RN?.ThermalPrinter?.printRaw) { await RN.ThermalPrinter.printRaw(bytes, printer?.mac); return true; }
  /* Capacitor AsFix bridge (Staff APK) */
  // if (window?.Capacitor?.Plugins?.AsfixThermalPrint?.printEscPos) {
  //   const { printEscPos } = window.Capacitor.Plugins.AsfixThermalPrint;
  //   const r = await printEscPos({ dataBase64: btoa(String.fromCharCode(...bytes)) });
  //   if (r?.ok) return true;
  // }
  // eslint-disable-next-line no-console
  console.log("ESC/POS bytes built (", bytes.length, ") — no native printer transport in this run", printer?.name || "");
  return false;
}

export async function printOrder(order: Order, currency: string): Promise<boolean> {
  const printer = await getPrinter();
  const shop = order.serviceType.toUpperCase();
  const date = new Date(order.createdAt).toLocaleString();
  const lines = order.lines.flatMap((l) => {
    const base = { name: l.name, qty: l.qty, amount: `${currency} ${l.unitPrice * l.qty}` };
    const mods = (l.modifiers || []).map((m) => ({
      name: `  + ${m.optionName}`,
      qty: 1,
      amount: m.priceDelta ? `+${currency} ${m.priceDelta}` : "",
    }));
    return [base, ...mods];
  });
  const feeLines = [
    order.fees?.serviceCharge ? `Service: ${currency} ${order.fees.serviceCharge}` : "",
    order.fees?.tax ? `Tax: ${currency} ${order.fees.tax}` : "",
    order.discount ? `Discount: -${currency} ${order.discount}` : "",
  ].filter(Boolean);
  const rows = receiptRows({
    shop,
    billNo: `#${order.number}`,
    date,
    lines,
    total: `${currency} ${order.total}`,
    footer: [...feeLines, printer ? `Printer: ${printer.name}` : "Thank you"].join(" | "),
  });
  const bytes = buildReceiptEscPos(rows, { cut: true });
  return sendBytes(bytes, printer ?? undefined);
}
