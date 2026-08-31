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

type AnalyticsPayload = {
  report: {
    volume: Array<{ date: string; orders: number; gross: number }>;
    avgFulfillmentMinutes: number | null;
    cancellationRate: number;
    riderUtilization: {
      totalRiders: number;
      onlineRiders: number;
      busyRiders: number;
      utilizationPct: number;
    };
    avgDeliveryOrderValue: number;
    deliveryOrderCount: number;
  };
};

type PayoutPayload = {
  summary: {
    from: string;
    to: string;
    currency: string;
    commissionPct: number;
    gross: number;
    commission: number;
    codCollected: number;
    netPayout: number;
    orderCount: number;
    deliveryCount: number;
  };
};

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default function SalesPage() {
  const { api, tenant } = useStore();
  const [range, setRange] = useState<"1" | "7" | "30">("7");
  const [data, setData] = useState<SalesPayload | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [payout, setPayout] = useState<PayoutPayload | null>(null);
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
        key: String(key).split("_").join(" "),
        value,
        pct: Math.round((value / max) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const days = Number(range);
      const res = await api(`/api/sales?from=${encodeURIComponent(daysAgoIso(days))}`, {
        signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error || "Could not load sales");
        return;
      }
      setError("");
      setData(json as SalesPayload);
      // Admin analytics (Phase 3) — best-effort secondary fetch.
      try {
        const ares = await api(`/api/analytics?days=${days}`, { signal });
        if (ares.ok) setAnalytics((await ares.json()) as AnalyticsPayload);
      } catch {
        /* analytics are optional */
      }
      try {
        const pres = await api(`/api/payouts?days=${days}`, { signal });
        if (pres.ok) setPayout((await pres.json()) as PayoutPayload);
      } catch {
        /* payouts are optional */
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError("Could not load sales — check the connection and retry.");
    }
  }, [api, range]);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  function exportOrdersCsv() {
    const days = Number(range);
    const from = Date.now() - days * 24 * 60 * 60 * 1000;
    const orders = (tenant?.orders || []).filter(
      (o) => new Date(o.createdAt).getTime() >= from,
    );
    const header = [
      "Order ID",
      "Customer Name",
      "Phone",
      "Items Summary",
      "Subtotal",
      "Tax",
      "Grand Total",
      "Payment Mode",
      "Timestamp",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = orders.map((o) => [
      o.number ?? o.id,
      o.customerName ?? "",
      o.customerPhone ?? "",
      (o.lines || []).map((l: { qty: number; name: string }) => `${l.qty}x ${l.name}`).join(" | "),
      o.subtotal ?? "",
      o.fees?.tax ?? "",
      o.total ?? "",
      o.paymentStatus ?? o.paymentMethod ?? "",
      new Date(o.createdAt).toLocaleString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordo-sales-${range}days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
            <button type="button" className={styles.btn} onClick={exportOrdersCsv}>
              Export orders CSV
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
                    ...(data.topItems || []).map((i) => [
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
                  <strong className={styles.statValue} suppressHydrationWarning>{money(cur, grossShown)}</strong>
                </article>
                <article className={styles.statCard}>
                  <span>Est. profit</span>
                  <strong className={styles.statValue} suppressHydrationWarning>{money(cur, profitShown)}</strong>
                  <em>{data.summary.marginPct}% margin</em>
                </article>
                <article className={styles.statCard}>
                  <span>Orders</span>
                  <strong className={styles.statValue} suppressHydrationWarning>{ordersShown}</strong>
                  <em>
                    {data.summary.completedCount} done · {data.summary.openCount} open ·{" "}
                    {data.summary.cancelledCount} void
                  </em>
                </article>
                <article className={styles.statCard}>
                  <span>Est. COGS</span>
                  <strong className={styles.statValue} suppressHydrationWarning>{money(cur, cogsShown)}</strong>
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
                    {Object.entries(data.byChannel || {}).map(([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <strong>{money(cur, v)}</strong>
                      </li>
                    ))}
                  </ul>
                  <h3>By service</h3>
                  <ul className={styles.reportList}>
                    {Object.entries(data.byService || {}).map(([k, v]) => (
                      <li key={k}>
                        <span>{k}</span>
                        <strong>{money(cur, v)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {analytics && (
                <div className={styles.card}>
                  <h3 style={{ marginTop: 0 }}>Operations analytics</h3>
                  <div className={styles.statGrid}>
                    <article className={styles.statCard}>
                      <span>Avg fulfillment</span>
                      <strong suppressHydrationWarning>
                        {analytics.report.avgFulfillmentMinutes != null
                          ? `${analytics.report.avgFulfillmentMinutes} min`
                          : "—"}
                      </strong>
                      <em>placed → completed</em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Cancellation rate</span>
                      <strong suppressHydrationWarning>
                        {Math.round(analytics.report.cancellationRate * 100)}%
                      </strong>
                      <em>of all orders</em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Rider utilization</span>
                      <strong suppressHydrationWarning>
                        {analytics.report.riderUtilization.utilizationPct}%
                      </strong>
                      <em>
                        {analytics.report.riderUtilization.busyRiders} busy ·{" "}
                        {analytics.report.riderUtilization.onlineRiders} online
                      </em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Avg delivery order</span>
                      <strong suppressHydrationWarning>
                        {money(cur, analytics.report.avgDeliveryOrderValue)}
                      </strong>
                      <em>{analytics.report.deliveryOrderCount} deliveries</em>
                    </article>
                  </div>
                  <h4>Order volume by day</h4>
                  <div className={styles.barList}>
                    {analytics.report.volume.map((v) => {
                      const max = Math.max(1, ...analytics.report.volume.map((x) => x.orders));
                      const pct = Math.round((v.orders / max) * 100);
                      return (
                        <div key={v.date} className={styles.barRow}>
                          <div className={styles.barMeta}>
                            <span suppressHydrationWarning>
                              {new Date(`${v.date}T00:00:00`).toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <strong suppressHydrationWarning>
                              {v.orders} · {money(cur, v.gross)}
                            </strong>
                          </div>
                          <div className={styles.barTrack} aria-hidden>
                            <div className={styles.barFill} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      {(data.topItems || []).map((i) => (
                        <tr key={i.name}>
                          <td>{i.name}</td>
                          <td>{i.qty}</td>
                          <td>{money(cur, i.revenue)}</td>
                          <td>{money(cur, i.margin)}</td>
                        </tr>
                      ))}
                      {!(data.topItems || []).length && (
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

              {payout && (
                <div className={styles.card}>
                  <h3 style={{ marginTop: 0 }}>
                    Payout · {payout.summary.commissionPct}% platform commission
                  </h3>
                  <p className={styles.muted}>
                    Clear breakdown — order total, platform commission, rider COD
                    already banked, and what this kitchen is paid.
                  </p>
                  <div className={styles.statGrid}>
                    <article className={styles.statCard}>
                      <span>Gross sales</span>
                      <strong suppressHydrationWarning>{money(cur, payout.summary.gross)}</strong>
                      <em>{payout.summary.orderCount} orders</em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Platform commission</span>
                      <strong suppressHydrationWarning>{money(cur, payout.summary.commission)}</strong>
                      <em>{payout.summary.commissionPct}% of gross</em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Rider COD banked</span>
                      <strong suppressHydrationWarning>{money(cur, payout.summary.codCollected)}</strong>
                      <em>cash already collected</em>
                    </article>
                    <article className={styles.statCard}>
                      <span>Net payout</span>
                      <strong className={styles.statValue} suppressHydrationWarning>
                        {money(cur, payout.summary.netPayout)}
                      </strong>
                      <em>gross − commission − COD</em>
                    </article>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PlanGate>
    </AppShell>
  );
}
