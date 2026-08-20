"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LAST_GUEST_TENANT_KEY, guestOrderPath, isTenantCode, parseGuestQr } from "@/lib/guest";
import { isCustomerShell, readAppShell } from "@/lib/app-shell";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import styles from "./guest.module.css";

const GUEST_CLIENT_KEY = "ordo_guest_client_v1";

function GuestInner() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = (params.get("tenant") || params.get("code") || "").toUpperCase();
  const [code, setCode] = useState(preset);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [lastKitchen, setLastKitchen] = useState("");
  const [appShell, setAppShell] = useState(() =>
    typeof window === "undefined" ? "web" : readAppShell(),
  );
  const [brand, setBrand] = useState<{ name: string; logoUrl: string } | null>(null);

  useEffect(() => {
    const shell = readAppShell();
    setAppShell(shell);
    if (preset) {
      setCode(preset);
      // Customer APK deep-link: lock to this kitchen immediately when valid.
      if (shell === "customer" && isTenantCode(preset)) {
        localStorage.setItem(LAST_GUEST_TENANT_KEY, preset);
      }
      return;
    }
    const last = localStorage.getItem(LAST_GUEST_TENANT_KEY);
    if (last) {
      setCode(last);
      setLastKitchen(last);
    }
  }, [preset]);

  useEffect(() => {
    const kitchen = (preset || code || "").trim().toUpperCase();
    if (!isTenantCode(kitchen)) {
      setBrand(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/state?tenant=${encodeURIComponent(kitchen)}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled || !r.ok) return;
        setBrand({
          name: d.public?.branding?.name || kitchen,
          logoUrl: d.public?.branding?.logoUrl || "",
        });
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [preset, code]);

  // Customer APK with baked tenant: go straight to that kitchen’s menu (no mix-up).
  useEffect(() => {
    const shell = readAppShell();
    if (shell !== "customer" && !isCustomerShell()) return;
    if (!preset || !isTenantCode(preset)) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(LAST_GUEST_TENANT_KEY, preset);
      router.replace(guestOrderPath({ tenant: preset }));
    }, 900);
    return () => window.clearTimeout(t);
  }, [preset, router]);

  async function openRestaurant(tenant: string, extra?: { table?: string; mode?: "pickup" | "delivery" | "table" }) {
    const next = tenant.trim().toUpperCase();
    if (!isTenantCode(next)) {
      setError("Enter a valid restaurant code.");
      return;
    }
    setBusy(true);
    setError("");
    localStorage.setItem(LAST_GUEST_TENANT_KEY, next);
    setLastKitchen(next);
    router.push(guestOrderPath({ tenant: next, table: extra?.table, mode: extra?.mode }));
  }

  async function onCode(e: React.FormEvent) {
    e.preventDefault();
    await openRestaurant(code);
  }

  async function onPaste(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseGuestQr(paste);
    if (!parsed) {
      setError("Could not read that QR link. Use a restaurant code or an /order?tenant=… URL.");
      return;
    }
    await openRestaurant(parsed.tenant, { table: parsed.table, mode: parsed.mode });
  }

  async function onGoogleGuest(idToken: string) {
    if (!isTenantCode(code)) {
      setError("Enter a valid restaurant code first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "guest", code, idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google register failed");
        return;
      }
      localStorage.setItem(
        GUEST_CLIENT_KEY,
        JSON.stringify({
          tenant: code.trim().toUpperCase(),
          email: data.client?.email,
          name: data.client?.name,
        }),
      );
      localStorage.setItem(LAST_GUEST_TENANT_KEY, code.trim().toUpperCase());
      await openRestaurant(code);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        {appShell === "customer" || isCustomerShell() ? (
          <span className={styles.brand} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            {brand?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="" width={28} height={28} style={{ objectFit: "contain", borderRadius: 6 }} />
            ) : null}
            {brand?.name || "ORDO"}
          </span>
        ) : (
          <Link href="/" className={styles.brand}>
            ORDO
          </Link>
        )}
        {appShell === "customer" || isCustomerShell() ? (
          <span className={styles.staff}>This kitchen only · {preset || code || "—"}</span>
        ) : (
          <Link href="/login" className={styles.staff}>
            Staff login
          </Link>
        )}
      </header>

      <main className={styles.main}>
        {(appShell === "customer" || isCustomerShell()) && brand ? (
          <>
            <p className={styles.kicker}>Your restaurant app</p>
            <h1>{brand.name}</h1>
            <p className={styles.lead}>
              Opening this kitchen’s menu only — code {preset || code}. Other restaurants cannot open inside this
              APK.
            </p>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt=""
                style={{ width: 96, height: 96, objectFit: "contain", margin: "0.5rem 0 1rem", borderRadius: 16 }}
              />
            ) : null}
            <p className={styles.muted}>Loading menu…</p>
          </>
        ) : (
          <>
        <p className={styles.kicker}>Guest</p>
        <h1>Find your restaurant</h1>
        <p className={styles.lead}>
          Enter the kitchen code from your receipt or staff, scan a table QR, or paste the link. Each restaurant stays
          isolated — you only see that menu.
        </p>
        <ul className={styles.cuisines}>
          <li>Burgers</li>
          <li>Pizza</li>
          <li>Karahi</li>
          <li>Grill</li>
          <li>Biryani</li>
          <li>Pasta</li>
        </ul>
          </>
        )}

        {/* Locked customer APK (baked tenant=CODE): no code picker — prevents kitchen mix-up */}
        {!(appShell === "customer" || isCustomerShell()) || !preset ? (
          <>
            <form className={styles.card} onSubmit={(e) => void onCode(e)}>
              <label className={styles.field}>
                Restaurant code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DEMO"
                  autoCapitalize="characters"
                  autoComplete="off"
                  required
                />
              </label>
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? "Opening…" : "Open menu"}
              </button>
              <GoogleSignInButton
                mode="guest"
                code={code}
                disabled={busy}
                label="Register / continue with Gmail for this kitchen"
                onToken={onGoogleGuest}
              />
              {lastKitchen && lastKitchen !== code.trim().toUpperCase() && (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => void openRestaurant(lastKitchen)}
                >
                  Continue at {lastKitchen}
                </button>
              )}
            </form>

            <div className={styles.actions}>
              <Link href="/scan" className={styles.scan}>
                Scan table QR
              </Link>
              {appShell === "customer" ? null : (
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={busy}
                  onClick={() => void openRestaurant("DEMO")}
                >
                  Open Demo Kitchen
                </button>
              )}
            </div>

            <form className={styles.paste} onSubmit={(e) => void onPaste(e)}>
              <label className={styles.field}>
                Paste a QR link
                <input
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder="/order?tenant=DEMO&table=7"
                />
              </label>
              <button type="submit" className={styles.secondary} disabled={busy || !paste.trim()}>
                Open link
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function GuestPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <GuestInner />
    </Suspense>
  );
}
