"use client";

import { useCallback, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrintSuccess } from "@/components/PrintSuccess";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { printCustomerReceipt, printKitchenTicket } from "@/lib/print";
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
  const { tenant, api, applyOrder } = useStore();
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [printKind, setPrintKind] = useState<"bill" | "kitchen" | null>(null);

  async function advance(id: string, status: OrderStatus) {
    const next = NEXT[status];
    if (!next) return;
    const res = await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (res.ok && data.order) applyOrder(data.order, { tables: data.tables });
  }

  async function markPaid(id: string) {
    const res = await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus: "paid" }),
    });
    const data = await res.json();
    if (res.ok && data.order) applyOrder(data.order, { tables: data.tables });
  }

  async function complete(id: string) {
    const res = await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    const data = await res.json();
    if (res.ok && data.order) applyOrder(data.order, { tables: data.tables });
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
    if (data.order) applyOrder(data.order, { tables: data.tables });
  }

  function share(orderId: string, kind: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    const text = statusMessage(tenant, order, kind);
    void copyText(text).then(() => setMsg("Message copied"));
    window.open(whatsappShareUrl(order.customerPhone || tenant.shop.whatsapp, text), "_blank");
  }

  async function printBill(orderId: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    const printed = await printCustomerReceipt(tenant, order);
    if (printed) setPrintKind("bill");
  }

  async function printKitchen(orderId: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    const printed = await printKitchenTicket(tenant, order);
    if (printed) setPrintKind("kitchen");
  }

  const dismissPrint = useCallback(() => setPrintKind(null), []);

  return (
    <AppShell title="Orders">
      <PrintSuccess kind={printKind} onDone={dismissPrint} />
      <div className={styles.page}>
        {msg && <p className={styles.muted}>{msg}</p>}
        <ul className={styles.mobileCards}>
          {(tenant?.orders ?? []).map((o) => (
            <li
              key={o.id}
              className={`${styles.mobileCard}${o.status === "placed" ? ` ${styles.rowNew}` : ""}`}
            >
              <div>
                <strong>
                  #{o.number} · {o.status}
                </strong>
                <p className={styles.muted}>
                  {o.channel}/{o.serviceType}
                  {o.tableNumber ? ` · T${o.tableNumber}` : ""} · {o.paymentStatus} ·{" "}
                  {tenant ? money(tenant.shop.currency, o.total) : o.total}
                </p>
                {o.paymentProofUrl ? (
                  <p className={styles.muted} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={o.paymentProofUrl} target="_blank" rel="noreferrer">
                      <img
                        src={o.paymentProofUrl}
                        alt="Payment proof"
                        style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }}
                      />
                    </a>
                    <span>Proof · {o.paymentStatus}</span>
                  </p>
                ) : null}
              </div>
              <div className={styles.cardActions}>
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
                      Done
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
                <button type="button" className={styles.btnGhost} onClick={() => void printBill(o.id)}>
                  Bill
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => void printKitchen(o.id)}>
                  Kitchen
                </button>
                <a href={`/track/${o.trackToken}`} target="_blank" rel="noreferrer">
                  Track
                </a>
              </div>
            </li>
          ))}
        </ul>
        <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
        <table className={`${styles.table} ${styles.tableDesktop}`}>
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
              <tr key={o.id} className={o.status === "placed" ? styles.rowNew : undefined}>
                <td>{o.number}</td>
                <td>
                  {o.channel}/{o.serviceType}
                  {o.tableNumber ? ` · T${o.tableNumber}` : ""}
                </td>
                <td>
                  {o.status}
                  {o.cancelReason ? ` · ${o.cancelReason}` : ""}
                </td>
                <td>
                  {o.paymentStatus}
                  {o.paymentProofUrl ? (
                    <>
                      {" "}
                      <a href={o.paymentProofUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={o.paymentProofUrl}
                          alt="Proof"
                          style={{
                            width: 36,
                            height: 36,
                            objectFit: "cover",
                            borderRadius: 4,
                            verticalAlign: "middle",
                          }}
                        />
                      </a>
                    </>
                  ) : null}
                </td>
                <td>
                  {tenant ? money(tenant.shop.currency, o.total) : o.total}
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
                  {o.paymentStatus !== "paid" && o.status !== "cancelled" && (
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => void markPaid(o.id)}
                    >
                      Mark paid
                    </button>
                  )}
                  {o.status !== "completed" && o.status !== "cancelled" && (
                    <>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => void complete(o.id)}
                      >
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
                        Cancel/Void
                      </button>
                    </>
                  )}
                  <button type="button" className={styles.btnGhost} onClick={() => void printBill(o.id)}>
                    Bill
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => void printKitchen(o.id)}
                  >
                    Kitchen print
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => share(o.id, "confirmed")}
                  >
                    Msg: confirmed
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => share(o.id, "preparing")}
                  >
                    Msg: preparing
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => share(o.id, "ready")}
                  >
                    Msg: ready
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => share(o.id, "out")}
                  >
                    Msg: out
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
