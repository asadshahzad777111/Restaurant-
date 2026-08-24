"use client";

import styles from "@/app/staff.module.css";
import type { Order } from "@/lib/tenant-types";

/** Website print picker — always shows Print to Android + browser fallback. */
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
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-labelledby="print-bridge-title">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 id="print-bridge-title" style={{ margin: "0 0 0.25rem" }}>
          Print {label} #{order.number}
        </h3>
        <p className={styles.muted} style={{ margin: 0 }}>
          {androidOnline ? (
            <>
              <span className={styles.bridgeDot} aria-hidden /> Android printer: <strong style={{ fontSize: "inherit" }}>connected</strong>
            </>
          ) : (
            <>
              <span className={`${styles.bridgeDot} ${styles.bridgeDotOff}`} aria-hidden /> Android printer not connected — open Staff APK
            </>
          )}
        </p>
        <button
          type="button"
          className={`${styles.btn} ${styles.bridgeAndroidBtn}`}
          onClick={onAndroid}
          aria-label="Print to Android"
        >
          <span aria-hidden>📱</span> Print to Android
        </button>
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
