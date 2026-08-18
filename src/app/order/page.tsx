"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { MenuItem } from "@/lib/tenant-types";
import type { PaymentMethod, ServiceType } from "@/lib/types";
import styles from "./order.module.css";

type CartLine = { item: MenuItem; qty: number };

function paymentChoices(mode: ServiceType): { id: PaymentMethod; label: string }[] {
  if (mode === "table") return [{ id: "pay_at_counter", label: "Pay at counter" }];
  if (mode === "pickup") {
    return [
      { id: "pay_at_counter", label: "Pay at counter" },
      { id: "paid_in_advance", label: "Paid in advance" },
    ];
  }
  if (mode === "delivery") {
    return [
      { id: "cod", label: "Cash on delivery" },
      { id: "paid_in_advance", label: "Paid in advance" },
    ];
  }
  return [{ id: "cash", label: "Cash" }];
}

function OrderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tenantCode = (params.get("tenant") || "DEMO").toUpperCase();
  const table = params.get("table") || undefined;
  const modeParam = params.get("mode") as ServiceType | null;

  const initialMode: ServiceType = table ? "table" : modeParam || "pickup";
  const [mode, setMode] = useState<ServiceType>(initialMode);
  const [branding, setBranding] = useState<{ name: string; logoUrl: string } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [currency, setCurrency] = useState("PKR");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_counter");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/state?tenant=${tenantCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setBranding(d.public.branding);
        setMenu(d.public.menu);
        setCurrency(d.public.shop.currency);
      });
  }, [tenantCode]);

  useEffect(() => {
    const choices = paymentChoices(mode);
    setPaymentMethod(choices[0].id);
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const deals = useMemo(() => menu.filter((m) => m.isDeal), [menu]);
  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    menu
      .filter((m) => !m.isDeal)
      .forEach((m) => {
        const list = map.get(m.category) || [];
        list.push(m);
        map.set(m.category, list);
      });
    return [...map.entries()];
  }, [menu]);

  const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const hit = prev.find((p) => p.item.id === item.id);
      if (hit) return prev.map((p) => (p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { item, qty: 1 }];
    });
    setToast(`Added ${item.name}`);
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      const hit = prev.find((p) => p.item.id === itemId);
      if (!hit) return prev;
      setToast(`Removed ${hit.item.name}`);
      if (hit.qty <= 1) return prev.filter((p) => p.item.id !== itemId);
      return prev.map((p) => (p.item.id === itemId ? { ...p, qty: p.qty - 1 } : p));
    });
  }

  function clearCart() {
    if (!cart.length) return;
    if (!confirm("Clear the cart?")) return;
    setCart([]);
    setToast("Cart cleared");
  }

  function switchMode(next: ServiceType) {
    if (cart.length && next !== mode) {
      if (!confirm("Switching mode keeps your cart. Continue?")) return;
    }
    setMode(next);
  }

  async function placeOrder() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantCode,
        channel: "guest",
        serviceType: mode,
        tableNumber: mode === "table" ? table || "1" : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        deliveryAddress: mode === "delivery" ? deliveryAddress : undefined,
        paymentMethod,
        lines: cart.map((c) => ({
          itemId: c.item.id,
          name: c.item.name,
          qty: c.qty,
          unitPrice: c.item.price,
        })),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Order failed");
      return;
    }
    router.push(`/track/${data.order.trackToken}`);
  }

  if (error && !branding) {
    return <div className={styles.page}><p className={styles.error}>{error}</p></div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt="" className={styles.logo} />
        ) : (
          <div className={styles.mark}>{branding?.name?.slice(0, 1) || "R"}</div>
        )}
        <div>
          <h1>{branding?.name || "Restaurant"}</h1>
          <p>
            {mode === "table" ? `Table ${table || "—"}` : mode} · {tenantCode}
          </p>
        </div>
      </header>

      {!table && (
        <div className={styles.modes}>
          {(["pickup", "delivery"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? styles.modeActive : styles.mode}
              onClick={() => switchMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {deals.length > 0 && (
        <section className={styles.deals}>
          <h2>Deals</h2>
          <div className={styles.dealRail}>
            {deals.map((d) => (
              <button key={d.id} type="button" className={styles.deal} onClick={() => addItem(d)}>
                <span className={styles.emoji}>{d.imageEmoji || "🔥"}</span>
                <strong>{d.name}</strong>
                {d.dealLabel && <em>{d.dealLabel}</em>}
                <span className={styles.price}>
                  {currency} {d.price}
                  {d.compareAtPrice ? <s>{d.compareAtPrice}</s> : null}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.map(([cat, items]) => (
        <section key={cat} className={styles.cat}>
          <h2>{cat}</h2>
          <div className={styles.grid}>
            {items.map((item) => (
              <article key={item.id} className={styles.tile}>
                <div className={styles.tileTop}>
                  <span className={styles.emoji}>{item.imageEmoji || "🍽️"}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.tileBottom}>
                  <span>
                    {currency} {item.price}
                  </span>
                  <div className={styles.qty}>
                    <button type="button" onClick={() => removeItem(item.id)}>
                      −
                    </button>
                    <button type="button" onClick={() => addItem(item)}>
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {count > 0 && (
        <button type="button" className={styles.cartBar} onClick={() => setSheetOpen(true)}>
          <span>{count} items</span>
          <strong>
            View cart · {currency} {total}
          </strong>
        </button>
      )}

      {sheetOpen && (
        <div className={styles.sheet}>
          <div className={styles.sheetPanel}>
            <div className={styles.sheetHead}>
              <h3>Your order</h3>
              <button type="button" onClick={() => setSheetOpen(false)}>
                Close
              </button>
            </div>
            <ul className={styles.cartList}>
              {cart.map((c) => (
                <li key={c.item.id}>
                  <span>
                    {c.qty}× {c.item.name}
                  </span>
                  <span>
                    {currency} {c.item.price * c.qty}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.clear} onClick={clearCart}>
              Clear cart
            </button>
            <div className={styles.pay}>
              <h4>Payment</h4>
              {paymentChoices(mode).map((p) => (
                <label key={p.id}>
                  <input
                    type="radio"
                    name="pay"
                    checked={paymentMethod === p.id}
                    onChange={() => setPaymentMethod(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            {(mode === "pickup" || mode === "delivery") && (
              <div className={styles.fields}>
                <input
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                {mode === "delivery" && (
                  <textarea
                    placeholder="Delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                  />
                )}
              </div>
            )}
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="button"
              className={styles.place}
              disabled={busy || !cart.length}
              onClick={() => void placeOrder()}
            >
              {busy ? "Placing…" : `Place order · ${currency} ${total}`}
            </button>
            <p className={styles.note}>After submit, changes go through staff only.</p>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Loading menu…</div>}>
      <OrderInner />
    </Suspense>
  );
}
