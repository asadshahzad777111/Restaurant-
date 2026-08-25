"use client";

import styles from "@/app/staff.module.css";
import { usePrintBridge } from "@/lib/usePrintBridge";
import { isNativeStaffApp } from "@/lib/thermal/nativePosPrint";
import type { Order } from "@/lib/tenant-types";

/** Live red/green lamp from Staff APK heartbeat (SSE). No warning copy. */
export function PrintBridgeLamp({ className }: { className?: string }) {
  const { androidConnected, printerLinked } = usePrintBridge();
  const native = typeof window !== "undefined" && isNativeStaffApp();
  const on = native ? printerLinked : androidConnected;
  return (
    <span
      className={`${styles.bridgeDot} ${on ? styles.bridgeDotOn : styles.bridgeDotOff}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
      aria-label={on ? "Android connected" : "Android offline"}
      title={on ? "Android connected" : "Android offline"}
    />
  );
}

/** Website print picker — live lamp only. Print to Android always queues. */
export function PrintTargetChooser({
  order,
  kind,
  note,
  onAndroid,
  onBrowser,
  onClose,
}: {
  order: Order;
  kind: "bill" | "kitchen";
  note?: string;
  onAndroid: () => void;
  onBrowser: () => void;
  onClose: () => void;
}) {
  const label = kind === "kitchen" ? "kitchen ticket" : "receipt";
  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-labelledby="print-bridge-title">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 id="print-bridge-title" className={styles.bridgeModalTitle}>
          Print {label} #{order.number}
          <PrintBridgeLamp />
        </h3>
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
