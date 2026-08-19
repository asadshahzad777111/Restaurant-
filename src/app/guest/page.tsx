"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LAST_GUEST_TENANT_KEY, guestOrderPath, isTenantCode, parseGuestQr } from "@/lib/guest";
import styles from "./guest.module.css";

function GuestInner() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = (params.get("code") || "").toUpperCase();
  const [code, setCode] = useState(preset);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preset) return;
    const last = localStorage.getItem(LAST_GUEST_TENANT_KEY);
    if (last) setCode(last);
  }, [preset]);

  async function openRestaurant(tenant: string, extra?: { table?: string; mode?: "pickup" | "delivery" | "table" }) {
    const next = tenant.trim().toUpperCase();
    if (!isTenantCode(next)) {
      setError("Enter a valid restaurant code.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/state?tenant=${encodeURIComponent(next)}`);
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Restaurant not found");
      return;
    }
    localStorage.setItem(LAST_GUEST_TENANT_KEY, next);
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

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}>
          ORDO
        </Link>
        <Link href="/login" className={styles.staff}>
          Staff login
        </Link>
      </header>

      <main className={styles.main}>
        <p className={styles.kicker}>Guest</p>
        <h1>Find your restaurant</h1>
        <p className={styles.lead}>
          Enter the kitchen code from your receipt or staff, scan a table QR, or paste the link. Each restaurant stays
          isolated — you only see that menu.
        </p>

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
        </form>

        <div className={styles.actions}>
          <Link href="/scan" className={styles.scan}>
            Scan table QR
          </Link>
          <button
            type="button"
            className={styles.ghost}
            disabled={busy}
            onClick={() => void openRestaurant("DEMO")}
          >
            Open Demo Kitchen
          </button>
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
