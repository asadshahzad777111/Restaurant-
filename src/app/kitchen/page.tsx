"use client";

import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrintSuccess } from "@/components/PrintSuccess";
import { useStore } from "@/lib/store";
import { printKitchenTicket } from "@/lib/print";
import type { OrderStatus } from "@/lib/types";
import type { Order } from "@/lib/tenant-types";
import styles from "../staff.module.css";

const KITCHEN_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

const LANES: { status: OrderStatus; title: string }[] = [
  { status: "placed", title: "New" },
  { status: "accepted", title: "Accepted" },
  { status: "preparing", title: "On the pass" },
  { status: "ready", title: "Ready" },
];

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function ticketClass(status: string) {
  if (status === "placed") return `${styles.ticket} ${styles.ticket_placed}`;
  if (status === "accepted") return `${styles.ticket} ${styles.ticket_accepted}`;
  if (status === "preparing") return `${styles.ticket} ${styles.ticket_preparing}`;
  if (status === "ready") return `${styles.ticket} ${styles.ticket_ready}`;
  return styles.ticket;
}

export default function KitchenPage() {
  const { tenant, api, applyOrder } = useStore();
  const [printKind, setPrintKind] = useState<"bill" | "kitchen" | null>(null);
  const tickets = (tenant?.orders ?? []).filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  );
  const byLane = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const lane of LANES) map[lane.status] = [];
    const extra: Order[] = [];
    for (const o of tickets) {
      if (map[o.status]) map[o.status].push(o);
      else extra.push(o);
    }
    return { map, extra };
  }, [tickets]);

  async function bump(id: string, status: OrderStatus) {
    const next = KITCHEN_NEXT[status];
    if (!next) return;
    const res = await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (res.ok && data.order) applyOrder(data.order, { tables: data.tables });
  }

  const dismissPrint = useCallback(() => setPrintKind(null), []);

  function ticketCard(o: Order) {
    return (
      <article key={o.id} className={ticketClass(o.status)}>
        <h3>
          #{o.number}
          <span className={styles.ticketTime}>{ago(o.createdAt)}</span>
        </h3>
        <p className={styles.muted}>
          {o.serviceType}
          {o.tableNumber ? ` · Table ${o.tableNumber}` : ""}
          {o.customerName ? ` · ${o.customerName}` : ""}
        </p>
        <ul className={styles.ticketLines}>
          {o.lines.map((l, i) => (
            <li key={i}>
              <strong>
                {l.qty}× {l.name}
              </strong>
              {(l.modifiers || []).map((m) => (
                <div key={m.optionId} className={styles.muted}>
                  · {m.optionName}
                </div>
              ))}
              {l.lineNote && <div className={styles.muted}>NOTE: {l.lineNote}</div>}
            </li>
          ))}
        </ul>
        {o.note && <p className={styles.muted}>NOTE: {o.note}</p>}
        <div className={styles.row}>
          {KITCHEN_NEXT[o.status] && (
            <button type="button" className={styles.btn} onClick={() => void bump(o.id, o.status)}>
              Mark {KITCHEN_NEXT[o.status]}
            </button>
          )}
          {tenant && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() =>
                void printKitchenTicket(tenant, o).then((ok) => {
                  if (ok) setPrintKind("kitchen");
                })
              }
            >
              Print ticket
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <AppShell title="Kitchen">
      <PrintSuccess kind={printKind} onDone={dismissPrint} />
      {tickets.length === 0 ? (
        <p className={styles.muted}>No open kitchen tickets</p>
      ) : (
        <div className={styles.kitchenBoard}>
          {LANES.map((lane) => (
            <section key={lane.status} className={styles.lane}>
              <header className={styles.laneHead}>
                <h2>{lane.title}</h2>
                <span>{byLane.map[lane.status]?.length || 0}</span>
              </header>
              <div className={styles.laneStack}>{(byLane.map[lane.status] || []).map(ticketCard)}</div>
            </section>
          ))}
          {byLane.extra.map(ticketCard)}
        </div>
      )}
    </AppShell>
  );
}
