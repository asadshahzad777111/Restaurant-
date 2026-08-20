"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import styles from "../staff.module.css";

export default function HomePage() {
  const { tenant, user } = useStore();
  const perms = new Set(user?.permissions ?? []);
  const isAdmin = user?.role === "admin";
  const can = (perm: "pos" | "orders" | "kitchen" | "staff") => isAdmin || perms.has(perm);
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
            <Link href="/settings" prefetch className={styles.btn}>
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
          {can("pos") && (
            <Link href="/pos" prefetch className={styles.btn}>
              POS / counter
            </Link>
          )}
          {can("kitchen") && (
            <Link href="/kitchen" prefetch className={styles.btn}>
              Kitchen
            </Link>
          )}
          {can("orders") && (
            <Link href="/orders" prefetch className={styles.btnGhost}>
              Orders / billing
            </Link>
          )}
          {can("staff") && (
            <Link href="/staff" prefetch className={styles.btnGhost}>
              Staff
            </Link>
          )}
          <Link href="/day-close" prefetch className={styles.btnGhost}>
            Day close / shift
          </Link>
          {can("pos") && (
            <Link href="/tables" prefetch className={styles.btnGhost}>
              Tables
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
