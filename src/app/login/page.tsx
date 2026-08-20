"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TOKEN_KEY, useStore } from "@/lib/store";
import { apiUrl } from "@/lib/urls";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { setToken, refresh } = useStore();
  const ownerOnly =
    search.get("owner") === "1" ||
    (typeof window !== "undefined" && window.location.hostname.startsWith("control."));

  const [code, setCode] = useState("DEMO");
  const [username, setUsername] = useState(ownerOnly ? "super" : "admin");
  const [password, setPassword] = useState(ownerOnly ? "super123" : "admin123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ownerOnly) {
      setUsername("super");
      setPassword("super123");
    }
  }, [ownerOnly]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(apiUrl("/api/auth"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        ownerOnly
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
    router.push(ownerOnly ? "/control" : "/home");
  }

  return (
    <div className={ownerOnly ? styles.pageHq : styles.page}>
      <form className={ownerOnly ? styles.cardHq : styles.card} onSubmit={onSubmit}>
        <Link href={ownerOnly ? "/control" : "/"} className={ownerOnly ? styles.brandHq : styles.brand}>
          {ownerOnly ? "ORDO HQ" : "ORDO"}
        </Link>
        <h1>{ownerOnly ? "ORDO HQ login" : "Restaurant staff login"}</h1>
        <p className={styles.hint} style={{ marginTop: 0 }}>
          {ownerOnly
            ? "Platform owner only — manage restaurants and help them without their password."
            : "Use your restaurant code. This is not the owner HQ."}
        </p>
        {!ownerOnly && (
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
        <button
          type="submit"
          className={ownerOnly ? styles.submitHq : styles.submit}
          disabled={busy}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {!ownerOnly && (
          <p className={styles.hint}>
            Demo: code <strong>DEMO</strong> · admin / admin123
          </p>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.page}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
