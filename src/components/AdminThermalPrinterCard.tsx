"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
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
 * Staff Settings: pick bonded Bluetooth thermal printer for APK ESC/POS print.
 * Browser-only sessions see setup notes (HTML print dialog still works).
 */
export function AdminThermalPrinterCard() {
  const { tenant } = useStore();
  const [native, setNative] = useState(false);
  const [saved, setSaved] = useState<ThermalPrinterDevice | null>(null);
  const [list, setList] = useState<ThermalPrinterDevice[]>([]);
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
    try {
      if (!isNativeStaffApp()) {
        setMsg("Bluetooth list only works inside ORDO Staff APK (not desktop Chrome).");
        return;
      }
      const printers = await listBondedPrinters();
      setList(printers);
      setMsg(printers.length ? `${printers.length} paired printer(s)` : "No bonded printers — pair in Android Bluetooth settings first");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy("");
    }
  }

  async function pick(p: ThermalPrinterDevice) {
    setBusy(p.address);
    try {
      await savePrinter(p);
      setSaved(p);
      setMsg(`Saved: ${p.name || p.address}`);
    } finally {
      setBusy("");
    }
  }

  async function clear() {
    await clearSavedPrinter();
    setSaved(null);
    setMsg("Cleared — next print uses Android print dialog / HTML");
  }

  if (!tenant) return null;

  return (
    <div className={styles.card} id="thermal">
      <h3 style={{ marginTop: 0 }}>Bluetooth thermal printer (Staff APK)</h3>
      <p className={styles.muted}>
        AsFix kit: classic Bluetooth SPP ESC/POS. Phone Settings → Bluetooth → pair printer, then Scan
        here and Save. POS / Orders Print pehle native Bluetooth try karega; fail ho to pehle wala
        58mm dialog.
      </p>
      <p className={styles.muted}>
        Mode:{" "}
        {native ? (
          <strong>Staff APK (native)</strong>
        ) : (
          <strong>Browser</strong>
        )}
        {" — rebuild APK with thermal plugin for direct BT"}
      </p>
      {saved ? (
        <p>
          Saved printer: <strong>{saved.name}</strong>{" "}
          <code style={{ fontSize: "0.8rem" }}>{saved.address}</code>
        </p>
      ) : (
        <p className={styles.muted}>No saved printer yet.</p>
      )}
      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={busy === "scan"} onClick={() => void scan()}>
          {busy === "scan" ? "Scanning…" : "Scan paired printers"}
        </button>
        {saved ? (
          <button type="button" className={styles.btnGhost} onClick={() => void clear()}>
            Clear saved
          </button>
        ) : null}
      </div>
      {list.length > 0 ? (
        <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
          {list.map((p) => (
            <li key={p.address} style={{ marginBottom: "0.35rem" }}>
              {p.name || "Printer"} · <code style={{ fontSize: "0.75rem" }}>{p.address}</code>{" "}
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
      <p className={styles.muted} style={{ marginBottom: 0 }}>
        Rebuild: <code>mobile/ordo-pos</code> + plugin <code>asfix-thermal-print</code> — see
        docs/THERMAL-BLUETOOTH-ORDO.md
      </p>
    </div>
  );
}
