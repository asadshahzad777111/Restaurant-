"use client";

import { useEffect } from "react";
import styles from "./PrintSuccess.module.css";

export function PrintSuccess({
  kind,
  onDone,
}: {
  kind: "bill" | "kitchen" | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!kind) return;
    const t = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(t);
  }, [kind, onDone]);

  if (!kind) return null;

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
