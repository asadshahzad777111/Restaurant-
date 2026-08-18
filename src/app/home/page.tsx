"use client";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import styles from "../staff.module.css";

export default function HomePage() {
  const { tenant } = useStore();
  const orders = tenant?.orders ?? [];
  const today = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  });
  const revenue = today
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const completed = today.filter((o) => o.status === "completed").length;
  const open = today.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);

  return (
    <AppShell title="Home">
      <div className={styles.page}>
        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={styles.muted}>Today revenue</span>
            <strong>
              {tenant?.shop.currency} {revenue.toLocaleString()}
            </strong>
          </div>
          <div className={styles.card}>
            <span className={styles.muted}>Open tickets</span>
            <strong>{open}</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.muted}>Completed</span>
            <strong>{completed}</strong>
          </div>
        </div>
        {lowStock.length > 0 && (
          <div className={styles.card} style={{ marginTop: "1rem" }}>
            <strong>Low stock</strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity}${s.unit})`).join(" · ")}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
