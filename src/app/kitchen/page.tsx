"use client";

import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { kitchenTicketHtml, openPrintWindow } from "@/lib/print";
import type { OrderStatus } from "@/lib/types";
import styles from "../staff.module.css";

const KITCHEN_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: "accepted",
  accepted: "preparing",
  preparing: "ready",
};

export default function KitchenPage() {
  const { tenant, api, refresh } = useStore();
  const tickets = (tenant?.orders ?? []).filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  );

  async function bump(id: string, status: OrderStatus) {
    const next = KITCHEN_NEXT[status];
    if (!next) return;
    await api(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    await refresh();
  }

  return (
    <AppShell title="Kitchen">
      <div className={styles.kitchen}>
        {tickets.map((o) => (
          <article key={o.id} className={styles.ticket}>
            <h3>
              #{o.number} · {o.status}
            </h3>
            <p className={styles.muted}>
              {o.serviceType}
              {o.tableNumber ? ` · Table ${o.tableNumber}` : ""}
            </p>
            <ul>
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
            <div className={styles.row}>
              {KITCHEN_NEXT[o.status] && (
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => void bump(o.id, o.status)}
                >
                  Mark {KITCHEN_NEXT[o.status]}
                </button>
              )}
              {tenant && (
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => openPrintWindow(kitchenTicketHtml(tenant, o))}
                >
                  Print ticket
                </button>
              )}
            </div>
          </article>
        ))}
        {tickets.length === 0 && <p className={styles.muted}>No open kitchen tickets</p>}
      </div>
    </AppShell>
  );
}
