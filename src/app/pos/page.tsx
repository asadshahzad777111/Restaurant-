"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { MenuItem } from "@/lib/tenant-types";
import type { PaymentMethod } from "@/lib/types";
import styles from "../staff.module.css";

export default function PosPage() {
  const { tenant, api, refresh } = useStore();
  const [cart, setCart] = useState<{ item: MenuItem; qty: number }[]>([]);
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState("");

  const total = useMemo(
    () => cart.reduce((s, c) => s + c.item.price * c.qty, 0),
    [cart],
  );

  function add(item: MenuItem) {
    setCart((prev) => {
      const hit = prev.find((p) => p.item.id === item.id);
      if (hit) return prev.map((p) => (p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { item, qty: 1 }];
    });
  }

  async function checkout() {
    if (!cart.length) return;
    const res = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        channel: "pos",
        serviceType: "counter",
        paymentMethod: pay,
        lines: cart.map((c) => ({
          itemId: c.item.id,
          name: c.item.name,
          qty: c.qty,
          unitPrice: c.item.price,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Order #${data.order.number} placed`);
    setCart([]);
    await refresh();
    printReceipt(data.order.number, cart, total);
  }

  function printReceipt(
    number: number,
    lines: { item: MenuItem; qty: number }[],
    sum: number,
  ) {
    const w = window.open("", "_blank", "width=360,height=560");
    if (!w || !tenant) return;
    const logo = tenant.branding.logoUrl
      ? `<img src="${tenant.branding.logoUrl}" style="max-width:80px;margin:0 auto;display:block"/>`
      : "";
    w.document.write(`<!doctype html><html><body style="font-family:monospace;padding:12px">
      ${logo}
      <h2 style="text-align:center">${tenant.branding.name}</h2>
      <p style="text-align:center">Order #${number}</p>
      <hr/>
      ${lines.map((l) => `<div>${l.qty} x ${l.item.name} — ${tenant.shop.currency} ${l.item.price * l.qty}</div>`).join("")}
      <hr/>
      <strong>Total ${tenant.shop.currency} ${sum}</strong>
      <p>${tenant.branding.receiptFooter}</p>
      <script>window.print()</script>
    </body></html>`);
    w.document.close();
  }

  return (
    <AppShell title="POS">
      <div className={styles.page}>
        <div className={styles.menuGrid}>
          {(tenant?.menu ?? [])
            .filter((m) => m.available)
            .map((m) => (
              <button key={m.id} type="button" className={styles.item} onClick={() => add(m)}>
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.imageUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginBottom: 6,
                    }}
                  />
                ) : null}
                <strong>{m.name}</strong>
                <span className={styles.muted}>
                  {tenant?.shop.currency} {m.price}
                </span>
              </button>
            ))}
        </div>
        <div className={styles.card} style={{ marginTop: "1rem" }}>
          <strong>Cart</strong>
          {cart.length === 0 && <p className={styles.muted}>Tap items to add</p>}
          <ul>
            {cart.map((c) => (
              <li key={c.item.id}>
                {c.qty}× {c.item.name}
              </li>
            ))}
          </ul>
          <p>
            <strong>
              {tenant?.shop.currency} {total}
            </strong>
          </p>
          <div className={styles.row}>
            {(["cash", "card", "wallet"] as PaymentMethod[]).map((p) => (
              <button
                key={p}
                type="button"
                className={pay === p ? styles.btn : styles.btnGhost}
                onClick={() => setPay(p)}
              >
                {p}
              </button>
            ))}
            <button type="button" className={styles.btn} onClick={() => void checkout()}>
              Charge
            </button>
          </div>
          {msg && <p className={styles.muted}>{msg}</p>}
        </div>
      </div>
    </AppShell>
  );
}
