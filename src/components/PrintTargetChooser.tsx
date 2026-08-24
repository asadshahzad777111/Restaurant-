"use client";

import styles from "@/app/staff.module.css";
import type { Order } from "@/lib/tenant-types";

export function PrintTargetChooser({
  order,
  kind,
  androidOnline,
  note,
  onAndroid,
  onBrowser,
  onClose,
}: {
  order: Order;
  kind: "bill" | "kitchen";
  androidOnline: boolean;
  note?: string;
  onAndroid: () => void;
  onBrowser: () => void;
  onClose: () => void;
}) {
  const label = kind === "kitchen" ? "kitchen ticket" : "receipt";
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 0.25rem" }}>
          Print {label} #{order.number}
        </h3>
        <p className={styles.muted}>
          {androidOnline
            ? "Staff Android is linked to the 58mm printer — send it there, or print in this browser."
            : "No Android printer linked. Pair Staff APK + printer, or print here."}
        </p>
        {androidOnline ? (
          <button type="button" className={styles.btn} onClick={onAndroid}>
            Send to Android
          </button>
        ) : null}
        <button type="button" className={styles.btnGhost} onClick={onBrowser}>
          Print here (browser)
        </button>
        <button type="button" className={styles.btnGhost} onClick={onClose}>
          Close
        </button>
        {note ? <p className={styles.muted}>{note}</p> : null}
      </div>
    </div>
  );
}
