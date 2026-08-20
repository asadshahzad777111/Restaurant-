"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import styles from "../staff.module.css";

type SalesPayload = {
  from: string;
  to: string;
  currency: string;
  summary: {
    orderCount: number;
    completedCount: number;
    cancelledCount: number;
    openCount: number;
    gross: number;
    cogs: number;
    estimatedProfit: number;
    marginPct: number;
    costsConfigured: boolean;
  };
  byPayment: Record<string, number>;
  byChannel: Record<string, number>;
  byService: Record<string, number>;
  topItems: Array<{ name: string; qty: number; revenue: number; cost: number; margin: number }>;
};

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default function SalesPage() {
  const { api, tenant } = useStore();
  const [range, setRange] = useState<"1" | "7" | "30">("7");
  const [data, setData] = useState<SalesPayload | null>(null);
  const [error, setError] = useState("");
  const cur = tenant?.shop.currency || "PKR";

  const load = useCallback(async () => {
    const days = Number(range);
    const res = await api(`/api/sales?from=${encodeURIComponent(daysAgoIso(days))}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load sales");
      return;
    }
    setError("");
    setData(json as SalesPayload);
  }, [api, range]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Sales & Profit">
      <PlanGate need="sales">
        <div className={styles.page}>
          <p className={styles.muted}>
            Profit Profile — gross sales, payment mix, and estimated margin from menu cost prices.
            Same catalog as POS and guest. No refund ledger.
          </p>

            <div className={styles.row} style={{ marginBottom: "1rem" }}>
            {(
              [
                ["1", "Today"],
                ["7", "7 days"],
                ["30", "30 days"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={range === id ? styles.btn : styles.btnGhost}
                onClick={() => setRange(id)}
              >
                {label}
              </button>
            ))}
            <button type="button" className={styles.btnGhost} onClick={() => void load()}>
              Refresh
            </button>
            {data && (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  const rows = [
                    ["range_from", data.from],
                    ["range_to", data.to],
                    ["gross", String(data.summary.gross)],
                    ["cogs", String(data.summary.cogs)],
                    ["estimated_profit", String(data.summary.estimatedProfit)],
                    ["margin_pct", String(data.summary.marginPct)],
                    ["orders", String(data.summary.orderCount)],
                    [],
                    ["item", "qty", "revenue", "cost", "margin"],
                    ...data.topItems.map((i) => [
                      i.name,
                      String(i.qty),
                      String(i.revenue),
                      String(i.cost),
                      String(i.margin),
                    ]),
                  ];
                  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${tenant?.code || "kitchen"}-sales.csv`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Download CSV
              </button>
            )}
          </div>

          {error && <p className={styles.muted}>{error}</p>}

          {data && (
            <>
              <div className={styles.statGrid}>
                <article className={styles.statCard}>
                  <span>Gross sales</span>
                  <strong>{money(cur, data.summary.gross)}</strong>
                </article>
                <article className={styles.statCard}>
                  <span>Est. profit</span>
                  <strong>{money(cur, data.summary.estimatedProfit)}</strong>
                  <em>{data.summary.marginPct}% margin</em>
                </article>
                <article className={styles.statCard}>
                  <span>Orders</span>
                  <strong>{data.summary.orderCount}</strong>
                  <em>
                    {data.summary.completedCount} done · {data.summary.openCount} open ·{" "}
                    {data.summary.cancelledCount} void
                  </em>
                </article>
                <article className={styles.statCard}>
                  <span>Est. COGS</span>
                  <strong>{money(cur, data.summary.cogs)}</strong>
                  {!data.summary.costsConfigured && (
                    <em>Set cost prices on Menu for real margins</em>
                  )}
                </article>
              </div>

              <div className={styles.reportSplit}>
                <div className={styles.card}>
                  <h3 style={{ marginTop: 0 }}>By payment</h3>
                  <ul className={styles.reportList}>
                    {Object.entries(data.byPayment).map(([k, v]) => (
                      <li key={k}>
                        <span>{k.replaceAll("_", " ")}</span>
                        <strong>{money(cur, v)}</strong>
                      </li>
                    ))}
                    {!Object.keys(data.byPayment).length && (
                      <li className={styles.muted}>No sales in this range</li>
                    )}
                  </ul>
                </div>
                <div className={styles.card}>
                  <h3 style={{ marginTop: 0 }}>By channel</h3>
                  <ul className={styles.reportList}>
                    {Object.entries(data.byChannel).map(([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <strong>{money(cur, v)}</strong>
                      </li>
                    ))}
                  </ul>
                  <h3>By service</h3>
                  <ul className={styles.reportList}>
                    {Object.entries(data.byService).map(([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <strong>{money(cur, v)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className={styles.card}>
                <h3 style={{ marginTop: 0 }}>Top items</h3>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Revenue</th>
                        <th>Est. margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topItems.map((i) => (
                        <tr key={i.name}>
                          <td>{i.name}</td>
                          <td>{i.qty}</td>
                          <td>{money(cur, i.revenue)}</td>
                          <td>{money(cur, i.margin)}</td>
                        </tr>
                      ))}
                      {!data.topItems.length && (
                        <tr>
                          <td colSpan={4} className={styles.muted}>
                            No lines yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </PlanGate>
    </AppShell>
  );
}
