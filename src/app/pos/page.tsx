"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { computeFees, lineUnitPrice, money } from "@/lib/fees";
import { customerReceiptHtml, openPrintWindow } from "@/lib/print";
import type { LineModifier, MenuItem, ModifierGroup, Order } from "@/lib/tenant-types";
import type { PaymentMethod } from "@/lib/types";
import styles from "../staff.module.css";

type CartLine = {
  key: string;
  item: MenuItem;
  qty: number;
  modifiers: LineModifier[];
  unitPrice: number;
};

function toMods(groups: ModifierGroup[], selected: Record<string, string[]>): LineModifier[] {
  const out: LineModifier[] = [];
  for (const g of groups) {
    for (const id of selected[g.id] || []) {
      const opt = g.options.find((o) => o.id === id);
      if (opt) {
        out.push({
          groupId: g.id,
          groupName: g.name,
          optionId: opt.id,
          optionName: opt.name,
          priceDelta: opt.priceDelta,
        });
      }
    }
  }
  return out;
}

export default function PosPage() {
  const { tenant, api, refresh } = useStore();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState("");
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});

  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const lines = cart.map((c) => ({
    itemId: c.item.id,
    name: c.item.name,
    qty: c.qty,
    unitPrice: c.unitPrice,
    modifiers: c.modifiers,
  }));
  const fees = useMemo(() => {
    if (!tenant) return null;
    return computeFees(tenant.shop, "counter", lines);
  }, [tenant, lines]);

  function startAdd(item: MenuItem) {
    if (!item.available) {
      setMsg(`${item.name} is 86 / unavailable`);
      return;
    }
    if (item.modifiers?.length) {
      const init: Record<string, string[]> = {};
      item.modifiers.forEach((g) => {
        init[g.id] = g.required && g.options[0] ? [g.options[0].id] : [];
      });
      setModSel(init);
      setModItem(item);
      return;
    }
    pushLine(item, []);
  }

  function pushLine(item: MenuItem, modifiers: LineModifier[]) {
    const unitPrice = lineUnitPrice(item.price, modifiers);
    const key = `${item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
    setCart((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key, item, qty: 1, modifiers, unitPrice }];
    });
  }

  async function checkout() {
    if (!cart.length || !tenant || !fees) return;
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
          basePrice: c.item.price,
          modifiers: c.modifiers,
          unitPrice: c.unitPrice,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Order #${data.order.number} placed`);
    openPrintWindow(customerReceiptHtml(tenant, data.order as Order));
    setCart([]);
    await refresh();
  }

  return (
    <AppShell title="POS">
      <div className={styles.page}>
        {lowStock.length > 0 && (
          <div className={styles.card} style={{ marginBottom: "0.75rem", borderColor: "#ffb020" }}>
            <strong>Low stock warning</strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity})`).join(" · ")} — POS still works
            </p>
          </div>
        )}
        <div className={styles.menuGrid}>
          {(tenant?.menu ?? []).map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.item}
              onClick={() => startAdd(m)}
              style={{ opacity: m.available ? 1 : 0.45 }}
            >
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
              <strong>
                {m.name}
                {!m.available ? " · 86" : ""}
              </strong>
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
              <li key={c.key}>
                {c.qty}× {c.item.name}
                {(c.modifiers || []).map((m) => (
                  <span key={m.optionId} className={styles.muted}>
                    {" "}
                    +{m.optionName}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {fees && tenant && (
            <div>
              <p className={styles.muted}>Subtotal {money(tenant.shop.currency, fees.subtotal)}</p>
              {fees.tax > 0 && (
                <p className={styles.muted}>Tax {money(tenant.shop.currency, fees.tax)}</p>
              )}
              <p>
                <strong>{money(tenant.shop.currency, fees.total)}</strong>
              </p>
            </div>
          )}
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

        {modItem && (
          <div className={styles.card} style={{ marginTop: "1rem" }}>
            <strong>Modifiers · {modItem.name}</strong>
            {(modItem.modifiers || []).map((g) => (
              <div key={g.id} style={{ marginTop: 8 }}>
                <div className={styles.muted}>
                  {g.name}
                  {g.required ? " *" : ""}
                </div>
                <div className={styles.row}>
                  {g.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={(modSel[g.id] || []).includes(o.id) ? styles.btn : styles.btnGhost}
                      onClick={() => {
                        setModSel((prev) => {
                          const cur = prev[g.id] || [];
                          if (g.multi) {
                            return {
                              ...prev,
                              [g.id]: cur.includes(o.id)
                                ? cur.filter((x) => x !== o.id)
                                : [...cur, o.id],
                            };
                          }
                          return { ...prev, [g.id]: [o.id] };
                        });
                      }}
                    >
                      {o.name}
                      {o.priceDelta ? ` +${o.priceDelta}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className={styles.row}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => {
                  pushLine(modItem, toMods(modItem.modifiers || [], modSel));
                  setModItem(null);
                }}
              >
                Add to cart
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => setModItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
