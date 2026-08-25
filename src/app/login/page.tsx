"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, OWNER_TOKEN_KEY, useStore } from "@/lib/store";
import { setHelpModeCookieClient } from "@/lib/help-mode";
import { isCustomerShell, isStaffShell, readAppShell, readLockedCustomerTenant, readLockedStaffTenant } from "@/lib/app-shell";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { IosHomeScreenGuide } from "@/components/IosHomeScreenGuide";
import styles from "./login.module.css";

const CODE_KEY = "ordo_staff_tenant_code";

export default function LoginPage() {
  const router = useRouter();
  const { hydrate } = useStore();
  const [mode, setMode] = useState<"tenant" | "super">("tenant");
  const [appShell, setAppShell] = useState<string>(() =>
    typeof window === "undefined" ? "web" : readAppShell(),
  );
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hideSuper, setHideSuper] = useState(() => isStaffShell() || appShell === "staff");
  const [ownerDesk, setOwnerDesk] = useState(false);
  const [kitchenBrand, setKitchenBrand] = useState<{ name: string; logoUrl: string } | null>(null);
  const [codeLocked, setCodeLocked] = useState(false);
  const [forceIosGuide, setForceIosGuide] = useState(false);

  useEffect(() => {
    const shell = readAppShell();
    setAppShell(shell);
    if (shell === "customer" || isCustomerShell()) {
      const locked = readLockedCustomerTenant();
      router.replace(
        locked
          ? `/guest?app=customer&tenant=${encodeURIComponent(locked)}`
          : "/guest?app=customer",
      );
      return;
    }
    const host = window.location.hostname;
    const owner = new URLSearchParams(window.location.search).get("owner") === "1";
    const onControl = host === "control.asfins.com";
    const onLocal = host === "localhost" || host === "127.0.0.1";
    const staff = shell === "staff" || isStaffShell();
    const restaurantLive = !onLocal && !onControl;
    const desk = (owner || onControl) && !staff;
    setOwnerDesk(desk);
    setHideSuper(staff || (restaurantLive && !owner));
    if (staff) setMode("tenant");
    else if (desk) {
      setMode("super");
      setUsername("super");
    }
    const saved = localStorage.getItem(CODE_KEY);
    const urlTenant = new URLSearchParams(window.location.search).get("tenant");
    const lockedStaff = readLockedStaffTenant();
    const guide = new URLSearchParams(window.location.search).get("guide") === "1"
      || new URLSearchParams(window.location.search).get("install") === "1";
    setForceIosGuide(guide);
    // Only pre-fill demo credentials on localhost / the owner desk. Never on a
    // live restaurant host — a visitor should not log in without typing.
    const allowDemoDefaults = onLocal || onControl || owner;
    setCode((urlTenant || lockedStaff || saved || (staff ? "" : allowDemoDefaults ? "DEMO" : "")).toUpperCase());
    setCodeLocked(Boolean(staff && (urlTenant || lockedStaff)));
    setPassword(
      staff ? "" : desk ? "super123" : allowDemoDefaults ? "admin123" : "",
    );
    if (desk) router.prefetch("/control");
    else router.prefetch("/home");
  }, [router]);

  // Live kitchen branding on Staff APK / when a restaurant code is known.
  useEffect(() => {
    const staff = appShell === "staff" || isStaffShell() || hideSuper;
    const kitchen = code.trim().toUpperCase();
    if (!staff || mode !== "tenant" || kitchen.length < 2) {
      setKitchenBrand(null);
      return;
    }
    let cancelled = false;
    void fetch(`/api/state?tenant=${encodeURIComponent(kitchen)}`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled || !r.ok) return;
        setKitchenBrand({
          name: d.public?.branding?.name || kitchen,
          logoUrl: d.public?.branding?.logoUrl || "",
        });
      })
      .catch(() => {
        if (!cancelled) setKitchenBrand(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, appShell, hideSuper, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const staff = appShell === "staff" || isStaffShell();
    if (staff && mode === "super") {
      setBusy(false);
      setError("Staff app is for kitchen login only.");
      return;
    }
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "super"
          ? { mode: "super", username, password, app: readAppShell() }
          : { mode: "tenant", code: code.trim().toUpperCase(), username, password, app: readAppShell() },
      ),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    if (mode === "tenant" && code) {
      localStorage.setItem(CODE_KEY, code.trim().toUpperCase());
    }
    if (mode === "super") {
      localStorage.removeItem(OWNER_TOKEN_KEY);
      setHelpModeCookieClient(false);
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    hydrate({
      token: data.token,
      session: data.session,
      user: data.user ?? null,
      tenant: data.tenant ?? null,
    });
    if (mode === "super") router.push("/control");
    else router.push("/home");
  }

  async function onGoogleStaff(idToken: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "staff", code, idToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google sign-in failed");
        return;
      }
      localStorage.setItem(CODE_KEY, code.trim().toUpperCase());
      localStorage.setItem(TOKEN_KEY, data.token);
      hydrate({
        token: data.token,
        session: data.session,
        user: data.user ?? null,
        tenant: data.tenant ?? null,
      });
      router.push("/home");
    } finally {
      setBusy(false);
    }
  }

  const showKitchenBrand = Boolean(kitchenBrand && mode === "tenant" && (hideSuper || appShell === "staff"));

  return (
    <div className={styles.page}>
      {!ownerDesk && (hideSuper || appShell === "staff" || forceIosGuide) ? (
        <IosHomeScreenGuide
          audience="staff"
          restaurantName={kitchenBrand?.name}
          force={forceIosGuide}
        />
      ) : null}
      <form className={styles.card} onSubmit={onSubmit}>
        {!ownerDesk && (
          <Link href="/" className={styles.loginBack} aria-label="Back to home">
            ←
          </Link>
        )}
        {showKitchenBrand ? (
          <div className={styles.kitchenBrand}>
            {kitchenBrand!.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kitchenBrand!.logoUrl} alt="" className={styles.kitchenLogo} />
            ) : (
              <div className={styles.kitchenMark}>{kitchenBrand!.name.slice(0, 1)}</div>
            )}
            <div>
              <strong className={styles.kitchenName}>{kitchenBrand!.name}</strong>
              <p className={styles.kitchenCode}>Staff · {code || "—"}</p>
            </div>
          </div>
        ) : hideSuper ? (
          <span className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ordo-logo-on-dark.svg" alt="ORDO" className={styles.brandImg} height={34} width={148} />
          </span>
        ) : (
          <Link href="/" className={styles.brand} aria-label="ORDO home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ordo-logo-on-dark.svg" alt="ORDO" className={styles.brandImg} height={34} width={148} />
          </Link>
        )}
        <h1>{ownerDesk ? "ORDO HQ" : "Staff login"}</h1>
        {hideSuper ? (
          <p className={styles.hint}>
            {showKitchenBrand
              ? "This Staff app is locked to your kitchen. Logo & name match Settings."
              : "Use your restaurant code. Platform HQ is not part of this app."}
          </p>
        ) : ownerDesk ? (
          <p className={styles.hint}>ORDO HQ login — restaurants use ordo.asfins.com/login.</p>
        ) : (
          <>
            <p className={styles.guestStrip}>
              Ordering food? This page is for kitchen staff.
              <span>
                <Link href="/guest">Enter as guest</Link>
                {" · "}
                <Link href="/scan">Scan table QR</Link>
              </span>
            </p>
            <div className={styles.modes}>
              <button
                type="button"
                className={mode === "tenant" ? styles.active : ""}
                onClick={() => {
                  setMode("tenant");
                  setUsername("admin");
                  setPassword("admin123");
                }}
              >
                Restaurant
              </button>
              <button
                type="button"
                className={mode === "super" ? styles.active : ""}
                onClick={() => {
                  setMode("super");
                  setUsername("super");
                  setPassword("super123");
                }}
              >
                Super Admin
              </button>
            </div>
          </>
        )}
        {mode === "tenant" && (
          <label className={styles.field}>
            Restaurant code
            <input
              className={styles.input}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Kitchen code"
              required
              readOnly={codeLocked}
            />
          </label>
        )}
        <label className={styles.field}>
          Username
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className={styles.field}>
          Password
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {mode === "tenant" && (
          <GoogleSignInButton
            mode="staff"
            code={code}
            disabled={busy}
            label="Or continue with Gmail (email must be saved on this kitchen’s user)"
            onToken={onGoogleStaff}
          />
        )}
        <p className={styles.hint}>
          {code && (code === "DEMO" || codeLocked)
            ? "Demo kitchen: DEMO · admin / admin123"
            : hideSuper
              ? "Restaurant code required."
              : "Demo: code DEMO · admin/admin123 · or Super super/super123"}
          <br />
          Lab demos only — production pe passwords change karein (Settings).
        </p>
      </form>
    </div>
  );
}
