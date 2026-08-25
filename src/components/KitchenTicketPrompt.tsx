"use client";

import styles from "@/app/staff.module.css";
import type { Order } from "@/lib/tenant-types";

/** After the customer bill prints: ask whether to also print the kitchen chit. No = KDS only. */
export function KitchenTicketPrompt({
  order,
  onYes,
  onNo,
}: {
  order: Order;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="kot-ask-title">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 id="kot-ask-title" className={styles.bridgeModalTitle}>
          Print kitchen ticket?
        </h3>
        <p className={styles.muted} style={{ margin: 0 }}>
          Bill #{order.number} is printed. OK sends the kitchen chit to the printer. No keeps the order on Kitchen
          without extra paper.
        </p>
        <button type="button" className={styles.btn} onClick={onYes}>
          OK
        </button>
        <button type="button" className={styles.btnGhost} onClick={onNo}>
          No
        </button>
      </div>
    </div>
  );
}
