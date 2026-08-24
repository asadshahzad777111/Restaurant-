import { buildReceiptEscPos, receiptRows } from "./escpos";
import { getPrinter, type PrinterConfig } from "./printerStorage";
import type { Order } from "./types";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Send ESC/POS bytes to a Bluetooth Low-Energy thermal printer (write char). */
async function sendBle(bytes: Uint8Array, mac: string): Promise<boolean> {
  try {
    const { BleManager } = require("react-native-ble-plx") as any;
    if (!BleManager) return false;
    const manager = new BleManager();
    try {
      const device = await manager.connectToDevice(mac, { timeout: 15000 });
      await device.stopBondTransaction?.().catch?.(() => {});
      await device.discoverAllServicesAndCharacteristics();
      const services = await device.services();
      let wrote = false;
      for (const service of services) {
        const chars = await service.characteristics();
        for (const c of chars) {
          if (c.isWritableWithoutResponse) {
            await c.writeWithoutResponse(toBase64(bytes));
            wrote = true;
            break;
          }
          if (c.isWritableWithResponse) {
            await c.writeWithResponse(toBase64(bytes));
            wrote = true;
            break;
          }
        }
        if (wrote) break;
      }
      try {
        await device.cancelConnection();
      } catch {
        /* ignore */
      }
      return wrote;
    } catch (err) {
      try {
        await manager.cancelDeviceConnection(mac);
      } catch {
        /* ignore */
      }
      return false;
    }
  } catch {
    return false;
  }
}

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

/** Send ESC/POS bytes to a paired Classic (SPP) Bluetooth printer. */
async function sendClassic(bytes: Uint8Array, mac: string): Promise<boolean> {
  try {
    const BluetoothClassic = require("react-native-bluetooth-classic") as any;
    if (!BluetoothClassic?.connect) return false;
    const conn = await BluetoothClassic.connect(mac, { Channel: 1 });
    if (!conn) return false;
    // Write the raw bytes (ArrayBuffer), then close the SPP output stream.
    await conn.write(new Uint8Array(bytes).buffer as any);
    await conn.write(new Uint8Array([0x0a]).buffer as any); // trailing LF
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await conn.disconnect();
    } catch {
      /* ignore */
    }
    return true;
  } catch {
    return false;
  }
}

async function sendBytes(bytes: Uint8Array, printer?: PrinterConfig): Promise<boolean> {
  const mac = printer?.mac;
  // BLE first (this printer is a BLE 58mm — service 000018f0), then Classic, then IP.
  if (mac) {
    const ble = await sendBle(bytes, mac);
    if (ble) return true;
    const classic = await sendClassic(bytes, mac);
    if (classic) return true;
  }
  if (printer?.ip) {
    return sendNetwork(bytes, printer.ip, printer.port || 9100);
  }
  // eslint-disable-next-line no-console
  console.log("ESC/POS bytes built (", bytes.length, ") — set a printer MAC/IP in Settings to print", printer?.name || "");
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

/** Test print — a quick slip to verify the Bluetooth/IP printer works. */
export async function printTestSlip(): Promise<boolean> {
  const printer = await getPrinter();
  const rows = receiptRows({
    shop: "ORDO PRINT TEST",
    billNo: "#TEST",
    date: new Date().toLocaleString(),
    lines: [{ name: "Test slip", qty: 1, amount: "OK" }],
    total: "0",
    footer: printer ? `Printer: ${printer.name} ${printer.mac ? printer.mac : printer.ip || ""}` : "Ready",
  });
  const bytes = buildReceiptEscPos(rows, { cut: true });
  return sendBytes(bytes, printer ?? undefined);
}
