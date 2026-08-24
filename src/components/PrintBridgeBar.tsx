"use client";

import { usePrintBridge } from "@/lib/usePrintBridge";
import { isNativeStaffApp } from "@/lib/thermal/nativePosPrint";
import styles from "@/app/staff.module.css";

/**
 * Always-visible website control: Android printer connected vs not.
 * Staff APK shows Printer linked instead. Not “Print to iPhone”.
 */
export function PrintBridgeBar() {
  const { androidConnected, printerLinked, printerName } = usePrintBridge();
  const native = typeof window !== "undefined" && isNativeStaffApp();

  if (native) {
    return (
      <div className={`${styles.card} ${printerLinked ? styles.bridgeBar : `${styles.bridgeBar} ${styles.bridgeBarOff}`}`}>
        <div>
          <strong>
            <span className={`${styles.bridgeDot} ${printerLinked ? "" : styles.bridgeDotOff}`} aria-hidden />
            {printerLinked ? `Printer linked${printerName ? ` · ${printerName}` : ""}` : "No printer selected — Printer → Use this"}
          </strong>
          <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
            This Staff phone prints 58mm jobs from laptop / iPhone, even in a pocket.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="print-bridge-status"
      className={`${styles.card} ${androidConnected ? styles.bridgeBar : `${styles.bridgeBar} ${styles.bridgeBarOff}`}`}
    >
      <div>
        <strong>
          <span className={`${styles.bridgeDot} ${androidConnected ? "" : styles.bridgeDotOff}`} aria-hidden />
          {androidConnected ? "Android printer: connected" : "Android printer not connected — open Staff APK"}
        </strong>
        <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
          Charge or Print → <b>Print to Android</b> (not iPhone). Browser print stays as fallback.
        </p>
      </div>
    </div>
  );
}
