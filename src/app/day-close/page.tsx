"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
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
  const [history, setHistory] = useState<unknown[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await api("/api/day-close");
    const data = await res.json();
    if (res.ok) {
      setPreview(data.preview);
      setHistory(data.history || []);
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
    setMsg("Day/shift closed (no refund accounting)");
    await load();
    window.print();
  }

  const cur = tenant?.shop.currency || "PKR";

  return (
    <AppShell title="Day close">
      <PlanGate need="dayClose">
      <div className={styles.page}>
        <p className={styles.muted}>
          End-of-day / shift summary — totals by payment. Cancel/voids counted separately. No refund
          ledger.
        </p>
        {preview && (
          <div className={styles.card} id="day-close-print">
            <strong>Last 24h preview</strong>
            <p>
              Orders: {preview.orderCount} · Completed: {preview.completedCount} · Voided:{" "}
              {preview.cancelledCount}
            </p>
            <p>
              Gross (excl. voids): <strong>{money(cur, preview.grossTotal)}</strong>
            </p>
            <ul>
              {Object.entries(preview.byPayment).map(([k, v]) => (
                <li key={k}>
                  {k}: {money(cur, v)}
                </li>
              ))}
            </ul>
            <button type="button" className={styles.btn} onClick={() => void closeShift()}>
              Close shift & print
            </button>
          </div>
        )}
        {msg && <p className={styles.muted}>{msg}</p>}
        <h3>History</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(history.slice(0, 5), null, 2)}
        </pre>
      </div>
      </PlanGate>
    </AppShell>
  );
}
