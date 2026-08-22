"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { useCountUp } from "@/lib/use-count-up";
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

  const grossShown = useCountUp(data?.summary.gross ?? 0, 800);
  const profitShown = useCountUp(data?.summary.estimatedProfit ?? 0, 800);
  const ordersShown = useCountUp(data?.summary.orderCount ?? 0, 600);
  const cogsShown = useCountUp(data?.summary.cogs ?? 0, 800);

  const paymentBars = useMemo(() => {
    const entries = Object.entries(data?.byPayment ?? {});
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries
      .map(([key, value]) => ({
        key: key.replaceAll("_", " "),
        value,
        pct: Math.round((value / max) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

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
                  <strong className={styles.statValue}>{money(cur, grossShown)}</strong>
                </article>
                <article className={styles.statCard}>
                  <span>Est. profit</span>
                  <strong className={styles.statValue}>{money(cur, profitShown)}</strong>
                  <em>{data.summary.marginPct}% margin</em>
                </article>
                <article className={styles.statCard}>
                  <span>Orders</span>
                  <strong className={styles.statValue}>{ordersShown}</strong>
                  <em>
                    {data.summary.completedCount} done · {data.summary.openCount} open ·{" "}
                    {data.summary.cancelledCount} void
                  </em>
                </article>
                <article className={styles.statCard}>
                  <span>Est. COGS</span>
                  <strong className={styles.statValue}>{money(cur, cogsShown)}</strong>
                  {!data.summary.costsConfigured && (
                    <em>Set cost prices on Menu for real margins</em>
                  )}
                </article>
              </div>

              <div className={styles.reportSplit}>
                <div className={styles.card}>
                  <h3 style={{ marginTop: 0 }}>By payment</h3>
                  {paymentBars.length ? (
                    <div className={styles.barList}>
                      {paymentBars.map((b) => (
                        <div key={b.key} className={styles.barRow}>
                          <div className={styles.barMeta}>
                            <span>{b.key}</span>
                            <strong>{money(cur, b.value)}</strong>
                          </div>
                          <div className={styles.barTrack} aria-hidden>
                            <div className={styles.barFill} style={{ width: `${b.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.muted}>No sales in this range</p>
                  )}
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
