"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { MenuItem } from "@/lib/tenant-types";
import type { PaymentMethod, ServiceType } from "@/lib/types";
import styles from "./order.module.css";

type CartLine = { item: MenuItem; qty: number };

function money(currency: string, n: number) {
  const prefix = currency === "PKR" ? "Rs " : `${currency} `;
  return `${prefix}${n.toLocaleString()}`;
}

function paymentChoices(mode: ServiceType): { id: PaymentMethod; label: string }[] {
  if (mode === "table") return [{ id: "pay_at_counter", label: "Pay at counter" }];
  if (mode === "pickup") {
    return [
      { id: "pay_at_counter", label: "Pay at pickup" },
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
  const [category, setCategory] = useState("All");
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
    setPaymentMethod(paymentChoices(mode)[0].id);
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const categoryList = useMemo(() => {
    const cats = [...new Set(menu.map((m) => m.category))];
    return ["All", ...cats];
  }, [menu]);

  const visible = useMemo(() => {
    if (category === "All") return menu;
    return menu.filter((m) => m.category === category);
  }, [menu, category]);

  const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  function qtyOf(id: string) {
    return cart.find((c) => c.item.id === id)?.qty ?? 0;
  }

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
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>{branding?.name || "Restaurant"}</p>
        <h1 className={styles.title}>
          {mode === "table" ? `Table ${table || "—"}` : mode === "delivery" ? "Delivery" : "Pickup"}
        </h1>
        <p className={styles.tagline}>
          {mode === "table"
            ? "Scan · order · we bring it to your table"
            : mode === "delivery"
              ? "Order · we deliver to your door"
              : "Order · collect at the counter"}
        </p>
      </header>

      {!table && (
        <div className={styles.modes}>
          {(["pickup", "delivery"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? styles.modeOn : styles.mode}
              onClick={() => switchMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className={styles.cats}>
        {categoryList.map((c) => (
          <button
            key={c}
            type="button"
            className={category === c ? styles.catOn : styles.cat}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {visible.map((item, i) => {
          const q = qtyOf(item.id);
          return (
            <article
              key={item.id}
              className={styles.card}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <button type="button" className={styles.cardHit} onClick={() => addItem(item)}>
                <div className={styles.imgWrap}>
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className={styles.img} />
                  ) : (
                    <div className={styles.imgFallback}>{item.imageEmoji || "🍽️"}</div>
                  )}
                  {item.isDeal && item.dealLabel && (
                    <span className={styles.dealBadge}>{item.dealLabel}</span>
                  )}
                </div>
                <div className={styles.cardBody}>
                  <strong>{item.name}</strong>
                  <span className={styles.catLabel}>{item.category}</span>
                  <span className={styles.price}>{money(currency, item.price)}</span>
                </div>
              </button>
              <div className={styles.qtyBar}>
                <button type="button" onClick={() => removeItem(item.id)} aria-label="Remove">
                  −
                </button>
                <span>{q}</span>
                <button type="button" onClick={() => addItem(item)} aria-label="Add">
                  +
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {count > 0 && (
        <div className={styles.cartBar}>
          <button type="button" className={styles.cartInfo} onClick={() => setSheetOpen(true)}>
            <span className={styles.count}>{count}</span>
            <span>
              Your order · <strong>{money(currency, total)}</strong>
            </span>
          </button>
          <button type="button" className={styles.placeBtn} onClick={() => setSheetOpen(true)}>
            Place
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className={styles.sheet}>
          <button
            type="button"
            className={styles.sheetBg}
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
          />
          <div className={styles.sheetPanel}>
            <div className={styles.sheetHead}>
              <h3>Your order</h3>
              <button type="button" className={styles.closeX} onClick={() => setSheetOpen(false)}>
                ×
              </button>
            </div>
            <ul className={styles.cartList}>
              {cart.map((c) => (
                <li key={c.item.id}>
                  <span>
                    {c.qty}× {c.item.name}
                  </span>
                  <span>{money(currency, c.item.price * c.qty)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.clear} onClick={clearCart}>
              Clear cart
            </button>
            <div className={styles.pay}>
              <h4>Payment</h4>
              {paymentChoices(mode).map((p) => (
                <label key={p.id} className={styles.payOpt}>
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
              className={styles.confirm}
              disabled={busy || !cart.length}
              onClick={() => void placeOrder()}
            >
              {busy ? "Placing…" : `Place order · ${money(currency, total)}`}
            </button>
            <p className={styles.note}>After place, changes go through staff only.</p>
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
