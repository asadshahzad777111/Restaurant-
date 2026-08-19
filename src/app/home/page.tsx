"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import styles from "../staff.module.css";

export default function HomePage() {
  const { tenant, user } = useStore();
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
  const cancelled = today.filter((o) => o.status === "cancelled").length;
  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const cur = tenant?.shop.currency || "PKR";

  return (
    <AppShell title="Home">
      <div className={styles.page}>
        {user?.mustChangePassword && (
          <div className={styles.card} style={{ marginBottom: "1rem", borderColor: "#f5c542" }}>
            <strong>Password change recommended</strong>
            <p className={styles.muted}>
              Demo passwords are for /lab only. Production mein Settings → Change password use karein.
            </p>
            <Link href="/settings" className={styles.btn}>
              Open settings
            </Link>
          </div>
        )}
        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={styles.muted}>Today revenue</span>
            <strong>{money(cur, revenue)}</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.muted}>Open tickets</span>
            <strong>{open}</strong>
          </div>
          <div className={styles.card}>
            <span className={styles.muted}>Completed / void</span>
            <strong>
              {completed} / {cancelled}
            </strong>
          </div>
        </div>
        {lowStock.length > 0 && (
          <div className={styles.card} style={{ marginTop: "1rem", borderColor: "#ffb020" }}>
            <strong>⚠ Low stock (warning only — app still works)</strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity}${s.unit})`).join(" · ")}
            </p>
          </div>
        )}
        <div className={styles.row} style={{ marginTop: "1rem" }}>
          <Link href="/day-close" className={styles.btn}>
            Day close / shift
          </Link>
          <Link href="/tables" className={styles.btnGhost}>
            Tables
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
