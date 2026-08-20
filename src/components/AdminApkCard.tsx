"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { tenantInstallUrl } from "@/lib/pwa-links";
import styles from "@/app/staff.module.css";

type ApkInfo = {
  id: "staff" | "customer";
  title: string;
  filename: string;
  aabFilename?: string;
  available: boolean;
  aabAvailable?: boolean;
  sizeBytes: number;
  aabSizeBytes?: number;
  updatedAt: string | null;
  loadsPath: string;
};

export function AdminApkCard() {
  const { api, tenant, token } = useStore();
  const [apps, setApps] = useState<ApkInfo[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const res = await api("/api/admin/apks");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load apps");
      return;
    }
    setApps(data.apps || []);
    setNote(data.note || "");
    setError("");
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(slot: "staff" | "customer", filename: string, format: "apk" | "aab") {
    setBusy(`${slot}-${format}`);
    try {
      const res = await api(`/api/admin/apks?download=${slot}&format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert(
          (err as { error?: string }).error ||
            (format === "aab"
              ? "Play Store AAB not ready — ask Super to upload"
              : "APK not ready — ask ORDO Super to upload yours"),
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy("");
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copy this link:", text);
    }
  }

  const name = tenant?.branding.name || tenant?.code || "Restaurant";
  const logo = tenant?.branding.logoUrl || "";
  const code = tenant?.code || "";
  const customerUrl = code ? tenantInstallUrl(code, "customer") : "";
  const staffUrl = code ? tenantInstallUrl(code, "staff") : "";

  return (
    <div className={styles.card}>
      <h3 style={{ marginTop: 0 }}>Your apps — Android APK + iPhone web</h3>
      <p className={styles.muted}>
        <strong>Customer</strong> diners ko do · <strong>Staff</strong> team / POS / kitchen ko. In-app
        logo & name = Settings (live). Code <strong>{code || "—"}</strong> locked — kisi aur kitchen se
        merge nahi.
      </p>
      <div className={styles.row} style={{ alignItems: "center", marginBottom: "0.75rem" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 10 }} />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              background: "#1c1916",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            {name.slice(0, 1)}
          </div>
        )}
        <div>
          <strong>{name}</strong>
          <p className={styles.muted} style={{ margin: 0 }}>
            Code {code} · Android APK or iPhone Add to Home Screen
          </p>
        </div>
      </div>

      <div
        style={{
          marginBottom: "1.1rem",
          padding: "0.85rem 0.9rem",
          borderRadius: 10,
          border: "1px solid #e8e4de",
          background: "#faf8f5",
        }}
      >
        <strong>iPhone / iPad — Install on iPhone</strong>
        <p className={styles.muted} style={{ margin: "0.35rem 0 0.65rem" }}>
          APK iPhone pe nahi chalti. Safari mein link kholo → Share → <strong>Add to Home Screen</strong>.
          Wahi kitchen branding + orders; Super HQ nahi.
        </p>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          <div>
            <div className={styles.muted} style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Customer (diners)
            </div>
            <div className={styles.row} style={{ gap: "0.4rem", flexWrap: "wrap" }}>
              <input
                readOnly
                value={customerUrl}
                style={{
                  flex: 1,
                  minWidth: "12rem",
                  fontSize: "0.78rem",
                  padding: "0.45rem 0.55rem",
                  borderRadius: 8,
                  border: "1px solid #ddd6cc",
                  background: "#fff",
                }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className={styles.btn}
                disabled={!customerUrl}
                onClick={() => void copyText("customer", customerUrl)}
              >
                {copied === "customer" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <div className={styles.muted} style={{ fontSize: "0.78rem", marginBottom: 4 }}>
              Staff / Admin / POS
            </div>
            <div className={styles.row} style={{ gap: "0.4rem", flexWrap: "wrap" }}>
              <input
                readOnly
                value={staffUrl}
                style={{
                  flex: 1,
                  minWidth: "12rem",
                  fontSize: "0.78rem",
                  padding: "0.45rem 0.55rem",
                  borderRadius: 8,
                  border: "1px solid #ddd6cc",
                  background: "#fff",
                }}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className={styles.btnGhost}
                disabled={!staffUrl}
                onClick={() => void copyText("staff", staffUrl)}
              >
                {copied === "staff" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
        <p className={styles.muted} style={{ margin: "0.65rem 0 0", fontSize: "0.78rem" }}>
          Home Screen icon/label change ke baad kabhi remove + re-add chahiye. In-app logo Settings se
          turant update hota hai. Staff pe <strong>Enable order sound</strong> ek baar tap karein.
        </p>
      </div>

      {note && <p className={styles.muted}>{note}</p>}
      {error && <p className={styles.muted}>{error}</p>}
      <strong style={{ display: "block", marginBottom: "0.5rem" }}>Android APK / Play AAB</strong>
      {apps.map((app) => (
        <div key={app.id} style={{ marginBottom: "1rem" }}>
          <strong>{app.id === "customer" ? "Customer" : "Staff"}</strong>
          <div className={styles.row} style={{ marginTop: "0.35rem" }}>
            <button
              type="button"
              className={app.id === "customer" ? styles.btn : styles.btnGhost}
              disabled={!app.available || busy === `${app.id}-apk` || !token}
              onClick={() => void download(app.id, app.filename, "apk")}
            >
              {busy === `${app.id}-apk`
                ? "Downloading…"
                : app.available
                  ? `Download ${app.id === "customer" ? "Customer" : "Staff"} APK`
                  : "APK pending (Super)"}
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              disabled={!app.aabAvailable || busy === `${app.id}-aab` || !token}
              onClick={() => void download(app.id, app.aabFilename || app.filename.replace(/\.apk$/i, ".aab"), "aab")}
            >
              {busy === `${app.id}-aab`
                ? "Downloading…"
                : app.aabAvailable
                  ? `Download Play Store AAB`
                  : "Play AAB pending (Super)"}
            </button>
          </div>
        </div>
      ))}
      <p className={styles.muted} style={{ marginBottom: 0 }}>
        Play Console (optional): upload <strong>AAB</strong> not APK — docs/PLAY-STORE.md. Super Apps
        tab uploads binaries; this card only downloads <em>your</em> kitchen’s files. iOS plan:{" "}
        docs/IOS-PWA-SAFE-PLAN.md.
      </p>
    </div>
  );
}
