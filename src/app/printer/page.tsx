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
            <li>Phone Bluetooth → pair the thermal printer.</li>
            <li>Tap <strong>Printer</strong> — the list opens.</li>
            <li>Tap <strong>Use this</strong>.</li>
            <li>Tap <strong>Print</strong> (test) or go POS → Charge (bill) / Orders → Print.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
