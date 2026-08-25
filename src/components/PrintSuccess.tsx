"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Order, TenantState } from "@/lib/tenant-types";
import { customerReceiptHtml } from "@/lib/print";
import styles from "./PrintSuccess.module.css";

export function PrintSuccess({
  kind,
  tenant,
  order,
  onDone,
  onPrintAgain,
}: {
  kind: "bill" | "kitchen" | null;
  /** Bill preview — pass the order to show the actual receipt on screen. */
  tenant?: TenantState | null;
  order?: Order | null;
  onDone: () => void;
  /** Re-print the bill from the on-screen receipt preview. */
  onPrintAgain?: (order: Order) => void | Promise<void>;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const showBill = kind === "bill" && Boolean(tenant && order);

  // Move focus into the dialog and close on Escape.
  useEffect(() => {
    if (!showBill) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showBill, onDone]);

  // Auto-show the on-screen receipt once the bill is done.
  useEffect(() => {
    if (kind === "bill" && tenant && order) setShowPreview(true);
    else setShowPreview(false);
  }, [kind, tenant, order]);

  // Auto-dismiss the checkmark, but keep the receipt preview until closed.
  useEffect(() => {
    if (kind && !showBill) {
      const t = window.setTimeout(onDone, 2400);
      return () => window.clearTimeout(t);
    }
  }, [kind, showBill, onDone]);

  const receiptSrc = useMemo(() => {
    if (!showBill || !tenant || !order) return "";
    try {
      return `data:text/html;charset=utf-8,${encodeURIComponent(customerReceiptHtml(tenant, order))}`;
    } catch {
      return "";
    }
  }, [showBill, tenant, order]);

  if (!kind) return null;

  // Bill printed → show the real receipt on screen (58mm preview).
  if (showBill && receiptSrc) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Bill receipt">
        <motion.div
          className={styles.billSheet}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
        >
          <div className={styles.billHead}>
            <div>
              <p className={styles.kicker}>Bill printed</p>
              <h2>Order #{order!.number}</h2>
            </div>
            <button ref={closeRef} type="button" className={styles.closeBtn} onClick={onDone} aria-label="Close receipt">
              ✕
            </button>
          </div>

          <div className={styles.billPaper} aria-label="Receipt preview">
            <iframe
              title={`Bill #${order!.number}`}
              src={receiptSrc}
              className={styles.billFrame}
              sandbox=""
            />
          </div>

          <div className={styles.billActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void onPrintAgain?.(order!)}
            >
              🖨️ Print again
            </button>
            <button type="button" className={styles.ghost} onClick={onDone}>
              Done
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Kitchen ticket or non-preview bill → simple animated checkmark.
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <svg className={styles.mark} viewBox="0 0 52 52" aria-hidden="true">
          <circle className={styles.ring} cx="26" cy="26" r="22" />
          <path className={styles.tick} d="M15 27.2 22.4 34.4 37 18.8" />
        </svg>
        <p className={styles.title}>
          {kind === "bill" ? "Bill printed — thank you" : "Kitchen ticket printed"}
        </p>
        <p className={styles.sub}>
          {kind === "bill"
            ? "Sent to the thermal printer (or the phone print dialog if no printer is saved)."
            : "Kitchen ticket sent to the printer."}
        </p>
      </div>
    </div>
  );
}
