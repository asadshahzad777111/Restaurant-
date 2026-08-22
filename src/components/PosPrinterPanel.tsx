"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { printCustomerReceipt, printTestSlip } from "@/lib/print";
import {
  clearSavedPrinter,
  getSavedPrinter,
  isNativeStaffApp,
  listBondedPrinters,
  savePrinter,
  type ThermalPrinterDevice,
} from "@/lib/thermal/nativePosPrint";
import styles from "@/app/staff.module.css";

/**
 * AsFix POS-style printer task: tap Printer → list → Use this → Print.
 */
export function PosPrinterPanel({ compact = false }: { compact?: boolean }) {
  const { tenant } = useStore();
  const [native, setNative] = useState(false);
  const [saved, setSaved] = useState<ThermalPrinterDevice | null>(null);
  const [list, setList] = useState<ThermalPrinterDevice[]>([]);
  const [open, setOpen] = useState(!compact);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    setNative(isNativeStaffApp());
    setSaved(await getSavedPrinter());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function scan() {
    setBusy("scan");
    setMsg("");
    setOpen(true);
    try {
      if (!isNativeStaffApp()) {
        setMsg("Open the Staff APK on the phone — Bluetooth printer list does not work in Chrome.");
        return;
      }
      const printers = await listBondedPrinters();
      setList(printers);
      setMsg(
        printers.length
          ? "Tap Use this, then Print."
          : "No paired printer. Phone Settings → Bluetooth → pair, then tap Printer again.",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not open printers");
    } finally {
      setBusy("");
    }
  }

  async function pick(p: ThermalPrinterDevice) {
    setBusy(p.address);
    try {
      await savePrinter(p);
      setSaved(p);
      setMsg(`Printer ready: ${p.name || p.address}`);
    } finally {
      setBusy("");
    }
  }

  async function testPrint() {
    if (!tenant) return;
    setBusy("print");
    setMsg("");
    try {
      const ok = await printTestSlip(tenant);
      setMsg(ok ? "Test print sent." : "Print did not go out — pair a printer, then Printer → Use this.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Print failed");
    } finally {
      setBusy("");
    }
  }

  async function printLastBill() {
    if (!tenant) return;
    setBusy("last");
    setMsg("");
    try {
      const id = sessionStorage.getItem("ordo_last_bill_order_id");
      const order = tenant.orders.find((o) => o.id === id) || tenant.orders[0];
      if (!order) {
        setMsg("No bill yet. Charge an order on POS, then Print.");
        return;
      }
      const ok = await printCustomerReceipt(tenant, order);
      setMsg(ok ? `Printed bill #${order.number}` : "Print failed");
    } finally {
      setBusy("");
    }
  }

  async function clear() {
    await clearSavedPrinter();
    setSaved(null);
    setMsg("Printer cleared");
  }

  if (!tenant) return null;

  return (
    <div className={styles.card} id="thermal">
      <h3 style={{ marginTop: 0 }}>Printer</h3>
      <p className={styles.muted} style={{ marginTop: 0 }}>
        Same flow as AsFix POS: <strong>Printer</strong> → pick device → <strong>Print</strong>.
        {native ? " Staff APK · Bluetooth thermal." : " Browser will show a print dialog until you use Staff APK."}
      </p>
      <p>
        {saved ? (
          <>
            Ready: <strong>{saved.name || saved.address}</strong>
          </>
        ) : (
          <span className={styles.muted}>No printer selected</span>
        )}
      </p>
      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={busy === "scan"} onClick={() => void scan()}>
          {busy === "scan" ? "Opening…" : "Printer"}
        </button>
        <button type="button" className={styles.btn} disabled={busy === "print" || !saved} onClick={() => void testPrint()}>
          {busy === "print" ? "Printing…" : "Print"}
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={busy === "last"}
          onClick={() => void printLastBill()}
        >
          {busy === "last" ? "Printing…" : "Print last bill"}
        </button>
        {saved ? (
          <button type="button" className={styles.btnGhost} onClick={() => void clear()}>
            Clear
          </button>
        ) : null}
      </div>
      {open && list.length > 0 ? (
        <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
          {list.map((p) => (
            <li key={p.address} style={{ marginBottom: "0.45rem" }}>
              {p.name || "Printer"}{" "}
              <button
                type="button"
                className={styles.btnGhost}
                disabled={busy === p.address}
                onClick={() => void pick(p)}
              >
                Use this
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {msg ? <p className={styles.muted}>{msg}</p> : null}
    </div>
  );
}
