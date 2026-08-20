"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { planAllows, upgradeHint } from "@/lib/plans";
import styles from "../staff.module.css";

export default function HomePage() {
  const { tenant, user, planId } = useStore();
  const orders = tenant?.orders ?? [];
  const today = orders.filter((o) => {
    const d = new Date(o.createdAt);
    const n = new Date();
    return d.toDateString() === n.toDateString();
  });
  const revenue = today
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const costGuess = Math.round(revenue * 0.35);
  const profitGuess = revenue - costGuess;
  const completed = today.filter((o) => o.status === "completed").length;
  const open = today.filter((o) => !["completed", "cancelled"].includes(o.status)).length;
  const cancelled = today.filter((o) => o.status === "cancelled").length;
  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const cur = tenant?.shop.currency || "PKR";
  const showSales = planAllows(planId, "sales");

  return (
    <AppShell title="Home">
      <div className={styles.page}>
        {user?.mustChangePassword && (
          <div className={styles.card} style={{ marginBottom: "1rem", borderColor: "#f5c542" }}>
            <strong>Password change recommended</strong>
            <p className={styles.muted}>
              Change the password in Settings before real service.
            </p>
            <Link href="/settings" className={styles.btn}>
              Open settings
            </Link>
          </div>
        )}

        {showSales ? (
          <div className={styles.grid}>
            <div className={styles.card}>
              <span className={styles.muted}>Today sales</span>
              <strong>{money(cur, revenue)}</strong>
            </div>
            <div className={styles.card}>
              <span className={styles.muted}>Est. profit strip</span>
              <strong>{money(cur, profitGuess)}</strong>
              <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
                Rough guide (≈65% after food cost). Fine-tune costs on Pro+.
              </p>
            </div>
            <div className={styles.card}>
              <span className={styles.muted}>Tickets</span>
              <strong>
                {open} open · {completed} done · {cancelled} void
              </strong>
            </div>
          </div>
        ) : (
          <div className={styles.upgrade}>
            <strong>Sales & profit locked on Starter</strong>
            <p className={styles.muted} style={{ margin: "0.4rem 0 0", color: "inherit" }}>
              {upgradeHint(planId)} You still have POS billing below.
            </p>
            <div className={styles.row}>
              <Link href="/pos" className={styles.btn}>
                Open POS billing
              </Link>
              <Link href="/orders" className={styles.btnGhost}>
                Order list
              </Link>
            </div>
          </div>
        )}

        {planAllows(planId, "stock") && lowStock.length > 0 && (
          <div className={styles.card} style={{ marginTop: "1rem", borderColor: "#ffb020" }}>
            <strong>⚠ Low stock (warning only — app still works)</strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity}${s.unit})`).join(" · ")}
            </p>
          </div>
        )}

        <div className={styles.row} style={{ marginTop: "1rem" }}>
          {planAllows(planId, "pos") && (
            <Link href="/pos" className={styles.btn}>
              POS
            </Link>
          )}
          {planAllows(planId, "dayClose") && (
            <Link href="/day-close" className={styles.btnGhost}>
              Day close / shift
            </Link>
          )}
          {planAllows(planId, "tables") && (
            <Link href="/tables" className={styles.btnGhost}>
              Tables
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
