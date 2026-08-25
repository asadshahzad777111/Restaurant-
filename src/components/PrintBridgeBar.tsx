"use client";

import { usePrintBridge } from "@/lib/usePrintBridge";
import { isNativeStaffApp } from "@/lib/thermal/nativePosPrint";
import { PrintBridgeLamp } from "@/components/PrintTargetChooser";
import styles from "@/app/staff.module.css";

/**
 * Always-visible website control: live lamp from Staff APK heartbeat.
 * Staff APK shows Printer linked instead.
 */
export function PrintBridgeBar() {
  const { androidConnected, printerLinked, printerName, queued } = usePrintBridge();
  const native = typeof window !== "undefined" && isNativeStaffApp();

  if (native) {
    return (
      <div className={`${styles.card} ${printerLinked ? styles.bridgeBar : `${styles.bridgeBar} ${styles.bridgeBarOff}`}`}>
        <div>
          <strong>
            <PrintBridgeLamp />
            {printerLinked ? `Printer linked${printerName ? ` · ${printerName}` : ""}` : "No printer selected — Printer → Use this"}
          </strong>
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
          <PrintBridgeLamp />
          {androidConnected ? "Connected" : "Offline"}
          {printerName && androidConnected ? ` · ${printerName}` : ""}
          {!androidConnected && queued > 0 ? ` · ${queued} waiting` : ""}
        </strong>
      </div>
    </div>
  );
}
