"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { customerReceiptHtml, kitchenTicketHtml, openPrintWindow } from "@/lib/print";
import { copyText, statusMessage, whatsappShareUrl } from "@/lib/status-messages";
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
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

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

  async function cancelOrder() {
    if (!cancelId || !reason.trim()) return;
    const res = await api(`/api/orders/${cancelId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "cancelled", cancelReason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Cancel failed");
      return;
    }
    setCancelId(null);
    setReason("");
    setMsg("Order voided (no refund flow)");
    await refresh();
  }

  function share(orderId: string, kind: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    const text = statusMessage(tenant, order, kind);
    void copyText(text).then(() => setMsg("Message copied"));
    window.open(whatsappShareUrl(order.customerPhone || tenant.shop.whatsapp, text), "_blank");
  }

  function printBill(orderId: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    openPrintWindow(customerReceiptHtml(tenant, order));
  }

  function printKitchen(orderId: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    openPrintWindow(kitchenTicketHtml(tenant, order));
  }

  function actions(o: { id: string; status: OrderStatus; paymentStatus: string }) {
    return (
      <>
        {NEXT[o.status] && (
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void advance(o.id, o.status)}
          >
            → {NEXT[o.status]}
          </button>
        )}
        {o.paymentStatus !== "paid" && o.status !== "cancelled" && (
          <button type="button" className={styles.btnGhost} onClick={() => void markPaid(o.id)}>
            Mark paid
          </button>
        )}
        {o.status !== "completed" && o.status !== "cancelled" && (
          <>
            <button type="button" className={styles.btn} onClick={() => void complete(o.id)}>
              Completed
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => {
                setCancelId(o.id);
                setReason("");
              }}
            >
              Void
            </button>
          </>
        )}
        <button type="button" className={styles.btnGhost} onClick={() => printBill(o.id)}>
          Bill
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => printKitchen(o.id)}>
          Kitchen
        </button>
        <button type="button" className={styles.btnGhost} onClick={() => share(o.id, "confirmed")}>
          Msg
        </button>
      </>
    );
  }

  const orders = tenant?.orders ?? [];

  return (
    <AppShell title="Orders">
      <div className={styles.page}>
        {msg && <p className={styles.muted}>{msg}</p>}

        <div className={`${styles.tableWrap} ${styles.desktopOnly}`}>
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
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.number}</td>
                  <td>
                    {o.channel}/{o.serviceType}
                    {o.tableNumber ? ` · T${o.tableNumber}` : ""}
                  </td>
                  <td>
                    {o.status}
                    {o.cancelReason ? ` · ${o.cancelReason}` : ""}
                  </td>
                  <td>{o.paymentStatus}</td>
                  <td>{tenant ? money(tenant.shop.currency, o.total) : o.total}</td>
                  <td>
                    <a href={`/track/${o.trackToken}`} target="_blank" rel="noreferrer">
                      open
                    </a>
                  </td>
                  <td>
                    <div className={styles.row} style={{ marginTop: 0 }}>
                      {actions(o)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.orderCards}>
          {orders.map((o) => (
            <article key={o.id} className={styles.orderCard}>
              <header>
                <strong>
                  #{o.number} · {o.status}
                </strong>
                <span>{tenant ? money(tenant.shop.currency, o.total) : o.total}</span>
              </header>
              <p className={styles.muted} style={{ margin: 0 }}>
                {o.channel}/{o.serviceType}
                {o.tableNumber ? ` · T${o.tableNumber}` : ""} · {o.paymentStatus}
              </p>
              <div className={styles.orderActions}>{actions(o)}</div>
            </article>
          ))}
        </div>

        {cancelId && (
          <div className={styles.card} style={{ marginTop: "1rem" }}>
            <strong>Cancel / void (not a refund)</strong>
            <p className={styles.muted}>Reason required. Guest track will show cancelled.</p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason e.g. customer left / kitchen error"
              style={{ width: "100%", marginTop: 8, padding: 8 }}
            />
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={() => void cancelOrder()}>
                Confirm void
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => setCancelId(null)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
