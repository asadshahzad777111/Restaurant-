"use client";

import { AppShell } from "@/components/AppShell";
import { PosPrinterPanel } from "@/components/PosPrinterPanel";
import styles from "../staff.module.css";

export default function PrinterPage() {
  return (
    <AppShell title="Printer">
      <div className={styles.page}>
        <PosPrinterPanel />
        <div className={styles.card} style={{ marginTop: "1rem" }}>
          <strong>How to print (AsFix POS style)</strong>
          <ol className={styles.muted} style={{ marginBottom: 0, paddingLeft: "1.2rem" }}>
            <li>Install this kitchen’s <strong>Staff APK</strong> (not Customer). Super HQ never opens in this app.</li>
            <li>Phone Bluetooth → pair the 58mm thermal printer.</li>
            <li>Sign in with the restaurant code → tap <strong>Printer</strong> → <strong>Use this</strong>.</li>
            <li>Header shows <strong>Printer linked</strong>. Phone can stay in the pocket.</li>
            <li>Laptop or iPhone Safari: Charge / Print → <strong>Send to Android</strong> when the Staff phone is linked.</li>
            <li>Guest takeaway / delivery orders print automatically on that printer.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
