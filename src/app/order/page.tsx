"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LineModifier, MenuItem, ModifierGroup, TenantPayments, TenantSpecialOffer } from "@/lib/tenant-types";
import type { AdvanceRail, PaymentMethod, ServiceType } from "@/lib/types";
import { computeFees, lineUnitPrice } from "@/lib/fees";
import { useLang } from "@/lib/lang-context";
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
import { GuestCoverQr } from "@/components/GuestCoverQr";
import { isCustomerShell, readLockedCustomerTenant } from "@/lib/app-shell";
import { InstallAppBanner } from "@/components/InstallAppBanner";
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
  /** Per-item special instruction (e.g. "no onion"). */
  note?: string;
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
  deliveryFee?: number;
  packingFee?: number;
  taxRate?: number;
  serviceChargePercent?: number;
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
  fees,
  onLineNote,
}: {
  mode: ServiceType;
  table?: string;
  currency: string;
  total: number;
  fees: {
    subtotal: number;
    deliveryFee: number;
    packingFee: number;
    serviceCharge: number;
    tax: number;
    total: number;
  } | null;
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
  onLineNote: (key: string, note: string) => void;
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
            <input
              className={styles.lineNote}
              value={c.note || ""}
              onChange={(e) => onLineNote(c.key, e.target.value)}
              placeholder={`Note for ${c.item.name} (optional)`}
              aria-label={`Special instructions for ${c.item.name}`}
            />
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
          <p className={styles.muted}>
            Amount to pay: <strong>{currency} {fees ? fees.total : total}</strong> (includes packing, delivery &amp; tax if any). Transfer to one of these accounts, then upload your screenshot.
          </p>
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

      {error && (
        <p className={styles.error} key={error} role="alert">
          {error}
        </p>
      )}
      {fees && (
        <div className={styles.feeBreakdown}>
          <div className={styles.feeRow}><span>Subtotal</span><span>{currency} {fees.subtotal}</span></div>
          {fees.packingFee > 0 && (
            <div className={styles.feeRow}><span>Packing</span><span>{currency} {fees.packingFee}</span></div>
          )}
          {fees.deliveryFee > 0 && (
            <div className={styles.feeRow}><span>Delivery</span><span>{currency} {fees.deliveryFee}</span></div>
          )}
          {fees.serviceCharge > 0 && (
            <div className={styles.feeRow}><span>Service</span><span>{currency} {fees.serviceCharge}</span></div>
          )}
          {fees.tax > 0 && (
            <div className={styles.feeRow}><span>Tax</span><span>{currency} {fees.tax}</span></div>
          )}
          <div className={`${styles.feeRow} ${styles.feeGrand}`}><span>Total</span><span>{currency} {fees.total}</span></div>
        </div>
      )}
      <button type="button" className={styles.place} disabled={busy || !cart.length} onClick={onPlace}>
        {busy ? "Placing…" : `Place order · ${currency} ${fees ? fees.total : total}`}
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
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [bestsellers, setBestsellers] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastOrder, setLastOrder] = useState<Array<{ itemId: string; name: string; qty: number; basePrice: number; modifiers?: LineModifier[]; unitPrice?: number }> | null>(null);
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
  const [tables, setTables] = useState<Array<{ id: string; label: string; status?: string; reservedBy?: string; reservedUntil?: string }>>([]);
  const [booked, setBooked] = useState<string | null>(null); // reservation token for my booked table
  const [cartReady, setCartReady] = useState(false);
  const [modItem, setModItem] = useState<MenuItem | null>(null);
  const [modSel, setModSel] = useState<Record<string, string[]>>({});
  const [modQty, setModQty] = useState(1);
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
  const { lang, toggle, t } = useLang();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tenantCode) {
      router.replace("/guest");
      return;
    }
    // Per-restaurant PWA: iOS 'Add to Home Screen' opens this menu with the
    // right name, icon and start_url (not the platform root).
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = `/api/manifest?tenant=${tenantCode}&app=customer`;
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
        setRatings(d.public.ratings || {});
        setBestsellers(d.public.bestsellers || {});
        setTables((d.public.tables || []).map((t: any) => ({
          id: t.id,
          label: t.label,
          status: t.status || "empty",
          reservedBy: t.reservedBy,
          reservedUntil: t.reservedUntil,
        })));
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
    try {
      const raw = localStorage.getItem(`ordo_last_order_${tenantCode}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ itemId: string; name: string; qty: number; basePrice: number; modifiers?: LineModifier[]; unitPrice?: number }>;
        if (Array.isArray(parsed) && parsed.length) setLastOrder(parsed);
      }
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

  const query = search.trim().toLowerCase();
  // Popular-first: items ordered more times rank higher (best when searching).
  const popRank = useCallback(
    (a: MenuItem, b: MenuItem) => (bestsellers[b.id] || 0) - (bestsellers[a.id] || 0),
    [bestsellers],
  );
  const visibleMenu = useMemo(() => {
    if (!query) return menu;
    const hits = menu.filter((m) => m.name.toLowerCase().includes(query));
    return [...hits].sort(popRank);
  }, [menu, query, popRank]);
  const deals = useMemo(() => visibleMenu.filter((m) => m.isDeal), [visibleMenu]);
  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    visibleMenu
      .filter((m) => !m.isDeal)
      .forEach((m) => {
        const list = map.get(m.category) || [];
        list.push(m);
        map.set(m.category, list);
      });
    return [...map.entries()];
  }, [visibleMenu]);

  // Category nav: scroll-spy + bottom-sheet popup (mobile)
  const [activeCat, setActiveCat] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  useEffect(() => {
    const sections = document.querySelectorAll("[data-cat]");
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveCat(e.target.getAttribute("data-cat") || "");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [deals, categories]);

  function goCat(cat: string) {
    const el = document.getElementById(`cat-${cat}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    }
    setCatOpen(false);
  }

  const total = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const currency = shop?.currency || "PKR";

  // Fee-aware order total matching the server (delivery/packing/service/tax).
  const fees = useMemo(() => {
    if (!shop || !mode || cart.length === 0) return null;
    const orderLines = cart.map((c) => ({
      itemId: c.item.id,
      name: c.item.name,
      qty: c.qty,
      unitPrice: c.unitPrice,
      modifiers: c.modifiers,
    }));
    return computeFees(shop as Parameters<typeof computeFees>[0], mode as Parameters<typeof computeFees>[1], orderLines);
  }, [shop, mode, cart]);
  const grandTotal = fees ? fees.total : total;

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

  // Brief accent flash on the tile right after an item is added
  const [flashId, setFlashId] = useState<string | null>(null);
  /** Blocks double-fire from nested card/+ clicks and fast double-taps. */
  const addLockRef = useRef(0);
  const [modBusy, setModBusy] = useState(false);

  function withAddLock(run: () => void) {
    const now = Date.now();
    if (now - addLockRef.current < 320) return;
    addLockRef.current = now;
    run();
  }

  function pushLine(item: MenuItem, modifiers: LineModifier[], fromEl?: HTMLElement | null, qty = 1) {
    const unitPrice = lineUnitPrice(item.price, modifiers);
    const key = `${item.id}:${modifiers.map((m) => m.optionId).sort().join(",")}`;
    setCart((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { key, item, qty, modifiers, unitPrice }];
    });
    flyToCart(fromEl || null, item);
    setToast(`Added ${item.name}${qty > 1 ? ` ×${qty}` : ""}`);
    setFlashId(item.id);
    window.setTimeout(() => setFlashId((cur) => (cur === item.id ? null : cur)), 620);
  }

  function addItem(item: MenuItem, fromEl?: HTMLElement | null) {
    withAddLock(() => {
      if (!item.available) {
        setToast(`${item.name} is unavailable (out of stock)`);
        return;
      }
      // Already customizing this dish — ignore duplicate card taps.
      if (modItem?.id === item.id) return;
      // Mobile/touch: every item opens the customize popup so the user never has
      // to scroll down to find the cart. Desktop: modifier items still get the
      // popup; plain items add straight to the side cart.
      if (item.modifiers?.length || coarse || (typeof window !== "undefined" && window.innerWidth < 720)) {
        const init: Record<string, string[]> = {};
        (item.modifiers || []).forEach((g) => {
          init[g.id] = g.required && g.options[0] ? [g.options[0].id] : [];
        });
        setModSel(init);
        setModQty(1);
        setModItem(item);
        return;
      }
      pushLine(item, [], fromEl);
    });
  }

  function confirmModAdd(openCheckout: boolean) {
    if (!modItem || modBusy) return;
    setModBusy(true);
    withAddLock(() => {
      pushLine(modItem, toMods(modItem.modifiers || [], modSel), null, modQty);
      setModItem(null);
      if (openCheckout) setSheetOpen(true);
    });
    window.setTimeout(() => setModBusy(false), 400);
  }

  /** Re-add the guest's last order in one tap (returns true if anything was added). */
  function reorderLast() {
    if (!lastOrder || !lastOrder.length) return;
    let added = 0;
    for (const row of lastOrder) {
      const item = menu.find((m) => m.id === row.itemId);
      if (!item || !item.available) continue;
      const mods = row.modifiers || [];
      pushLine(item, mods, null, Math.max(1, row.qty || 1));
      added += 1;
    }
    if (added) {
      setToast(`Reordered ${added} item${added === 1 ? "" : "s"}`);
    } else {
      setToast("Some items are unavailable right now");
    }
  }

  function setLineNote(key: string, note: string) {
    setCart((prev) => prev.map((p) => (p.key === key ? { ...p, note } : p)));
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

  async function refreshTables() {
    try {
      const r = await fetch(`/api/state?tenant=${encodeURIComponent(tenantCode)}`);
      const d = await r.json();
      if (r.ok) {
        setTables((d.public.tables || []).map((t: any) => ({
          id: t.id,
          label: t.label,
          status: t.status || "empty",
          reservedBy: t.reservedBy,
          reservedUntil: t.reservedUntil,
        })));
      }
    } catch {
      /* ignore */
    }
  }

  async function reserveTable(tableId: string, name: string, minutes: number) {
    const r = await fetch("/api/tables/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantCode, tableId, name, minutes }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Could not book this table");
      return;
    }
    try {
      localStorage.setItem("ordo_reservation_v1", JSON.stringify({ tenant: tenantCode, tableId, token: d.token }));
    } catch {
      /* ignore */
    }
    setBooked(d.token);
    await refreshTables();
  }

  async function claimReserved(tableId: string) {
    let token = booked;
    if (!token) {
      try {
        const saved = JSON.parse(localStorage.getItem("ordo_reservation_v1") || "null");
        if (saved?.tenant === tenantCode && saved?.tableId === tableId) token = saved.token;
      } catch {
        /* ignore */
      }
    }
    if (!token) {
      setError("Reservation not found on this device");
      return;
    }
    const r = await fetch("/api/tables/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantCode, tableId, token }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.error || "Could not claim table");
      return;
    }
    try {
      localStorage.removeItem("ordo_reservation_v1");
    } catch {
      /* ignore */
    }
    setBooked(null);
    goMode("table", tableId);
    await refreshTables();
  }

  async function cancelBooking(tableId: string) {
    let token = booked;
    if (!token) {
      try {
        const saved = JSON.parse(localStorage.getItem("ordo_reservation_v1") || "null");
        if (saved?.tenant === tenantCode && saved?.tableId === tableId) token = saved.token;
      } catch {
        /* ignore */
      }
    }
    const r = await fetch("/api/tables/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantCode, tableId, token }),
    });
    if (r.ok) {
      try {
        localStorage.removeItem("ordo_reservation_v1");
      } catch {
        /* ignore */
      }
      setBooked(null);
      await refreshTables();
    }
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
          lineNote: c.note?.trim() || undefined,
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
    // Save the just-placed order so returning guests can reorder in one tap.
    try {
      localStorage.setItem(
        `ordo_last_order_${tenantCode}`,
        JSON.stringify(
          cart.map((c) => ({
            itemId: c.item.id,
            name: c.item.name,
            qty: c.qty,
            basePrice: c.item.price,
            modifiers: c.modifiers,
            unitPrice: c.unitPrice,
          })),
        ),
      );
    } catch {
      /* ignore */
    }
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
      total={grandTotal}
      fees={fees}
      onLineNote={setLineNote}
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
            <Link href="/guest" className={styles.headerBack} aria-label="Back to restaurant list">
              ←
            </Link>
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
                  ? `${modeLabel(mode!)}${table ? ` · Table ${table}` : ""}`
                  : `${shop?.openHours ? `Open · ${shop.openHours}` : ""}`}
              </p>
              {shop?.address && <p className={styles.addr}>{shop.address}</p>}
              {shop?.phone && showMenu && (
                <p className={styles.addr}>
                  {shop.openHours ? `${shop.openHours} · ` : ""}
                  {shop.phone}
                </p>
              )}
            </div>
            {tenantCode ? (
              <GuestCoverQr tenantCode={tenantCode} restaurantName={branding?.name} compact={showMenu} />
            ) : null}
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
                <div className={styles.tableForm}>
                  {tables.length > 0 ? (
                    <>
                      <p className={styles.muted}>Choose your table — you can book it from here</p>
                      <div className={styles.tableGrid}>
                        {tables.map((tb) => {
                          const status = tb.status || "empty";
                          const reserved = status === "reserved";
                          const isMine =
                            reserved &&
                            (() => {
                              try {
                                const s = JSON.parse(localStorage.getItem("ordo_reservation_v1") || "null");
                                return s?.tenant === tenantCode && s?.tableId === tb.id;
                              } catch {
                                return false;
                              }
                            })();
                          return (
                            <div key={tb.id} className={`${styles.tableCard} ${(styles as Record<string, string>)["table_" + status] || ""}`}>
                              <strong className={styles.tableLabel}>T{tb.label}</strong>
                              <span className={styles.tableStatus}>
                                {status === "empty"
                                  ? "Empty"
                                  : status === "reserved"
                                    ? isMine
                                      ? "Yours"
                                      : "Reserved"
                                    : status === "occupied"
                                      ? "In use"
                                      : "Bill"}
                              </span>
                              {status === "empty" ? (
                                <button
                                  type="button"
                                  className={styles.tableBook}
                                  onClick={() => {
                                    const mins = Number(prompt("Book for how many minutes? (10/15/20/30)", "20")) || 20;
                                    const nm = prompt("Your name (optional)", "") || "";
                                    void reserveTable(tb.id, nm, mins);
                                  }}
                                >
                                  Book
                                </button>
                              ) : null}
                              {status === "empty" ? (
                                <button type="button" className={styles.tableOrder} onClick={() => goMode("table", tb.label)}>
                                  Order here
                                </button>
                              ) : null}
                              {reserved && isMine ? (
                                <>
                                  <button type="button" className={styles.tableClaim} onClick={() => void claimReserved(tb.id)}>
                                    Claim (I'm here)
                                  </button>
                                  <button type="button" className={styles.tableCancel} onClick={() => void cancelBooking(tb.id)}>
                                    Cancel
                                  </button>
                                </>
                              ) : null}
                              {reserved && !isMine ? (
                                <span className={styles.tableHint}>Waiting for arrival</span>
                              ) : null}
                              {status === "occupied" ? (
                                <span className={styles.tableHint}>Try another table</span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <form
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
                  )}
                </div>
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
                    {(shop as unknown as { deliveryEnabled?: boolean })?.deliveryEnabled !== false && (
                      <>
                        <h3>Delivery</h3>
                        <p>Cash on delivery or recorded as paid in advance.</p>
                        <button type="button" onClick={() => goMode("delivery")}>
                          Order delivery
                        </button>
                      </>
                    )}
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
                <div className={styles.modeBarRight}>
                  <button
                    type="button"
                    className={styles.langBtn}
                    onClick={toggle}
                    title={lang === "en" ? "اردو / Roman Urdu" : "English"}
                  >
                    {lang === "en" ? "اردو" : "EN"}
                  </button>
                  <Link href={`/order?tenant=${tenantCode}`}>Change</Link>
                </div>
              </div>

              <div className={styles.searchBox}>
                <span className={styles.searchIcon} aria-hidden>
                  🔎
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  aria-label={t("searchPlaceholder")}
                />
                {search && (
                  <button type="button" className={styles.searchClear} onClick={() => setSearch("")} aria-label="Clear">
                    ×
                  </button>
                )}
              </div>

              {(orderingClosed || billingPastDue) && (
                <motion.div
                  className={`${styles.billingBanner}${orderingClosed ? ` ${styles.billingPaused}` : ""}`}
                  role="status"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className={styles.billingDot} aria-hidden />
                  <p>
                    {orderingClosed
                      ? "Billing paused — browse the menu; placing orders is closed until Super renews. Scanner still opens this kitchen."
                      : "Billing past due — you can still order. Scanner → menu always works."}{" "}
                    <a href="/scan" className={styles.textLink}>
                      Open scanner
                    </a>
                  </p>
                </motion.div>
              )}
              {!loading && (
                <InstallAppBanner
                  tenantCode={tenantCode}
                  restaurantName={branding?.name || tenantCode}
                  logoUrl={branding?.logoUrl}
                />
              )}
              {loading && (
                <div className={styles.skelGrid} aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.skelCard}>
                      <div className={styles.skelPhoto} />
                      <div className={styles.skelLine} style={{ width: "70%" }} />
                      <div className={styles.skelLine} style={{ width: "40%" }} />
                    </div>
                  ))}
                </div>
              )}

              {!loading && !query && menu.length === 0 && (
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

              {!loading && query && visibleMenu.length === 0 && (
                <motion.div
                  className={styles.empty}
                  variants={empty}
                  initial="hidden"
                  animate="show"
                >
                  <h2>{t("noResults")}</h2>
                </motion.div>
              )}

              {query && !loading && visibleMenu.length > 0 && (
                <div className={styles.searchHead}>
                  <h2>
                    Results for “{search.trim()}”
                  </h2>
                  <p className={styles.muted}>
                    {visibleMenu.length} item{visibleMenu.length === 1 ? "" : "s"} · most popular first
                  </p>
                </div>
              )}

              {!loading && cart.length === 0 && lastOrder && lastOrder.length > 0 && (
                <div className={styles.reorder}>
                  <div className={styles.reorderCopy}>
                    <strong>Order again?</strong>
                    <span className={styles.muted}>
                      Re-add your last order ({lastOrder.reduce((s, l) => s + (l.qty || 1), 0)} items)
                    </span>
                  </div>
                  <button type="button" className={styles.reorderBtn} onClick={reorderLast}>
                    🔁 Order again
                  </button>
                </div>
              )}

              {deals.length > 0 && (
                <section className={styles.deals} id="cat-Deals" data-cat="Deals">
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
                        className={`${styles.deal}${!d.available ? ` ${styles.dealSoldOut}` : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(d, e.currentTarget);
                        }}
                        variants={itemVar}
                        whileHover={reduced || coarse || !d.available ? undefined : { y: -4, scale: 1.015 }}
                        whileTap={reduced || !d.available ? undefined : { scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {!d.available ? (
                          <span className={styles.soldOutBadge} role="status">
                            Sold out
                          </span>
                        ) : null}
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
                <nav className={styles.catBar} aria-label="Menu sections">
                  <button type="button" className={styles.catMenuBtn} onClick={() => setCatOpen(true)}>
                    <span aria-hidden>☰</span>
                    <span>{activeCat || t("browseMenu")}</span>
                  </button>
                  <div className={styles.catChips}>
                    {[
                      ...(deals.length ? [{ id: "Deals", label: "Deals" }] : []),
                      ...categories.map(([cat]) => ({ id: cat, label: cat })),
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={activeCat === c.id ? `${styles.catChip} ${styles.catChipActive}` : styles.catChip}
                        onClick={() => goCat(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </nav>
              )}

              {categories.map(([cat, items]) => (
                <section key={cat} className={styles.cat} id={`cat-${cat}`} data-cat={cat}>
                  <h2>{cat}</h2>
                  <motion.div
                    className={styles.grid}
                    variants={listContainer(0.05)}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewOnce}
                  >
                    {items.map((menuItem) => {
                      const inCart = qtyOf(cart, menuItem.id) > 0;
                      const soldOut = !menuItem.available;
                      return (
                        <motion.article
                          key={menuItem.id}
                          className={`${styles.tile}${inCart ? ` ${styles.tileInCart}` : ""}${soldOut ? ` ${styles.tileSoldOut}` : ""}${flashId === menuItem.id ? ` ${styles.tileFlash}` : ""}`}
                          variants={itemVar}
                          aria-disabled={soldOut}
                          onClick={
                            soldOut
                              ? undefined
                              : (e) => {
                                  // Qty controls handle their own clicks — never bubble to card add.
                                  const t = e.target as HTMLElement | null;
                                  if (t?.closest?.(`.${styles.qty}`)) return;
                                  addItem(menuItem, e.currentTarget);
                                }
                          }
                          role={soldOut ? undefined : "button"}
                          tabIndex={soldOut ? undefined : 0}
                          whileHover={soldOut || reduced || coarse ? undefined : { y: -4 }}
                          whileTap={soldOut || reduced ? undefined : { scale: 0.985 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          onKeyDown={
                            soldOut
                              ? undefined
                              : (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    addItem(menuItem, e.currentTarget);
                                  }
                                }
                          }
                        >
                          {menuItem.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={menuItem.imageUrl} alt="" className={styles.tilePhoto} loading="lazy" />
                          ) : null}
                          {soldOut ? (
                            <span className={styles.soldOutBadge} role="status">
                              Sold out
                            </span>
                          ) : null}
                          {(menuItem.tags || []).map((tag) => (
                            <span key={tag} className={`${styles.tagBadge} ${styles[`tag${tag}`] || ""}`}>
                              {tag === "bestseller" ? "🔥 Bestseller" : tag === "new" ? "🆕 New" : tag === "spicy" ? "🌶️ Spicy" : tag}
                            </span>
                          ))}
                          {inCart && !soldOut && (
                            <span className={styles.inCartBadge} aria-hidden>
                              ✓
                            </span>
                          )}
                          <div className={styles.tileTop}>
                            {!menuItem.imageUrl && (
                              <span className={styles.letter} aria-hidden>
                                {menuItem.name.slice(0, 1)}
                              </span>
                            )}
                            <div>
                              <strong>{menuItem.name}</strong>
                              <p>{menuItem.description}</p>
                              <div className={styles.tileMeta}>
                                {ratings[menuItem.id] && ratings[menuItem.id].count > 0 ? (
                                  <span className={styles.stars} aria-label={`Rated ${ratings[menuItem.id].avg} of 5`}>
                                    {"★".repeat(Math.round(ratings[menuItem.id].avg))}
                                    <span className={styles.starsDim}>
                                      {"★".repeat(5 - Math.round(ratings[menuItem.id].avg))}
                                    </span>
                                    <em>{ratings[menuItem.id].avg}</em>
                                  </span>
                                ) : null}
                                {menuItem.prepMin ? (
                                  <span className={styles.prep}>
                                    ⏱ ~{menuItem.prepMin} min
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className={styles.tileBottom}>
                            <span className={styles.price}>
                              {currency} {menuItem.price}
                            </span>
                            <div className={styles.qty}>
                              {soldOut ? (
                                <span className={styles.soldOutHint}>Unavailable</span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      removeItem(menuItem.id);
                                    }}
                                    aria-label={`Remove ${menuItem.name}`}
                                    disabled={!inCart}
                                    hidden={!inCart}
                                  >
                                    −
                                  </button>
                                  <span key={qtyOf(cart, menuItem.id)}>{inCart ? qtyOf(cart, menuItem.id) : ""}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      addItem(menuItem, e.currentTarget.closest("article") as HTMLElement);
                                    }}
                                    aria-label={`Add ${menuItem.name}`}
                                  >
                                    +
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                  </motion.div>
                </section>
              ))}
            </>
          )}
        </div>

        {showMenu && (
          <aside className={styles.rail} aria-label="Cart">
            <h2>{t("yourOrder")}</h2>
            {count === 0 ? (
              <p className={styles.muted}>{t("addDishes")}</p>
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
            <span className={styles.cartBarBag} aria-hidden>🛍️</span>
            <em key={count} className={styles.cartBarCount}>
              {count} item{count === 1 ? "" : "s"}
            </em>
            <strong key={grandTotal}>
              {currency} {grandTotal}
            </strong>
          </span>
          <span className={styles.cartBarCta}>Place order · {currency} {grandTotal}</span>
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
                <h3 id="cart-title">{t("yourOrder")}</h3>
                <button type="button" onClick={() => setSheetOpen(false)}>
                  Close
                </button>
              </div>
              {checkout}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Category popup — bottom sheet */}
      <AnimatePresence>
        {catOpen ? (
          <motion.div
            key="cat-sheet"
            className={styles.catBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cat-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition(reduced)}
            onClick={() => setCatOpen(false)}
          >
            <motion.div
              className={styles.catSheet}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 320 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 320 }}
              transition={reduced ? backdropTransition(true) : sheetTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.catSheetHead}>
                <h3 id="cat-title">{t("browseMenu")}</h3>
                <button type="button" onClick={() => setCatOpen(false)} aria-label="Close">
                  Close
                </button>
              </div>
              <div className={styles.catSheetList}>
                {[
                  ...(deals.length ? [{ id: "Deals", label: "Deals" }] : []),
                  ...categories.map(([cat]) => ({ id: cat, label: cat })),
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={activeCat === c.id ? styles.catSheetActive : styles.catSheetItem}
                    onClick={() => goCat(c.id)}
                  >
                    <span>{c.label}</span>
                    {activeCat === c.id && <span aria-hidden>✓</span>}
                  </button>
                ))}
              </div>
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
              {/* Item header — photo, name, description */}
              <div className={styles.modHead}>
                {modItem.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={modItem.imageUrl} alt="" className={styles.modImg} />
                ) : (
                  <span className={styles.modEmoji} aria-hidden>
                    {modItem.imageEmoji || modItem.name.slice(0, 1)}
                  </span>
                )}
                <div className={styles.modHeadText}>
                  <h3 id="mod-title">{modItem.name}</h3>
                  {modItem.description ? (
                    <p className={styles.muted}>{modItem.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={styles.sheetClose}
                  onClick={() => setModItem(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Modifier groups — name on top, options below */}
              {(modItem.modifiers || []).map((g) => (
                <div key={g.id} className={styles.modGroupBlock}>
                  <p className={styles.modGroupLabel}>
                    {g.name}
                    {g.required ? <span className={styles.modReq}> · required</span> : null}
                    {g.multi ? <span className={styles.modMulti}> · pick several</span> : null}
                  </p>
                  <div className={styles.modOptionsWrap}>
                    {g.options.map((o) => {
                      const on = (modSel[g.id] || []).includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={on ? styles.modOptOn : styles.modOpt}
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
                          <span className={styles.modOptName}>{o.name}</span>
                          {o.priceDelta ? (
                            <span className={styles.modOptPrice}>
                              {o.priceDelta > 0 ? "+" : ""}
                              {currency} {o.priceDelta}
                            </span>
                          ) : null}
                          {on ? <span className={styles.modOptTick} aria-hidden>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className={styles.modQtyRow}>
                <span className={styles.modQtyLabel}>Quantity</span>
                <div className={styles.qty}>
                  <button type="button" onClick={() => setModQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    −
                  </button>
                  <span>{modQty}</span>
                  <button type="button" onClick={() => setModQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">
                    +
                  </button>
                </div>
              </div>

              {/* Live total */}
              <div className={styles.modTotal}>
                <span>Total</span>
                <strong>
                  {currency}{" "}
                  {lineUnitPrice(modItem.price, toMods(modItem.modifiers || [], modSel)) * modQty}
                </strong>
              </div>

              {/* Dual CTA — everything inside the sheet */}
              <button
                type="button"
                className={styles.place}
                disabled={modBusy}
                onClick={() => confirmModAdd(false)}
              >
                Add to cart · {currency}{" "}
                {lineUnitPrice(modItem.price, toMods(modItem.modifiers || [], modSel)) * modQty}
              </button>
              <button
                type="button"
                className={styles.placeGhost}
                disabled={modBusy}
                onClick={() => confirmModAdd(true)}
              >
                Add &amp; go to checkout
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
