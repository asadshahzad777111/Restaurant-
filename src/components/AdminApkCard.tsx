"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import styles from "@/app/staff.module.css";

type ApkInfo = {
  id: "staff" | "customer";
  title: string;
  filename: string;
  available: boolean;
  sizeBytes: number;
  updatedAt: string | null;
  loadsPath: string;
};

export function AdminApkCard() {
  const { api, tenant, token } = useStore();
  const [apps, setApps] = useState<ApkInfo[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

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

  async function download(slot: "staff" | "customer", filename: string) {
    setBusy(slot);
    try {
      const res = await api(`/api/admin/apks?download=${slot}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        window.alert((err as { error?: string }).error || "APK not ready — ask ORDO Super to upload yours");
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

  const name = tenant?.branding.name || tenant?.code || "Restaurant";
  const logo = tenant?.branding.logoUrl || "";

  return (
    <div className={styles.card}>
      <h3 style={{ marginTop: 0 }}>Your apps (for customers & staff)</h3>
      <p className={styles.muted}>
        Phone pe naam aur logo isi kitchen ke Settings branding se match karte hain. Customer APK sirf{" "}
        <strong>{tenant?.code}</strong> ke menu/orders kholti hai — kisi aur restaurant se merge nahi hoti.
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
            Code {tenant?.code} · change name/logo above, then Super rebuilds branded APK labels
          </p>
        </div>
      </div>
      {note && <p className={styles.muted}>{note}</p>}
      {error && <p className={styles.muted}>{error}</p>}
      <div className={styles.row}>
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className={app.id === "customer" ? styles.btn : styles.btnGhost}
            disabled={!app.available || busy === app.id || !token}
            onClick={() => void download(app.id, app.filename)}
          >
            {busy === app.id
              ? "Downloading…"
              : app.available
                ? `Download ${app.id === "customer" ? "Customer APK" : "Staff APK"}`
                : `${app.id === "customer" ? "Customer" : "Staff"} APK pending (Super upload)`}
          </button>
        ))}
      </div>
      <p className={styles.muted} style={{ marginBottom: 0 }}>
        Customers ko sirf <strong>Customer APK</strong> do. Staff APK kitchen team ke liye hai.
      </p>
    </div>
  );
}
