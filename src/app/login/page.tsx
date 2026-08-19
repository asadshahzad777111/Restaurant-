"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, useStore } from "@/lib/store";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, refresh } = useStore();
  const [mode, setMode] = useState<"tenant" | "super">("tenant");
  const [appShell, setAppShell] = useState<string | null>(null);
  const [code, setCode] = useState("DEMO");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const app = new URLSearchParams(window.location.search).get("app");
    setAppShell(app);
    if (app === "pos" || app === "client") {
      setMode("tenant");
      setUsername("admin");
      setPassword("admin123");
    }
  }, []);

  const hideSuper = appShell === "pos" || appShell === "client";

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
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    await refresh();
    if (appShell === "pos") router.push("/pos");
    else if (mode === "super") router.push("/super");
    else router.push("/home");
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        <Link href="/" className={styles.brand}>
          ORDO
        </Link>
        <h1>{appShell === "pos" ? "POS login" : appShell === "client" ? "Client login" : "Staff login"}</h1>
        <p className={styles.guestStrip}>
          Ordering food? This page is for kitchen staff.
          <span>
            <Link href="/guest">Enter as guest</Link>
            {" · "}
            <Link href="/scan">Scan table QR</Link>
          </span>
        </p>
        {hideSuper ? (
          <p className={styles.hint}>Use your restaurant code. Super Admin is not part of this app.</p>
        ) : (
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
        )}
        {mode === "tenant" && (
          <label className={styles.field}>
            Restaurant code
            <input
              className={styles.input}
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
            ? "Demo kitchen code DEMO · admin / admin123"
            : "Demo: code DEMO · admin/admin123 · or Super super/super123"}
        </p>
      </form>
    </div>
  );
}
