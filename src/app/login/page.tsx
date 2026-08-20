"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, useStore } from "@/lib/store";
import { isCustomerShell, isStaffShell, readAppShell } from "@/lib/app-shell";
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

  useEffect(() => {
    const shell = readAppShell();
    setAppShell(shell);
    if (shell === "customer" || isCustomerShell()) {
      router.replace("/guest?app=customer");
      return;
    }
    if (shell === "staff") setMode("tenant");
    const saved = localStorage.getItem(CODE_KEY);
    setCode(saved || (shell === "staff" ? "" : "DEMO"));
    setPassword(shell === "staff" ? "" : "admin123");
    router.prefetch("/home");
    if (shell !== "staff") router.prefetch("/super");
  }, [router]);

  const hideSuper = isStaffShell() || appShell === "staff";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "super"
          ? { mode: "super", username, password }
          : { mode: "tenant", code, username, password },
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
    localStorage.setItem(TOKEN_KEY, data.token);
    hydrate({
      token: data.token,
      session: data.session,
      user: data.user ?? null,
      tenant: data.tenant ?? null,
    });
    if (mode === "super") router.push("/super");
    else router.push("/home");
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        {hideSuper ? (
          <span className={styles.brand}>ORDO</span>
        ) : (
          <Link href="/" className={styles.brand}>
            ORDO
          </Link>
        )}
        <h1>Staff login</h1>
        {hideSuper ? (
          <p className={styles.hint}>Use your restaurant code. Super Admin is not part of this app.</p>
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
            />
          </label>
        )}
        <label className={styles.field}>
          Username
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            required
          />
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className={styles.hint}>
          {hideSuper
            ? "Restaurant code required. Demo kitchen: DEMO · admin / admin123"
            : "Demo: code DEMO · admin/admin123 · or Super super/super123"}
          <br />
          Lab demos only — production pe passwords change karein (Settings).
        </p>
      </form>
    </div>
  );
}
