"use client";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import styles from "../staff.module.css";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

export default function OrdersPage() {
  const { tenant, api, refresh } = useStore();

  async function advance(id: string, status: OrderStatus) {
    const next = NEXT[status];
    if (!next) return;
    await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    await refresh();
  }

  async function markPaid(id: string) {
    await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    await refresh();
  }

  async function complete(id: string) {
    await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    await refresh();
  }

  return (
    <AppShell title="Orders">
      <div className={styles.page}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Pay</th>
              <th>Total</th>
              <th>Track</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(tenant?.orders ?? []).map((o) => (
              <tr key={o.id}>
                <td>{o.number}</td>
                <td>
                  {o.channel}/{o.serviceType}
                  {o.tableNumber ? ` · T${o.tableNumber}` : ""}
                </td>
                <td>{o.status}</td>
                <td>{o.paymentStatus}</td>
                <td>
                  {tenant?.shop.currency} {o.total}
                </td>
                <td>
                  <a href={`/track/${o.trackToken}`} target="_blank" rel="noreferrer">
                    open
                  </a>
                </td>
                <td className={styles.row}>
                  {NEXT[o.status] && (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => void advance(o.id, o.status)}
                    >
                      → {NEXT[o.status]}
                    </button>
                  )}
                  {o.paymentStatus !== "paid" && (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => void markPaid(o.id)}
                    >
                      Mark paid
                    </button>
                  )}
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => void complete(o.id)}
                    >
                      Completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
