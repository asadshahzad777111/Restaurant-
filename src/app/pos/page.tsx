"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PrintSuccess } from "@/components/PrintSuccess";
import { useStore } from "@/lib/store";
import { computeFees, lineUnitPrice, money } from "@/lib/fees";
import { PrintTargetChooser, PrintBridgeLamp } from "@/components/PrintTargetChooser";
import { PrintBridgeBar } from "@/components/PrintBridgeBar";
import { PosPrinterPanel } from "@/components/PosPrinterPanel";
import { enqueueSlip, executeLocalPrint, shouldOpenPrintChooser } from "@/lib/print-target";
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
  const { tenant, api, applyOrder } = useStore();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState("");
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});
  const [printKind, setPrintKind] = useState<"bill" | "kitchen" | null>(null);
  const [cat, setCat] = useState("All");
  const [posSearch, setPosSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [charging, setCharging] = useState(false);
  const [printChooser, setPrintChooser] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [bridgeNote, setBridgeNote] = useState("");
  const [pausedCart, setPausedCart] = useState<CartLine[] | null>(null);
  const [pausedMeta, setPausedMeta] = useState<{ name: string; phone: string; discount: string } | null>(null);
  const [androidOnline, setAndroidOnline] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const discountRef = useRef<HTMLInputElement | null>(null);
  const customerRef = useRef<HTMLInputElement | null>(null);
  const cashRef = useRef<HTMLInputElement | null>(null);

  const lowStock = (tenant?.stock ?? []).filter((s) => s.quantity <= s.lowThreshold);
  const categories = useMemo(() => {
    const set = new Set((tenant?.menu ?? []).map((m) => (m.isDeal ? "Deals" : m.category)));
    return ["All", ...[...set]];
  }, [tenant?.menu]);
  const visibleMenu = useMemo(() => {
    const all = tenant?.menu ?? [];
    let list = all;
    const q = posSearch.trim().toLowerCase();
    if (q) {
      list = all.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q),
      );
    } else if (cat === "All") list = all;
    else if (cat === "Deals") list = all.filter((m) => m.isDeal || m.category === "Deals");
    else list = all.filter((m) => !m.isDeal && m.category === cat);
    return list;
  }, [tenant?.menu, cat, posSearch]);
  const lines = useMemo(
    () =>
      cart.map((c) => ({
        itemId: c.item.id,
        name: c.item.name,
        qty: c.qty,
        unitPrice: c.unitPrice,
        modifiers: c.modifiers,
      })),
    [cart],
  );
  const discountStrNum = Math.max(0, Math.round(Number(discountStr) || 0));
  const fees = useMemo(() => {
    if (!tenant) return null;
    return computeFees(tenant.shop, "counter", lines, discountStrNum);
  }, [tenant, lines, discountStrNum]);

  const stockOf = useCallback((name: string) => {
    const hit = (tenant?.stock ?? []).find(
      (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    return hit ? hit.quantity : null;
  }, [tenant?.stock]);

  function startAdd(item: MenuItem) {
    if (!item.available) {
      setMsg(`${item.name} is 86 / unavailable`);
      return;
    }
    const avail = stockOf(item.name);
    if (avail !== null && avail <= 0) {
      setMsg(`${item.name} is out of stock (86)`);
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
    const avail = stockOf(item.name);
    setCart((prev) => {
      const curQty = prev.reduce((s, p) => (p.item.id === item.id ? s + p.qty : s), 0);
      if (avail !== null && curQty + 1 > avail) {
        setMsg(avail <= 0 ? `${item.name} is out of stock (86)` : `${item.name}: only ${avail} left`);
        return prev;
      }
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key, item, qty: 1, modifiers, unitPrice }];
    });
  }

  function bumpQty(key: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((p) => {
        if (p.key !== key) return [p];
        const qty = p.qty + delta;
        if (qty <= 0) return [];
        if (delta > 0) {
          const avail = stockOf(p.item.name);
          if (avail !== null) {
            const onOtherLines = prev
              .filter((x) => x.key !== key && x.item.id === p.item.id)
              .reduce((s, x) => s + x.qty, 0);
            if (onOtherLines + qty > avail) {
              setMsg(avail <= 0 ? `${p.item.name} is out of stock (86)` : `${p.item.name}: only ${avail} left`);
              return [p];
            }
          }
        }
        return [{ ...p, qty }];
      }),
    );
  }

  function qtyOf(itemId: string) {
    return cart.filter((c) => c.item.id === itemId).reduce((s, c) => s + c.qty, 0);
  }

  const discount = fees?.discount ?? 0;
  const billTotal = fees?.total ?? 0;
  const tendered = Math.round(Number(cashGiven) || 0);
  const change = pay === "cash" && tendered > 0 ? tendered - billTotal : null;
  // Block a cash sale only when the cashier typed an amount that's short.
  const cashShort = pay === "cash" && cashGiven.trim() !== "" && change !== null && change < 0;
  const canCharge =
    !charging && cart.length > 0 && customerName.trim() !== "" && !cashShort;

  async function checkout() {
    if (!cart.length || !tenant || !fees || charging) return;
    const name = customerName.trim();
    if (!name) {
      setMsg("Write the customer name, then Charge & print.");
      return;
    }
    setCharging(true);
    setMsg("");
    try {
      const res = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          channel: "pos",
          serviceType: "counter",
          paymentMethod: pay,
          customerName: name,
          customerPhone: customerPhone.trim() || undefined,
          note: note.trim() || undefined,
          discount: discount || undefined,
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((data as { error?: string }).error || "Failed");
        return;
      }
      const order = (data as { order: Order }).order;
      setMsg(`Order #${order.number} placed`);
      applyOrder(order);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
      setDiscountStr("");
      setCashGiven("");
      const chooser = await shouldOpenPrintChooser();
      if (chooser) {
        setPendingOrder(order);
        setPrintChooser(true);
        setBridgeNote("");
      } else {
        const printed = await executeLocalPrint(tenant, order, "bill");
        if (printed) setPrintKind("bill");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setCharging(false);
    }
  }

  async function sendToAndroidPrinter() {
    const order = pendingOrder;
    if (!order || !tenant) return;
    try {
      await enqueueSlip(tenant, order, "bill");
      setBridgeNote("");
      setPrintChooser(false);
      setPendingOrder(null);
      setPrintKind("bill");
    } catch {
      setBridgeNote("Could not queue the slip — print here or check the network.");
    }
  }

  async function printHere() {
    const order = pendingOrder;
    setPrintChooser(false);
    setPendingOrder(null);
    if (!order || !tenant) return;
    const printed = await executeLocalPrint(tenant, order, "bill");
    if (printed) setPrintKind("bill");
  }

  function pauseBill() {
    if (!cart.length) return;
    setPausedCart([...cart]);
    setPausedMeta({ name: customerName, phone: customerPhone, discount: discountStr });
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountStr("");
    setCashGiven("");
    setMsg("Bill held — tap Resume to continue");
  }

  function resumeBill() {
    if (!pausedCart) return;
    setCart(pausedCart);
    if (pausedMeta) {
      setCustomerName(pausedMeta.name);
      setCustomerPhone(pausedMeta.phone);
      setDiscountStr(pausedMeta.discount);
    }
    setPausedCart(null);
    setPausedMeta(null);
    setMsg("Bill restored");
  }

  const dismissPrint = useCallback(() => setPrintKind(null), []);

  return (
    <AppShell title="POS">
      <PrintSuccess kind={printKind} onDone={dismissPrint} />
      {printChooser && pendingOrder && (
        <PrintTargetChooser
          order={pendingOrder}
          kind="bill"
          note={bridgeNote}
          onAndroid={() => void sendToAndroidPrinter()}
          onBrowser={() => void printHere()}
          onClose={() => setPrintChooser(false)}
        />
      )}
      <div className={styles.page}>
        <PrintBridgeBar />
        <PosPrinterPanel compact />
        {lowStock.length > 0 && (
          <div className={styles.card} style={{ marginBottom: "0.75rem", borderColor: "#ffb020" }}>
            <strong>Low stock warning</strong>
            <p className={styles.muted}>
              {lowStock.map((s) => `${s.name} (${s.quantity})`).join(" · ")}
              {lowStock.some((s) => s.quantity <= 0)
                ? " — items at 0 stock are blocked (86)"
                : " — low warning; POS still works until 0"}
            </p>
          </div>
        )}
        <div className={styles.posLayout}>
          <div id="pos-items">
            <div className={styles.posSearchWrap}>
              <input
                ref={searchRef}
                className={styles.posSearch}
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                placeholder="🔍 Search items…"
                autoComplete="off"
              />
            </div>
            <div className={styles.catRow}>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cat === c ? styles.btn : styles.btnGhost}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className={styles.menuGrid}>
              {visibleMenu.length === 0 && (
                <p className={styles.muted} style={{ gridColumn: "1 / -1", padding: "1rem" }}>
                  No items in this category — add some under Menu.
                </p>
              )}
              {visibleMenu.map((m) => {
                const inCart = qtyOf(m.id);
                const isOff = !m.available;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.item} ${isOff ? styles.item86 : ""}`}
                    onClick={() => startAdd(m)}
                    style={{ opacity: m.available ? 1 : 0.55 }}
                  >
                    {isOff ? <span className={styles.item86Badge}>86</span> : null}
                    {inCart > 0 ? <span className={styles.itemQtyBadge}>{inCart}</span> : null}
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt="" loading="lazy" className={styles.itemImg} />
                    ) : (
                      <span className={styles.itemAvatar} aria-hidden>
                        {(m.imageEmoji || m.name.slice(0, 1) || "•").toUpperCase()}
                      </span>
                    )}
                    <strong>
                      {m.name}
                      {isOff ? " · 86" : ""}
                    </strong>
                    <span className={styles.muted}>
                      {tenant?.shop.currency} {m.price}
                    </span>
                  </button>
                );
              })}
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

          <div id="pos-charge-panel" className={`${styles.card} ${styles.posCart}`}>
            <div className={styles.posCartHead}>
              <strong>Bill</strong>
              {cart.length > 0 ? (
                <button type="button" className={styles.btnGhost} onClick={() => setCart([])}>
                  Clear
                </button>
              ) : null}
            </div>
            {cart.length === 0 && <p className={styles.muted}>Tap items to add. Use − / + to change qty.</p>}
            <ul className={styles.posCartList}>
              {cart.map((c) => (
                <li key={c.key} className={styles.posCartLine}>
                  <div className={styles.posCartMeta}>
                    <span className={styles.posCartName}>{c.item.name}</span>
                    {(c.modifiers || []).map((m) => (
                      <span key={m.optionId} className={styles.muted}>
                        {" "}
                        +{m.optionName}
                      </span>
                    ))}
                    {tenant ? (
                      <span className={styles.muted}>
                        {money(tenant.shop.currency, c.unitPrice * c.qty)}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.posQty}>
                    <button
                      type="button"
                      aria-label={`Remove one ${c.item.name}`}
                      onClick={() => bumpQty(c.key, -1)}
                    >
                      −
                    </button>
                    <span>{c.qty}</span>
                    <button
                      type="button"
                      aria-label={`Add one ${c.item.name}`}
                      onClick={() => bumpQty(c.key, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {fees && tenant && (
              <div>
                <p className={styles.muted}>Subtotal {money(tenant.shop.currency, fees.subtotal)}</p>
                {fees.serviceCharge > 0 && (
                  <p className={styles.muted}>
                    Service {money(tenant.shop.currency, fees.serviceCharge)}
                  </p>
                )}
                {fees.tax > 0 && (
                  <p className={styles.muted}>Tax {money(tenant.shop.currency, fees.tax)}</p>
                )}
                {discount > 0 && (
                  <p className={styles.muted}>Discount {money(tenant.shop.currency, discount)}</p>
                )}
                <p>
                  <strong>{money(tenant.shop.currency, billTotal)}</strong>
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
            </div>
            <div className={styles.posBillFields}>
              <label>
                Customer name
                <input
                  ref={customerRef}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in guest"
                  autoComplete="name"
                />
              </label>
              <label>
                Phone (optional)
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="03xx…"
                  inputMode="tel"
                />
              </label>
              <label>
                Note (optional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Less spicy, packing…"
                />
              </label>
              <label>
                Discount {tenant?.shop.currency} (optional)
                <input
                  ref={discountRef}
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  inputMode="numeric"
                />
              </label>
              {pay === "cash" ? (
                <label>
                  Cash received (optional)
                  <input
                    ref={cashRef}
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Amount given"
                    inputMode="numeric"
                  />
                </label>
              ) : null}
            </div>
            {change !== null && tenant && (
              <p className={styles.muted}>
                {change >= 0
                  ? `Change ${money(tenant.shop.currency, change)}`
                  : `Still due ${money(tenant.shop.currency, -change)}`}
              </p>
            )}
            <div className={styles.row}>
              {pausedCart ? (
                <button type="button" className={styles.btnGhost} onClick={resumeBill}>
                  ▶ Resume held bill ({pausedCart.length} items)
                </button>
              ) : (
                <button type="button" className={styles.btnGhost} disabled={!cart.length} onClick={pauseBill}>
                  ⏸ Pause / hold bill
                </button>
              )}
            </div>
            <div className={styles.row} style={{ alignItems: "center" }}>
              <button
                id="pos-charge-btn"
                type="button"
                className={styles.btn}
                disabled={!canCharge}
                onClick={() => void checkout()}
              >
                {charging ? "Charging…" : "Charge & print"}
              </button>
              <PrintBridgeLamp />
            </div>
            <p className={styles.muted}>
              Laptop / iPhone: Charge opens <b>Print to Android</b> (live green / red). If the Staff phone is
              off, the bill is queued and prints when the app is back.
            </p>
            {msg && <p className={styles.muted}>{msg}</p>}
          </div>
        </div>
      </div>
      {cart.length > 0 && (
        <div className={styles.posStickyBar}>
          <div className={styles.posStickyTop}>
            <strong className={styles.posStickyTotal}>
              {cart.length} item{cart.length === 1 ? "" : "s"} · {money(tenant?.shop.currency || "PKR", billTotal)}
            </strong>
          </div>
          <div className={styles.posActions}>
            <button
              type="button"
              className={styles.posAction}
              onClick={() => {
                document.getElementById("pos-items")?.scrollIntoView({ behavior: "smooth" });
                searchRef.current?.focus();
              }}
            >
              🧾 Items
            </button>
            <button type="button" className={styles.posAction} onClick={() => { searchRef.current?.focus(); }}>
              Search
            </button>
            <button
              type="button"
              className={styles.posAction}
              onClick={() => {
                document.getElementById("pos-charge-panel")?.scrollIntoView({ behavior: "smooth" });
                discountRef.current?.focus();
              }}
            >
              Discount
            </button>
            <button
              type="button"
              className={styles.posAction}
              onClick={() => {
                document.getElementById("pos-charge-panel")?.scrollIntoView({ behavior: "smooth" });
                customerRef.current?.focus();
              }}
            >
              Customer
            </button>
            <button
              type="button"
              className={styles.posAction}
              onClick={() => {
                document.getElementById("pos-charge-panel")?.scrollIntoView({ behavior: "smooth" });
                cashRef.current?.focus();
              }}
            >
              💵 Amount
            </button>
            <button
              type="button"
              className={`${styles.posAction} ${styles.posActionPrimary}`}
              onClick={() => {
                document.getElementById("pos-charge-panel")?.scrollIntoView({ behavior: "smooth" });
                const el = document.getElementById("pos-charge-btn");
                el?.focus();
                el?.click();
              }}
            >
              Confirm bill
            </button>
            <button
              type="button"
              className={`${styles.posAction} ${styles.posActionPrint} ${androidOnline ? styles.posPrintOn : ""}`}
              onClick={() => document.getElementById("pos-charge-panel")?.scrollIntoView({ behavior: "smooth" })}
            >
              🖨️ Print
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
