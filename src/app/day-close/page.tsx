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
}

export default function DayClosePage() {
  const { api, tenant } = useStore();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [history, setHistory] = useState<DayCloseSummary[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await api("/api/day-close");
    const data = await res.json();
    if (res.ok) {
      setPreview(data.preview);
      setHistory((data.history || []) as DayCloseSummary[]);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function closeShift() {
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
                {Object.entries(preview.byPayment).map(([k, v]) => (
                  <li key={k}>
                    <span>{k.replaceAll("_", " ")}</span>
                    <strong>{money(cur, v)}</strong>
                  </li>
                ))}
                {!Object.keys(preview.byPayment).length && (
                  <li className={styles.muted}>No sales in window</li>
                )}
              </ul>
              <div className={styles.row}>
                <button type="button" className={styles.btn} onClick={() => void closeShift()}>
                  Close shift & print
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
                      <td>{new Date(h.closedAt).toLocaleString()}</td>
                      <td>
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
