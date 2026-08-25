"use client";

import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrintSuccess } from "@/components/PrintSuccess";
import { useStore } from "@/lib/store";
import { money } from "@/lib/fees";
import { PrintTargetChooser } from "@/components/PrintTargetChooser";
import { PrintBridgeBar } from "@/components/PrintBridgeBar";
import { enqueueSlip, executeLocalPrint, shouldOpenPrintChooser } from "@/lib/print-target";
import { copyText, statusMessage, whatsappShareUrl } from "@/lib/status-messages";
import type { DiningTable, Order } from "@/lib/tenant-types";
import type { OrderStatus } from "@/lib/types";
import styles from "./orders.module.css";

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  out_for_delivery: "completed",
};

const ACTIVE: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "out_for_delivery"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out",
  completed: "Done",
  cancelled: "Void",
};

const MSG_KINDS = ["confirmed", "preparing", "ready", "out"] as const;

const MSG_LABEL: Record<(typeof MSG_KINDS)[number], string> = {
  confirmed: "confirmed",
  preparing: "preparing",
  ready: "ready",
  out: "out for delivery",
};

/** Static status → CSS-module class (keeps class names literal for bundlers). */
const STATUS_CLASS: Record<OrderStatus, string> = {
  placed: styles["status-placed"],
  accepted: styles["status-accepted"],
  preparing: styles["status-preparing"],
  ready: styles["status-ready"],
  out_for_delivery: styles["status-out_for_delivery"],
  completed: styles["status-completed"],
  cancelled: styles["status-cancelled"],
};

function isActive(o: Order) {
  return ACTIVE.includes(o.status);
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function OrdersPage() {
  const { tenant, api, applyOrder } = useStore();
  const [tab, setTab] = useState<"all" | "active" | "completed">("active");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [printKind, setPrintKind] = useState<"bill" | "kitchen" | null>(null);
  const [lastBillOrder, setLastBillOrder] = useState<Order | null>(null);
  const [openMore, setOpenMore] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<{ order: Order; kind: "bill" | "kitchen" } | null>(null);
  const [bridgeNote, setBridgeNote] = useState("");

  const orders = tenant?.orders ?? [];

  const filtered = useMemo(() => {
    if (tab === "active") return orders.filter((o) => isActive(o));
    if (tab === "completed") return orders.filter((o) => !isActive(o));
    return orders;
  }, [orders, tab]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((o) => isActive(o)).length,
      completed: orders.filter((o) => !isActive(o)).length,
    }),
    [orders],
  );

  async function runMutation(fn: () => Promise<Response | null>, failMsg: string) {
    try {
      const res = await fn();
      if (!res) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((data as { error?: string }).error || failMsg);
        return null;
      }
      return data as { order?: Order; tables?: DiningTable[] };
    } catch {
      setMsg(failMsg);
      return null;
    }
  }

  async function advance(id: string, status: OrderStatus) {
    const next = NEXT[status];
    if (!next) return;
    const data = await runMutation(
      () =>
        api(`/api/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: next }),
        }),
      "Could not update the order",
    );
    if (data?.order) applyOrder(data.order, { tables: data.tables });
  }

  async function markPaid(id: string) {
    const data = await runMutation(
      () =>
        api(`/api/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ paymentStatus: "paid" }),
        }),
      "Could not mark as paid",
    );
    if (data?.order) applyOrder(data.order, { tables: data.tables });
  }

  async function complete(id: string) {
    const data = await runMutation(
      () =>
        api(`/api/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" }),
        }),
      "Could not complete the order",
    );
    if (data?.order) applyOrder(data.order, { tables: data.tables });
  }

  async function cancelOrder() {
    if (!cancelId || !reason.trim()) return;
    const data = await runMutation(
      () =>
        api(`/api/orders/${cancelId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "cancelled", cancelReason: reason.trim() }),
        }),
      "Cancel failed",
    );
    if (!data) return;
    setCancelId(null);
    setReason("");
    setMsg("Order voided (no refund flow)");
    if (data.order) applyOrder(data.order, { tables: data.tables });
  }

  async function share(orderId: string, kind: string) {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    const phone = order.customerPhone || tenant.shop.whatsapp;
    if (!phone?.trim()) {
      setMsg("No phone number on this order to message");
      return;
    }
    const text = statusMessage(tenant, order, kind);
    try {
      await copyText(text);
    } catch {
      /* clipboard may be blocked; still open WhatsApp */
    }
    setMsg("WhatsApp opened with the message");
    window.open(whatsappShareUrl(phone, text), "_blank");
  }

  async function requestPrint(orderId: string, kind: "bill" | "kitchen") {
    if (!tenant) return;
    const order = tenant.orders.find((o) => o.id === orderId);
    if (!order) return;
    setOpenMore(null);
    const chooser = await shouldOpenPrintChooser();
    if (chooser) {
      setPrintTarget({ order, kind });
      setBridgeNote("");
      return;
    }
    const printed = await executeLocalPrint(tenant, order, kind);
    if (printed) {
      if (kind === "bill") setLastBillOrder(order);
      setPrintKind(kind);
    }
  }

  async function printBill(orderId: string) {
    await requestPrint(orderId, "bill");
  }

  async function printKitchen(orderId: string) {
    await requestPrint(orderId, "kitchen");
  }

  async function sendPrintToAndroid() {
    if (!printTarget || !tenant) return;
    try {
      await enqueueSlip(tenant, printTarget.order, printTarget.kind);
      setBridgeNote("");
      if (printTarget.kind === "bill") setLastBillOrder(printTarget.order);
      setPrintKind(printTarget.kind);
      setPrintTarget(null);
    } catch {
      setBridgeNote("Could not queue the slip — print here or check the network.");
    }
  }

  async function printHereFromChooser() {
    if (!printTarget || !tenant) return;
    const { order, kind } = printTarget;
    setPrintTarget(null);
    const printed = await executeLocalPrint(tenant, order, kind);
    if (printed) setPrintKind(kind);
  }

  const dismissPrint = useCallback(() => setPrintKind(null), []);

  function openCancel(orderId: string) {
    setCancelId(orderId);
    setReason("");
    setOpenMore(null);
  }

  const renderActions = (o: Order) => {
    const next = NEXT[o.status];
    const pending = o.paymentStatus !== "paid" && o.status !== "cancelled";
    const live = o.status !== "completed" && o.status !== "cancelled";
    const isOpen = openMore === o.id;

    return (
      <div className={styles.actions}>
        {next && (
          <button type="button" className={styles.primary} onClick={() => void advance(o.id, o.status)}>
            <span aria-hidden>→</span> {STATUS_LABEL[next]}
          </button>
        )}
        {!next && live && (
          <button type="button" className={styles.primary} onClick={() => void complete(o.id)}>
            <span aria-hidden>✓</span> Done
          </button>
        )}
        {pending && (
          <button type="button" className={`${styles.primary} ${styles.primaryGhost}`} onClick={() => void markPaid(o.id)}>
            Mark paid
          </button>
        )}

        <div className={styles.moreWrap}>
          <button
            type="button"
            className={styles.moreBtn}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setOpenMore(isOpen ? null : o.id)}
          >
            ⋯ More
          </button>
          {isOpen && (
            <div className={styles.moreMenu} role="menu">
              <button type="button" className={styles.moreItem} role="menuitem" onClick={() => void printBill(o.id)}>
                🖨 Print bill
              </button>
              <button type="button" className={styles.moreItem} role="menuitem" onClick={() => void printKitchen(o.id)}>
                🧾 Print kitchen
              </button>
              {MSG_KINDS.map((k) => (
                <button type="button" className={styles.moreItem} role="menuitem" key={k} onClick={() => void share(o.id, k)}>
                  ✉ Msg: {MSG_LABEL[k]}
                </button>
              ))}
              <button type="button" className={styles.moreItem} role="menuitem">
                <a href={`/track/${o.trackToken}`} target="_blank" rel="noreferrer">
                  ↗ Track order
                </a>
              </button>
              {live && (
                <button
                  type="button"
                  className={`${styles.moreItem} ${styles.moreItemDanger}`}
                  role="menuitem"
                  onClick={() => openCancel(o.id)}
                >
                  ✕ Cancel / void
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Orders">
      <PrintSuccess
        kind={printKind}
        tenant={tenant}
        order={lastBillOrder}
        onDone={dismissPrint}
        onPrintAgain={async (order) => {
          if (!tenant) return;
          const chooser = await shouldOpenPrintChooser();
          if (chooser) {
            setPrintTarget({ order, kind: "bill" });
            setBridgeNote("");
          } else {
            await executeLocalPrint(tenant, order, "bill");
          }
        }}
      />
      {printTarget && (
        <PrintTargetChooser
          order={printTarget.order}
          kind={printTarget.kind}
          note={bridgeNote}
          onAndroid={() => void sendPrintToAndroid()}
          onBrowser={() => void printHereFromChooser()}
          onClose={() => setPrintTarget(null)}
        />
      )}
      <div className={styles.page} onClick={() => setOpenMore(null)}>
        <PrintBridgeBar />
        <div className={styles.toolbar}>
          <h2 className={styles.toolbarTitle}>Orders</h2>
          <div className={styles.seg} onClick={(e) => e.stopPropagation()}>
            {(["active", "completed", "all"] as const).map((t) => (
              <button
                type="button"
                key={t}
                className={`${styles.segBtn} ${tab === t ? styles.segOn : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "active" ? "Active" : t === "completed" ? "History" : "All"} · {counts[t]}
              </button>
            ))}
          </div>
        </div>

        {msg && <p className={styles.empty} style={{ marginBottom: "1rem" }}>{msg}</p>}

        {filtered.length === 0 ? (
          <p className={styles.empty}>
            {tab === "active"
              ? "No active orders right now — take one on POS or wait for a guest order."
              : tab === "completed"
              ? "No completed orders yet."
              : "No orders yet."}
          </p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((o) => {
              const paid = o.paymentStatus === "paid" || o.paymentStatus === "verified";
              const itemCount = o.lines.reduce((s, l) => s + l.qty, 0);
              const isNew = o.status === "placed";
              return (
                <article
                  key={o.id}
                  className={`${styles.card} ${isNew ? styles.cardNew : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.cardNum}>#{o.number}</span>
                    <span className={`${styles.statusPill} ${STATUS_CLASS[o.status]}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    <span className={styles.metaBadge}>
                      <span className={styles.chip}>{o.channel}</span>
                      <span>{o.serviceType}</span>
                    </span>
                    {o.tableNumber ? <span className={styles.metaBadge}>T{o.tableNumber}</span> : null}
                    {o.paymentProofUrl ? (
                      <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" className={styles.payProof}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={o.paymentProofUrl} alt="Payment proof" />
                        <span style={{ fontSize: "0.78rem" }}>Proof</span>
                      </a>
                    ) : null}
                  </div>

                  <div className={styles.customer}>
                    <span className={styles.customerName}>{o.customerName || "Walk-in guest"}</span>
                    <span className={styles.time}>{fmtTime(o.createdAt)}</span>
                  </div>

                  <div className={styles.items}>
                    <strong>{itemCount} item{itemCount !== 1 ? "s" : ""}</strong>
                    <ul className={styles.lines}>
                      {o.lines.slice(0, 3).map((l, i) => (
                        <li key={i} className={styles.line}>
                          <span>{l.qty}× {l.name}</span>
                        </li>
                      ))}
                    </ul>
                    {o.lines.length > 3 ? (
                      <span style={{ fontSize: "0.78rem" }}>+{o.lines.length - 3} more…</span>
                    ) : null}
                  </div>

                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>
                      {paid ? "Paid" : o.paymentStatus === "cod_pending" ? "COD pending" : o.paymentStatus}
                    </span>
                    <span className={styles.total}>{money(tenant?.shop.currency || "PKR", o.total)}</span>
                  </div>

                  {renderActions(o)}
                </article>
              );
            })}
          </div>
        )}

        {cancelId && (
          <div className={styles.cancelCard}>
            <strong>Cancel / void (not a refund)</strong>
            <p className={styles.muted} style={{ margin: "0 0 0.5rem" }}>
              Reason required. Guest track will show cancelled.
            </p>
            <input
              className={styles.cancelInput}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason e.g. customer left / kitchen error"
              autoFocus
            />
            <div className={styles.actions} style={{ marginTop: "0.6rem" }}>
              <button type="button" className={styles.primary} onClick={() => void cancelOrder()}>
                Confirm void
              </button>
              <button type="button" className={`${styles.primary} ${styles.primaryGhost}`} onClick={() => setCancelId(null)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
