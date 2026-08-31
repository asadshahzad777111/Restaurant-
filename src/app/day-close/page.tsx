"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import type { DayCloseSummary } from "@/lib/tenant-types";
import styles from "../staff.module.css";

interface Preview {
  from: string;
  to: string;
  orderCount: number;
  cancelledCount: number;
  completedCount: number;
  grossTotal: number;
  byPayment: Record<string, number>;
  codCollectedTotal?: number;
  codPendingTotal?: number;
}

export default function DayClosePage() {
  const { api, tenant } = useStore();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [history, setHistory] = useState<DayCloseSummary[]>([]);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api("/api/day-close");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPreview(data.preview);
        setHistory((data.history || []) as DayCloseSummary[]);
      }
    } catch {
      setMsg("Could not load day close — retry from Home.");
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function closeShift() {
    if (closing) return;
    if (!window.confirm("Close the shift now? This is final and cannot be undone.")) return;
    setClosing(true);
    try {
      const res = await api("/api/day-close", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setMsg("Shift closed — print the summary for the till drawer.");
      await load();
      window.print();
    } finally {
      setClosing(false);
    }
  }

  const cur = tenant?.shop.currency || "PKR";

  return (
    <AppShell title="Day close">
      <PlanGate need="dayClose">
        <div className={styles.page}>
          <p className={styles.muted}>
            End-of-day / shift summary — AsFix-style till close. Totals by payment. Voids counted
            separately. No refund ledger.
          </p>

          {preview && (
            <div className={styles.card} id="day-close-print">
              <h3 style={{ marginTop: 0 }}>Last 24h preview</h3>
              <div className={styles.statGrid}>
                <article className={styles.statCard}>
                  <span>Gross</span>
                  <strong>{money(cur, preview.grossTotal)}</strong>
                </article>
                <article className={styles.statCard}>
                  <span>Orders</span>
                  <strong>{preview.orderCount}</strong>
                  <em>
                    {preview.completedCount} completed · {preview.cancelledCount} void
                  </em>
                </article>
              </div>
              <h4>Payment mix</h4>
              <ul className={styles.reportList}>
                {Object.entries(preview.byPayment || {}).map(([k, v]) => (
                  <li key={k}>
                    <span>{k.split("_").join(" ")}</span>
                    <strong>{money(cur, v)}</strong>
                  </li>
                ))}
                {!Object.keys(preview.byPayment).length && (
                  <li className={styles.muted}>No sales in window</li>
                )}
              </ul>
              {typeof preview.codCollectedTotal === "number" || typeof preview.codPendingTotal === "number" ? (
                <>
                  <h4>COD reconciliation</h4>
                  <ul className={styles.reportList}>
                    <li>
                      <span>Collected (rider cash-in)</span>
                      <strong>{money(cur, preview.codCollectedTotal ?? 0)}</strong>
                    </li>
                    <li>
                      <span>Pending (not yet collected)</span>
                      <strong>{money(cur, preview.codPendingTotal ?? 0)}</strong>
                    </li>
                  </ul>
                </>
              ) : null}
              <div className={styles.row}>
                <button type="button" className={styles.btn} disabled={closing} onClick={() => void closeShift()}>
                  {closing ? "Closing…" : "Close shift & print"}
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => window.print()}>
                  Print preview
                </button>
              </div>
            </div>
          )}

          {msg && <p className={styles.muted}>{msg}</p>}

          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Close history</h3>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Closed</th>
                    <th>Window</th>
                    <th>Orders</th>
                    <th>Gross</th>
                    <th>Voids</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 20).map((h) => (
                    <tr key={h.id}>
                      <td suppressHydrationWarning>{new Date(h.closedAt).toLocaleString()}</td>
                      <td suppressHydrationWarning>
                        {new Date(h.from).toLocaleDateString()} → {new Date(h.to).toLocaleDateString()}
                      </td>
                      <td>{h.orderCount}</td>
                      <td>{money(cur, h.grossTotal)}</td>
                      <td>{h.cancelledCount}</td>
                    </tr>
                  ))}
                  {!history.length && (
                    <tr>
                      <td colSpan={5} className={styles.muted}>
                        No closes yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PlanGate>
    </AppShell>
  );
}
