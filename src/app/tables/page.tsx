"use client";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import styles from "../staff.module.css";

export default function TablesPage() {
  const { tenant, refresh } = useStore();
  const tables = tenant?.tables ?? [];

  const color = (s: string) =>
    s === "empty" ? "#e8f5e9" : s === "occupied" ? "#fff3e0" : "#e3f2fd";

  return (
    <AppShell title="Tables">
      <div className={styles.page}>
        <p className={styles.muted}>
          Empty / Occupied / Bill. Table orders update this automatically; complete or cancel frees
          the table.
        </p>
        <div className={styles.kitchen}>
          {tables.map((tb) => (
            <article
              key={tb.id}
              className={styles.ticket}
              style={{ background: color(tb.status) }}
            >
              <h3>Table {tb.label}</h3>
              <p className={styles.muted}>{tb.seats} seats</p>
              <strong style={{ textTransform: "uppercase" }}>{tb.status}</strong>
              {tb.currentOrderId && (
                <p className={styles.muted}>Order linked</p>
              )}
            </article>
          ))}
        </div>
        {!tables.length && (
          <p className={styles.muted}>No tables configured — re-seed demo or add in future settings.</p>
        )}
        <button type="button" className={styles.btnGhost} onClick={() => void refresh({ force: true })}>
          Refresh
        </button>
      </div>
    </AppShell>
  );
}
