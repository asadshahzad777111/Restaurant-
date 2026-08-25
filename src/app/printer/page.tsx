"use client";

import { AppShell } from "@/components/AppShell";
import { PosPrinterPanel } from "@/components/PosPrinterPanel";
import { PrintBridgeBar } from "@/components/PrintBridgeBar";
import styles from "../staff.module.css";

export default function PrinterPage() {
  return (
    <AppShell title="Printer">
      <div className={styles.page}>
        <PrintBridgeBar />
        <PosPrinterPanel />
        <div className={styles.card} style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>How to print (AsFix POS style)</h3>
          <ol className={styles.muted} style={{ marginBottom: 0, paddingLeft: "1.2rem" }}>
            <li>Install this kitchen’s <strong>Staff APK</strong> (not Customer). Super HQ never opens in this app.</li>
            <li>Phone Bluetooth → pair the 58mm thermal printer.</li>
            <li>Sign in with the restaurant code → tap <strong>Printer</strong> → <strong>Use this</strong>.</li>
            <li>Staff phone shows <strong>Printer linked</strong>. Laptop / iPhone show <strong>Android printer: connected</strong>.</li>
            <li>Laptop or iPhone: Charge / Print → <strong>Print to Android</strong> (green when Staff APK is on). If the phone is off, the job is queued and prints when the app comes back. Browser print is the fallback.</li>
            <li>Guest takeaway / delivery orders print automatically on that printer.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
