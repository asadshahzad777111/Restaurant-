"use client";

import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
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

  const name = tenant?.branding.name || tenant?.code || "Restaurant";
  const logo = tenant?.branding.logoUrl || "";
  const code = tenant?.code || "";

  return (
    <div className={styles.card}>
      <h3 style={{ marginTop: 0 }}>Your apps — Android APK</h3>
      <p className={styles.muted}>
        <strong>Customer APK</strong> diners (Android) · <strong>Staff APK</strong> team / POS /
        kitchen. In-app logo & name = Settings. Code <strong>{code || "—"}</strong> locked.{" "}
        <strong>iPhone</strong> users: see <em>Install on iPhone</em> below (web / Add to Home Screen).
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
            Code {code} · Android APK / Play AAB
          </p>
        </div>
      </div>

      {note && <p className={styles.muted}>{note}</p>}
      {error && <p className={styles.muted}>{error}</p>}
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
        Play Console (optional): upload <strong>AAB</strong> not APK — docs/PLAY-STORE.md. iPhone:{" "}
        docs/IOS-PWA-SAFE-PLAN.md.
      </p>
    </div>
  );
}
