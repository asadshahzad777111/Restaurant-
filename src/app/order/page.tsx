"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { LineModifier, MenuItem, ModifierGroup } from "@/lib/tenant-types";
import type { PaymentMethod, ServiceType } from "@/lib/types";
import { computeFees, lineUnitPrice, money } from "@/lib/fees";
import { LANG_KEY, dual, type Lang } from "@/lib/i18n";
import styles from "./order.module.css";

type CartLine = {
  key: string;
  item: MenuItem;
  qty: number;
  modifiers: LineModifier[];
  unitPrice: number;
};

type ShopFees = {
  currency: string;
  deliveryFee: number;
  packingFee: number;
  serviceChargePercent: number;
  taxRate: number;
};

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

function toLineModifiers(
  groups: ModifierGroup[],
  selected: Record<string, string[]>,
): LineModifier[] {
  const out: LineModifier[] = [];
  for (const g of groups) {
    for (const optId of selected[g.id] || []) {
      const opt = g.options.find((o) => o.id === optId);
      if (!opt) continue;
      out.push({
        groupId: g.id,
        groupName: g.name,
        optionId: opt.id,
        optionName: opt.name,
        priceDelta: opt.priceDelta,
      });
    }
  }
  return out;
}

function OrderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tenantCode = (params.get("tenant") || "DEMO").toUpperCase();
  const table = params.get("table") || undefined;
  const modeParam = params.get("mode") as ServiceType | null;

  const initialMode: ServiceType = table ? "table" : modeParam || "pickup";
  const [mode, setMode] = useState<ServiceType>(initialMode);
  const [lang, setLang] = useState<Lang>("en");
  const [branding, setBranding] = useState<{ name: string; logoUrl: string } | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [shop, setShop] = useState<ShopFees>({
    currency: "PKR",
    deliveryFee: 0,
    packingFee: 0,
    serviceChargePercent: 0,
    taxRate: 0,
  });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});
  const [category, setCategory] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_counter");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved === "en" || saved === "ur") setLang(saved);
  }, []);

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
        setShop({
          currency: d.public.shop.currency,
          deliveryFee: d.public.shop.deliveryFee || 0,
          packingFee: d.public.shop.packingFee || 0,
          serviceChargePercent: d.public.shop.serviceChargePercent || 0,
          taxRate: d.public.shop.taxRate || 0,
        });
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

  const orderLines = cart.map((c) => ({
    itemId: c.item.id,
    name: c.item.name,
    qty: c.qty,
    unitPrice: c.unitPrice,
    modifiers: c.modifiers,
  }));
  const fees = computeFees(
    {
      address: "",
      phone: "",
      whatsapp: "",
      currency: shop.currency,
      openHours: "",
      taxRate: shop.taxRate,
      deliveryFee: shop.deliveryFee,
      packingFee: shop.packingFee,
      serviceChargePercent: shop.serviceChargePercent,
    },
    mode,
    orderLines,
  );
  const count = cart.reduce((s, c) => s + c.qty, 0);

  function setLanguage(l: Lang) {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  }

  function openAdd(item: MenuItem) {
    if (item.modifiers?.length) {
      const init: Record<string, string[]> = {};
      for (const g of item.modifiers) {
        if (g.required && !g.multi && g.options[0]) init[g.id] = [g.options[0].id];
        else init[g.id] = [];
      }
      setModSel(init);
      setModItem(item);
      return;
    }
    addConfigured(item, []);
  }

  function addConfigured(item: MenuItem, modifiers: LineModifier[]) {
    const unitPrice = lineUnitPrice(item.price, modifiers);
    const key = `${item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
    setCart((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key, item, qty: 1, modifiers, unitPrice }];
    });
    setToast(`Added ${item.name}`);
    setModItem(null);
  }

  function removeKey(key: string) {
    setCart((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (!hit) return prev;
      setToast(`Removed ${hit.item.name}`);
      if (hit.qty <= 1) return prev.filter((p) => p.key !== key);
      return prev.map((p) => (p.key === key ? { ...p, qty: p.qty - 1 } : p));
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

  function toggleMod(group: ModifierGroup, optId: string) {
    setModSel((prev) => {
      const cur = prev[group.id] || [];
      if (group.multi) {
        return {
          ...prev,
          [group.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId],
        };
      }
      return { ...prev, [group.id]: [optId] };
    });
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
          basePrice: c.item.price,
          modifiers: c.modifiers,
          unitPrice: c.unitPrice,
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
      <div className={styles.langRow}>
        <button
          type="button"
          className={lang === "en" ? styles.langOn : styles.lang}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={lang === "ur" ? styles.langOn : styles.lang}
          onClick={() => setLanguage("ur")}
        >
          Roman Urdu
        </button>
      </div>

      <header className={styles.header}>
        <p className={styles.brand}>{branding?.name || "Restaurant"}</p>
        <h1 className={styles.title}>
          {mode === "table"
            ? `${dual("table", lang)} ${table || "—"}`
            : dual(mode === "delivery" ? "delivery" : "pickup", lang)}
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
              {dual(m, lang)}
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
            {c === "All" ? dual("all", lang) : c}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {visible.map((item, i) => (
          <article
            key={item.id}
            className={styles.card}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <button type="button" className={styles.cardHit} onClick={() => openAdd(item)}>
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
                <span className={styles.price}>{money(shop.currency, item.price)}</span>
              </div>
            </button>
          </article>
        ))}
      </div>

      {count > 0 && (
        <div className={styles.cartBar}>
          <button type="button" className={styles.cartInfo} onClick={() => setSheetOpen(true)}>
            <span className={styles.count}>{count}</span>
            <span>
              {dual("yourOrder", lang)} · <strong>{money(shop.currency, fees.total)}</strong>
            </span>
          </button>
          <button type="button" className={styles.placeBtn} onClick={() => setSheetOpen(true)}>
            {dual("place", lang)}
          </button>
        </div>
      )}

      {modItem && (
        <div className={styles.sheet}>
          <button type="button" className={styles.sheetBg} onClick={() => setModItem(null)} />
          <div className={styles.sheetPanel}>
            <div className={styles.sheetHead}>
              <h3>{modItem.name}</h3>
              <button type="button" className={styles.closeX} onClick={() => setModItem(null)}>
                ×
              </button>
            </div>
            {(modItem.modifiers || []).map((g) => (
              <div key={g.id} className={styles.pay}>
                <h4>
                  {g.name}
                  {g.required ? " *" : ""}
                </h4>
                {g.options.map((o) => (
                  <label key={o.id} className={styles.payOpt}>
                    <input
                      type={g.multi ? "checkbox" : "radio"}
                      checked={(modSel[g.id] || []).includes(o.id)}
                      onChange={() => toggleMod(g, o.id)}
                    />
                    {o.name}
                    {o.priceDelta ? ` (+${o.priceDelta})` : ""}
                  </label>
                ))}
              </div>
            ))}
            <button
              type="button"
              className={styles.confirm}
              onClick={() =>
                addConfigured(modItem, toLineModifiers(modItem.modifiers || [], modSel))
              }
            >
              Add ·{" "}
              {money(
                shop.currency,
                lineUnitPrice(
                  modItem.price,
                  toLineModifiers(modItem.modifiers || [], modSel),
                ),
              )}
            </button>
          </div>
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
              <h3>{dual("yourOrder", lang)}</h3>
              <button type="button" className={styles.closeX} onClick={() => setSheetOpen(false)}>
                ×
              </button>
            </div>
            <ul className={styles.cartList}>
              {cart.map((c) => (
                <li key={c.key}>
                  <span>
                    {c.qty}× {c.item.name}
                    {(c.modifiers || []).map((m) => (
                      <small key={m.optionId} style={{ display: "block", color: "#8a8790" }}>
                        + {m.optionName}
                      </small>
                    ))}
                  </span>
                  <span>
                    {money(shop.currency, c.unitPrice * c.qty)}
                    <button type="button" className={styles.clear} onClick={() => removeKey(c.key)}>
                      −
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.cartList}>
              <li>
                <span>Subtotal</span>
                <span>{money(shop.currency, fees.subtotal)}</span>
              </li>
              {fees.packingFee > 0 && (
                <li>
                  <span>Packing</span>
                  <span>{money(shop.currency, fees.packingFee)}</span>
                </li>
              )}
              {fees.deliveryFee > 0 && (
                <li>
                  <span>Delivery</span>
                  <span>{money(shop.currency, fees.deliveryFee)}</span>
                </li>
              )}
              {fees.serviceCharge > 0 && (
                <li>
                  <span>Service</span>
                  <span>{money(shop.currency, fees.serviceCharge)}</span>
                </li>
              )}
              {fees.tax > 0 && (
                <li>
                  <span>GST/Tax</span>
                  <span>{money(shop.currency, fees.tax)}</span>
                </li>
              )}
              <li>
                <strong>Total</strong>
                <strong>{money(shop.currency, fees.total)}</strong>
              </li>
            </div>
            <button type="button" className={styles.clear} onClick={clearCart}>
              {dual("clearCart", lang)}
            </button>
            <div className={styles.pay}>
              <h4>{dual("payment", lang)}</h4>
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
              {busy
                ? "…"
                : `${dual("placeOrder", lang)} · ${money(shop.currency, fees.total)}`}
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
