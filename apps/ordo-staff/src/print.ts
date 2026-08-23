import { buildReceiptEscPos, receiptRows } from "./escpos";
import { getPrinter, type PrinterConfig } from "./printerStorage";
import type { Order } from "./types";

/** Send ESC/POS bytes to a network (IP) printer over raw TCP (port 9100). */
async function sendNetwork(bytes: Uint8Array, ip: string, port: number): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TcpSocket = require("react-native-tcp-socket") as any;
  if (!TcpSocket?.createConnection) return false;
  return new Promise<boolean>((resolve) => {
    const sock = TcpSocket.createConnection({ host: ip, port }, () => {
      sock.write(bytes as any);
      setTimeout(() => resolve(true), 150);
      sock.end();
    });
    sock.on("error", () => {
      resolve(false);
    });
    setTimeout(() => resolve(false), 8000);
  });
}

async function sendBytes(bytes: Uint8Array, printer?: PrinterConfig): Promise<boolean> {
  // Network IP print (no Bluetooth) — set once, auto-prints every order.
  if (printer?.ip) {
    return sendNetwork(bytes, printer.ip, printer.port || 9100);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RN = (globalThis as any);
  /* React Native BLE thermal printer — use printer?.mac to connect */
  // if (RN?.ThermalPrinter?.printRaw) { await RN.ThermalPrinter.printRaw(bytes, printer?.mac); return true; }
  // eslint-disable-next-line no-console
  console.log("ESC/POS bytes built (", bytes.length, ") — set a printer IP/MAC in Settings to print", printer?.name || "");
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
