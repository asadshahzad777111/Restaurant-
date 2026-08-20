"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LineModifier, MenuItem, ModifierGroup, TenantPayments, TenantSpecialOffer } from "@/lib/tenant-types";
import type { AdvanceRail, PaymentMethod, ServiceType } from "@/lib/types";
import { lineUnitPrice } from "@/lib/fees";
import {
  LAST_GUEST_TENANT_KEY,
  assertOrderRules,
  cartStorageKey,
  guestOrderPath,
  modeLabel,
  type GuestMode,
} from "@/lib/guest";
import { enabledAdvanceRails, normalizeTenantPayments, paymentChoicesFor } from "@/lib/payments";
import { GuestSpecialOfferPopup } from "@/components/GuestSpecialOfferPopup";
import { isCustomerShell, readLockedCustomerTenant } from "@/lib/app-shell";
import {
  backdropTransition,
  emptyState,
  listContainer,
  listItem,
  pageEnter,
  sheetTransition,
  toastTransition,
  useIsCoarsePointer,
  usePrefersReducedMotion,
  viewOnce,
} from "@/lib/motion";
import styles from "./order.module.css";

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

function normalizeCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = row as Partial<CartLine> & { item?: MenuItem; qty?: number };
      if (!r?.item?.id || !r.qty) return null;
      const modifiers = Array.isArray(r.modifiers) ? r.modifiers : [];
      const unitPrice =
        typeof r.unitPrice === "number" ? r.unitPrice : lineUnitPrice(r.item.price, modifiers);
      const key =
        r.key ||
        `${r.item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
      return { key, item: r.item, qty: r.qty, modifiers, unitPrice };
    })
    .filter(Boolean) as CartLine[];
}

type PublicShop = {
  address: string;
  phone: string;
  currency: string;
  openHours: string;
};

function qtyOf(cart: CartLine[], id: string) {
  return cart.filter((c) => c.item.id === id).reduce((s, c) => s + c.qty, 0);
}

function CheckoutForm({
  mode,
  table,
  currency,
  total,
  paymentMethod,
  setPaymentMethod,
  payments,
  advanceRail,
  setAdvanceRail,
  paymentProofUrl,
  onUploadProof,
  proofBusy,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  deliveryAddress,
  setDeliveryAddress,
  note,
  setNote,
  paidAck,
  setPaidAck,
  error,
  busy,
  onPlace,
  onClear,
  cart,
}: {
  mode: ServiceType;
  table?: string;
  currency: string;
  total: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  payments: TenantPayments;
  advanceRail: AdvanceRail | "";
  setAdvanceRail: (r: AdvanceRail | "") => void;
  paymentProofUrl: string;
  onUploadProof: (file: File) => void;
  proofBusy: boolean;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  paidAck: boolean;
  setPaidAck: (v: boolean) => void;
  error: string;
  busy: boolean;
  onPlace: () => void;
  onClear: () => void;
  cart: CartLine[];
}) {
  const pays = paymentChoicesFor(mode, payments);
  const rails = enabledAdvanceRails(payments);
  const selectedRail = rails.find((r) => r.id === advanceRail);

  return (
    <div className={styles.checkout}>
      <ul className={styles.cartList}>
        {cart.map((c) => (
          <li key={c.key}>
            <span>
              {c.qty}× {c.item.name}
              {(c.modifiers || []).map((m) => (
                <em key={m.optionId} className={styles.muted}>
                  {" "}
                  +{m.optionName}
                  {m.priceDelta ? ` (${m.priceDelta > 0 ? "+" : ""}${m.priceDelta})` : ""}
                </em>
              ))}
            </span>
            <span>
              {currency} {c.unitPrice * c.qty}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.clear} onClick={onClear}>
        Clear cart
      </button>

      <fieldset className={styles.pay}>
        <legend>Payment</legend>
        {pays.map((p) => (
          <label key={p.id} className={paymentMethod === p.id ? styles.payOn : styles.payOff}>
            <input
              type="radio"
              name="pay"
              checked={paymentMethod === p.id}
              onChange={() => {
                setPaymentMethod(p.id);
                if (p.id !== "paid_in_advance") setAdvanceRail("");
              }}
            />
            <span>
              <strong>{p.label}</strong>
              <em>{p.hint}</em>
            </span>
          </label>
        ))}
      </fieldset>

      {paymentMethod === "paid_in_advance" && (
        <div className={styles.advanceBlock}>
          <p className={styles.muted}>Transfer to one of these accounts, then upload your screenshot.</p>
          {rails.length === 0 ? (
            <p className={styles.error}>Admin has not published transfer details yet.</p>
          ) : (
            <fieldset className={styles.pay}>
              <legend>Pay via</legend>
              {rails.map(({ id, account }) => (
                <label key={id} className={advanceRail === id ? styles.payOn : styles.payOff}>
                  <input
                    type="radio"
                    name="rail"
                    checked={advanceRail === id}
                    onChange={() => setAdvanceRail(id)}
                  />
                  <span>
                    <strong>{account.title || id}</strong>
                    <em>
                      {[account.accountName, account.accountNumber, account.bankName, account.iban]
                        .filter(Boolean)
                        .join(" · ")}
                    </em>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {selectedRail && (
            <div className={styles.railDetails}>
              {selectedRail.account.accountName && (
                <p>
                  <span>Name</span> {selectedRail.account.accountName}
                </p>
              )}
              {selectedRail.account.accountNumber && (
                <p>
                  <span>Number</span> {selectedRail.account.accountNumber}
                </p>
              )}
              {selectedRail.account.bankName && (
                <p>
                  <span>Bank</span> {selectedRail.account.bankName}
                </p>
              )}
              {selectedRail.account.iban && (
                <p>
                  <span>IBAN</span> {selectedRail.account.iban}
                </p>
              )}
            </div>
          )}
          <label className={styles.proofUpload}>
            Payment screenshot
            <input
              type="file"
              accept="image/*"
              disabled={proofBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onUploadProof(file);
              }}
            />
          </label>
          {proofBusy && <p className={styles.muted}>Uploading screenshot…</p>}
          {paymentProofUrl ? (
            <p className={styles.proofOk}>
              Screenshot attached.{" "}
              <a href={paymentProofUrl} target="_blank" rel="noreferrer">
                Preview
              </a>
            </p>
          ) : (
            <p className={styles.muted}>Screenshot required before placing an advance order.</p>
          )}
          <label className={styles.ack}>
            <input type="checkbox" checked={paidAck} onChange={(e) => setPaidAck(e.target.checked)} />
            I transferred the amount to the account above.
          </label>
        </div>
      )}

      {(mode === "pickup" || mode === "delivery") && (
        <div className={styles.fields}>
          <label>
            Name
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label>
            Phone {mode === "delivery" ? "(required)" : ""}
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required={mode === "delivery"}
            />
          </label>
          {mode === "delivery" && (
            <label>
              Delivery address
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                required
              />
            </label>
          )}
        </div>
      )}

      {mode === "table" && (
        <p className={styles.note}>Dining at table {table}. Pay at the counter when staff asks.</p>
      )}

      <label className={styles.noteField}>
        Kitchen note
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </label>

      {error && <p className={styles.error}>{error}</p>}
      <button type="button" className={styles.place} disabled={busy || !cart.length} onClick={onPlace}>
        {busy ? "Placing…" : `Place order · ${currency} ${total}`}
      </button>
    </div>
  );
}

function OrderInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tenantCode = (params.get("tenant") || "").toUpperCase();
  const table = (params.get("table") || "").trim();
  const modeParam = params.get("mode");

  const mode: ServiceType | null = table
    ? "table"
    : modeParam === "pickup" || modeParam === "delivery" || modeParam === "table"
      ? modeParam
      : null;

  const needsTable = mode === "table" && !table;
  const showMenu = Boolean(mode) && !needsTable;

  const [branding, setBranding] = useState<{ name: string; logoUrl: string } | null>(null);
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [payments, setPayments] = useState<TenantPayments>(() => normalizeTenantPayments(null));
  const [specialOffer, setSpecialOffer] = useState<TenantSpecialOffer | null>(null);
  const [orderingClosed, setOrderingClosed] = useState(false);
  const [billingPastDue, setBillingPastDue] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pay_at_counter");
  const [advanceRail, setAdvanceRail] = useState<AdvanceRail | "">("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [proofBusy, setProofBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [note, setNote] = useState("");
  const [paidAck, setPaidAck] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tableDraft, setTableDraft] = useState("");
  const [cartReady, setCartReady] = useState(false);
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});
  const [flyers, setFlyers] = useState<
    Array<{ id: number; x: number; y: number; tx: number; ty: number; src?: string; letter: string }>
  >([]);
  const cartBarRef = useRef<HTMLButtonElement | null>(null);
  const flyerId = useRef(0);
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const enter = pageEnter(reduced, coarse);
  const empty = emptyState(reduced);
  const itemVar = listItem(reduced, coarse);

  useEffect(() => {
    if (!tenantCode) {
      router.replace("/guest");
      return;
    }
    const locked = readLockedCustomerTenant();
    if (isCustomerShell() && locked && tenantCode !== locked) {
      router.replace(guestOrderPath({ tenant: locked }));
    }
  }, [tenantCode, router]);

  useEffect(() => {
    if (!tenantCode) return;
    setLoading(true);
    void fetch(`/api/state?tenant=${encodeURIComponent(tenantCode)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLoadError(d.error || "Restaurant not found");
          setBranding(null);
          return;
        }
        setLoadError("");
        setBranding(d.public.branding);
        setShop(d.public.shop);
        setMenu(d.public.menu);
        setPayments(normalizeTenantPayments(d.public.payments));
        setSpecialOffer(d.public.specialOffer || null);
        setOrderingClosed(Boolean(d.orderingClosed));
        setBillingPastDue(Boolean(d.billingPastDue));
        localStorage.setItem(LAST_GUEST_TENANT_KEY, tenantCode);
        try {
          const raw = localStorage.getItem("ordo_guest_client_v1");
          if (raw) {
            const g = JSON.parse(raw) as { tenant?: string; name?: string; email?: string };
            if (g.tenant === tenantCode) {
              if (g.name) setCustomerName(g.name);
            }
          }
        } catch { /* ignore */ }
      })
      .finally(() => setLoading(false));
  }, [tenantCode]);

  useEffect(() => {
    if (!tenantCode) return;
    try {
      const raw = localStorage.getItem(cartStorageKey(tenantCode));
      if (raw) setCart(normalizeCart(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setCartReady(true);
  }, [tenantCode]);

  useEffect(() => {
    if (!cartReady || !tenantCode) return;
    localStorage.setItem(cartStorageKey(tenantCode), JSON.stringify(cart));
  }, [cart, cartReady, tenantCode]);

  useEffect(() => {
    if (!mode) return;
    setPaymentMethod(paymentChoicesFor(mode, payments)[0].id);
    setAdvanceRail("");
    setPaymentProofUrl("");
    setPaidAck(false);
    setError("");
  }, [mode, payments]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
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

  const total = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const currency = shop?.currency || "PKR";

  function flyToCart(fromEl: HTMLElement | null, item: MenuItem) {
    if (reduced || !fromEl) return;
    const start = fromEl.getBoundingClientRect();
    const bag = cartBarRef.current?.getBoundingClientRect();
    const endX = bag ? bag.left + bag.width * 0.72 : window.innerWidth - 56;
    const endY = bag ? bag.top + bag.height / 2 : window.innerHeight - 48;
    const id = ++flyerId.current;
    setFlyers((prev) => [
      ...prev,
      {
        id,
        x: start.left + start.width / 2,
        y: start.top + start.height / 2,
        tx: endX,
        ty: endY,
        src: item.imageUrl || undefined,
        letter: item.name.slice(0, 1),
      },
    ]);
    window.setTimeout(() => {
      setFlyers((prev) => prev.filter((f) => f.id !== id));
    }, 700);
  }

  function pushLine(item: MenuItem, modifiers: LineModifier[], fromEl?: HTMLElement | null) {
    const unitPrice = lineUnitPrice(item.price, modifiers);
    const key = `${item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
    setCart((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { key, item, qty: 1, modifiers, unitPrice }];
    });
    flyToCart(fromEl || null, item);
    setToast(`Added ${item.name}`);
  }

  function addItem(item: MenuItem, fromEl?: HTMLElement | null) {
    if (!item.available) {
      setToast(`${item.name} is 86 / unavailable`);
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
    pushLine(item, [], fromEl);
  }

  async function uploadProof(file: File) {
    setProofBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("tenantCode", tenantCode);
      body.append("file", file);
      const res = await fetch("/api/guest/payment-proof", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { url?: string }).url) {
        setError((data as { error?: string }).error || "Screenshot upload failed");
        return;
      }
      setPaymentProofUrl((data as { url: string }).url);
    } finally {
      setProofBusy(false);
    }
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      const idx = [...prev].map((p, i) => ({ p, i })).reverse().find((x) => x.p.item.id === itemId)?.i;
      if (idx === undefined) return prev;
      const hit = prev[idx];
      setToast(`Removed ${hit.item.name}`);
      if (hit.qty <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((p, i) => (i === idx ? { ...p, qty: p.qty - 1 } : p));
    });
  }

  function clearCart() {
    if (!cart.length) return;
    if (!confirm("Clear the cart?")) return;
    setCart([]);
    setToast("Cart cleared");
  }

  function goMode(next: GuestMode, tableNumber?: string) {
    if (cart.length && next !== mode) {
      if (!confirm("Switching service keeps your cart. Continue?")) return;
    }
    if (next === "table") {
      const t = (tableNumber || tableDraft).trim();
      if (!t) return;
      router.push(guestOrderPath({ tenant: tenantCode, table: t }));
      return;
    }
    router.push(guestOrderPath({ tenant: tenantCode, mode: next }));
  }

  async function placeOrder() {
    if (!mode) return;
    if (orderingClosed) {
      setError("This kitchen is paused for billing. You can still browse the menu — ordering opens again after Super renews.");
      return;
    }
    if (mode === "pickup" && !customerPhone.trim() && !customerName.trim()) {
      setError("Add a name or phone so the counter can call you.");
      return;
    }
    if (paymentMethod === "paid_in_advance" && !paidAck) {
      setError("Confirm that you transferred the payment.");
      return;
    }
    if (paymentMethod === "paid_in_advance") {
      if (!advanceRail) {
        setError("Select JazzCash, EasyPaisa, or bank.");
        return;
      }
      if (!paymentProofUrl.trim()) {
        setError("Upload a payment screenshot before placing the order.");
        return;
      }
    }
    const ruleError = assertOrderRules({
      channel: "guest",
      serviceType: mode,
      paymentMethod,
      tableNumber: table,
      customerPhone,
      deliveryAddress,
    });
    if (ruleError) {
      setError(ruleError);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantCode,
        channel: "guest",
        serviceType: mode,
        tableNumber: mode === "table" ? table : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        deliveryAddress: mode === "delivery" ? deliveryAddress : undefined,
        note: note || undefined,
        paymentMethod,
        advanceRail: paymentMethod === "paid_in_advance" ? advanceRail || undefined : undefined,
        paymentProofUrl: paymentMethod === "paid_in_advance" ? paymentProofUrl || undefined : undefined,
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
    localStorage.removeItem(cartStorageKey(tenantCode));
    setCart([]);
    router.push(`/track/${data.order.trackToken}`);
  }

  if (!tenantCode) {
    return <div className={styles.page} />;
  }

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.error}>{loadError}</p>
          <Link href="/guest" className={styles.textLink}>
            Choose another restaurant
          </Link>
        </div>
      </div>
    );
  }

  const checkout = showMenu ? (
    <CheckoutForm
      mode={mode!}
      table={table}
      currency={currency}
      total={total}
      paymentMethod={paymentMethod}
      setPaymentMethod={setPaymentMethod}
      payments={payments}
      advanceRail={advanceRail}
      setAdvanceRail={setAdvanceRail}
      paymentProofUrl={paymentProofUrl}
      onUploadProof={(file) => void uploadProof(file)}
      proofBusy={proofBusy}
      customerName={customerName}
      setCustomerName={setCustomerName}
      customerPhone={customerPhone}
      setCustomerPhone={setCustomerPhone}
      deliveryAddress={deliveryAddress}
      setDeliveryAddress={setDeliveryAddress}
      note={note}
      setNote={setNote}
      paidAck={paidAck}
      setPaidAck={setPaidAck}
      error={error}
      busy={busy}
      cart={cart}
      onClear={clearCart}
      onPlace={() => void placeOrder()}
    />
  ) : null;

  return (
    <motion.div className={styles.page} variants={enter} initial="hidden" animate="show">
      <div className={showMenu ? styles.layout : styles.shell}>
        <div>
          <header className={styles.header}>
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className={styles.logo} />
            ) : (
              <div className={styles.mark}>{branding?.name?.slice(0, 1) || (loading ? "…" : "R")}</div>
            )}
            <div>
              <h1>{branding?.name || (loading ? "Loading…" : "Restaurant")}</h1>
              <p>
                {showMenu
                  ? `${modeLabel(mode!)}${table ? ` · Table ${table}` : ""} · ${tenantCode}`
                  : `${tenantCode}${shop?.openHours ? ` · ${shop.openHours}` : ""}`}
              </p>
              {shop?.address && <p className={styles.addr}>{shop.address}</p>}
              {shop?.phone && showMenu && (
                <p className={styles.addr}>
                  {shop.openHours ? `${shop.openHours} · ` : ""}
                  {shop.phone}
                </p>
              )}
            </div>
          </header>

          {!showMenu && (
            <section className={styles.gate}>
              <h2>{needsTable ? "Which table?" : "How are you ordering?"}</h2>
              <p>
                {needsTable
                  ? "Dining tickets are tied to a table number from your QR or the floor."
                  : "Pickup, delivery, and dining each use the payment choices that restaurant already runs."}
              </p>

              {needsTable ? (
                <form
                  className={styles.tableForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    goMode("table", tableDraft);
                  }}
                >
                  <label>
                    Table number
                    <input
                      value={tableDraft}
                      onChange={(e) => setTableDraft(e.target.value)}
                      placeholder="e.g. 7"
                      required
                    />
                  </label>
                  <button type="submit" className={styles.place}>
                    Open dining menu
                  </button>
                </form>
              ) : (
                <motion.div
                  className={styles.modeCards}
                  variants={listContainer(0.05)}
                  initial="hidden"
                  animate="show"
                >
                  <motion.article variants={itemVar}>
                    <h3>Dining</h3>
                    <p>At the table. Pay at the counter.</p>
                    <label>
                      Table
                      <input
                        value={tableDraft}
                        onChange={(e) => setTableDraft(e.target.value)}
                        placeholder="Number"
                      />
                    </label>
                    <button type="button" onClick={() => goMode("table")} disabled={!tableDraft.trim()}>
                      Start dining
                    </button>
                  </motion.article>
                  <motion.article variants={itemVar}>
                    <h3>Takeaway</h3>
                    <p>Collect when ready. Pay at counter or record as paid in advance.</p>
                    <button type="button" onClick={() => goMode("pickup")}>
                      Order pickup
                    </button>
                  </motion.article>
                  <motion.article variants={itemVar}>
                    <h3>Delivery</h3>
                    <p>Cash on delivery or recorded as paid in advance.</p>
                    <button type="button" onClick={() => goMode("delivery")}>
                      Order delivery
                    </button>
                  </motion.article>
                </motion.div>
              )}
              <p className={styles.gateLinks}>
                <Link href="/scan">Scan a QR instead</Link>
                <Link href="/guest">Change restaurant</Link>
              </p>
            </section>
          )}

          {showMenu && (
            <>
              <div className={styles.modeBar}>
                <span>
                  {modeLabel(mode!)}
                  {table ? ` · Table ${table}` : ""}
                </span>
                <Link href={`/order?tenant=${tenantCode}`}>Change</Link>
              </div>

              {(orderingClosed || billingPastDue) && (
                <p className={styles.error} role="status">
                  {orderingClosed
                    ? "Billing paused — browse the menu; placing orders is closed until Super renews. Scanner still opens this kitchen."
                    : "Billing past due — you can still order. Scanner → menu always works."}{" "}
                  <a href="/scan" className={styles.textLink}>
                    Open scanner
                  </a>
                </p>
              )}
              {loading && <p className={styles.muted}>Loading this kitchen’s menu…</p>}

              {!loading && menu.length === 0 && (
                <motion.div
                  className={styles.empty}
                  variants={empty}
                  initial="hidden"
                  animate="show"
                >
                  <h2>No dishes on the board</h2>
                  <p>This restaurant has no available items right now.</p>
                </motion.div>
              )}

              {deals.length > 0 && (
                <section className={styles.deals} id="cat-Deals">
                  <h2>Deals</h2>
                  <motion.div
                    className={styles.dealRail}
                    variants={listContainer(0.045)}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewOnce}
                  >
                    {deals.map((d) => (
                      <motion.button
                        key={d.id}
                        type="button"
                        className={styles.deal}
                        onClick={(e) => addItem(d, e.currentTarget)}
                        variants={itemVar}
                      >
                        {d.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.imageUrl} alt="" className={styles.dealPhoto} loading="lazy" />
                        ) : (
                          <span className={styles.letter} aria-hidden>
                            {d.name.slice(0, 1)}
                          </span>
                        )}
                        <strong>{d.name}</strong>
                        {d.dealLabel && <em>{d.dealLabel}</em>}
                        <span className={styles.price}>
                          {currency} {d.price}
                          {d.compareAtPrice ? <s>{d.compareAtPrice}</s> : null}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                </section>
              )}

              {categories.length > 0 && (
                <nav className={styles.catNav} aria-label="Menu sections">
                  {categories.map(([cat]) => (
                    <a key={cat} href={`#cat-${cat}`} className={styles.catChip}>
                      {cat}
                    </a>
                  ))}
                </nav>
              )}

              {categories.map(([cat, items]) => (
                <section key={cat} className={styles.cat} id={`cat-${cat}`}>
                  <h2>{cat}</h2>
                  <motion.div
                    className={styles.grid}
                    variants={listContainer(0.05)}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewOnce}
                  >
                    {items.map((menuItem) => (
                      <motion.article key={menuItem.id} className={styles.tile} variants={itemVar}>
                        {menuItem.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={menuItem.imageUrl} alt="" className={styles.tilePhoto} loading="lazy" />
                        ) : null}
                        <div className={styles.tileTop}>
                          {!menuItem.imageUrl && (
                            <span className={styles.letter} aria-hidden>
                              {menuItem.name.slice(0, 1)}
                            </span>
                          )}
                          <div>
                            <strong>{menuItem.name}</strong>
                            <p>{menuItem.description}</p>
                          </div>
                        </div>
                        <div className={styles.tileBottom}>
                          <span className={styles.price}>
                            {currency} {menuItem.price}
                          </span>
                          <div className={styles.qty}>
                            <button
                              type="button"
                              onClick={() => removeItem(menuItem.id)}
                              aria-label={`Remove ${menuItem.name}`}
                            >
                              −
                            </button>
                            <span>{qtyOf(cart, menuItem.id)}</span>
                            <button
                              type="button"
                              onClick={(e) => addItem(menuItem, e.currentTarget.closest("article") as HTMLElement)}
                              aria-label={`Add ${menuItem.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </section>
              ))}
            </>
          )}
        </div>

        {showMenu && (
          <aside className={styles.rail} aria-label="Cart">
            <h2>Your order</h2>
            {count === 0 ? (
              <p className={styles.muted}>Add dishes. This cart stays on this restaurant only.</p>
            ) : (
              checkout
            )}
          </aside>
        )}
      </div>

      {showMenu && count > 0 && (
        <button
          type="button"
          ref={cartBarRef}
          className={styles.cartBar}
          onClick={() => setSheetOpen(true)}
        >
          <span className={styles.cartBarMeta}>
            <em>{count} item{count === 1 ? "" : "s"}</em>
            <strong>
              {currency} {total}
            </strong>
          </span>
          <span className={styles.cartBarCta}>Place order · {currency} {total}</span>
        </button>
      )}

      <GuestSpecialOfferPopup tenantCode={tenantCode} offer={specialOffer} />

      <AnimatePresence>
        {flyers.map((f) => (
          <motion.div
            key={f.id}
            className={styles.flyDot}
            initial={{ left: f.x, top: f.y, opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            animate={{ left: f.tx, top: f.ty, opacity: 0.35, scale: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {f.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.src} alt="" />
            ) : (
              <span>{f.letter}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && showMenu ? (
          <motion.div
            key="cart-sheet"
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition(reduced)}
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              className={styles.sheetPanel}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={reduced ? backdropTransition(true) : sheetTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHead}>
                <h3 id="cart-title">Your order</h3>
                <button type="button" onClick={() => setSheetOpen(false)}>
                  Close
                </button>
              </div>
              {checkout}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {modItem ? (
          <motion.div
            key="mod-sheet"
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mod-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition(reduced)}
            onClick={() => setModItem(null)}
          >
            <motion.div
              className={styles.sheetPanel}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              transition={reduced ? backdropTransition(true) : sheetTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHead}>
                <h3 id="mod-title">Customize · {modItem.name}</h3>
                <button type="button" onClick={() => setModItem(null)}>
                  Close
                </button>
              </div>
              {(modItem.modifiers || []).map((g) => (
                <div key={g.id} style={{ marginBottom: "0.85rem" }}>
                  <p className={styles.muted}>
                    {g.name}
                    {g.required ? " *" : ""}
                  </p>
                  <div className={styles.qty} style={{ flexWrap: "wrap", gap: "0.4rem" }}>
                    {g.options.map((o) => {
                      const on = (modSel[g.id] || []).includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={on ? styles.place : styles.clear}
                          style={{ width: "auto", margin: 0 }}
                          onClick={() => {
                            setModSel((prev) => {
                              const cur = prev[g.id] || [];
                              if (g.multi) {
                                return {
                                  ...prev,
                                  [g.id]: on ? cur.filter((x) => x !== o.id) : [...cur, o.id],
                                };
                              }
                              return { ...prev, [g.id]: [o.id] };
                            });
                          }}
                        >
                          {o.name}
                          {o.priceDelta ? ` +${o.priceDelta}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className={styles.place}
                onClick={() => {
                  pushLine(modItem, toMods(modItem.modifiers || [], modSel));
                  setModItem(null);
                }}
              >
                Add to cart · {currency}{" "}
                {lineUnitPrice(modItem.price, toMods(modItem.modifiers || [], modSel))}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            key="toast"
            className={styles.toast}
            role="status"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={toastTransition}
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <OrderInner />
    </Suspense>
  );
}
