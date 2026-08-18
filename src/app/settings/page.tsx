"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import styles from "../staff.module.css";

export default function SettingsPage() {
  const { tenant, api, refresh, user, token } = useStore();
  const [msg, setMsg] = useState("");
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    receiptFooter: "",
  });
  const [fees, setFees] = useState({
    deliveryFee: 0,
    packingFee: 0,
    serviceChargePercent: 0,
    taxRate: 0,
  });
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    if (!tenant) return;
    setBranding({
      name: tenant.branding.name,
      logoUrl: tenant.branding.logoUrl,
      receiptFooter: tenant.branding.receiptFooter,
    });
    setFees({
      deliveryFee: tenant.shop.deliveryFee || 0,
      packingFee: tenant.shop.packingFee || 0,
      serviceChargePercent: tenant.shop.serviceChargePercent || 0,
      taxRate: tenant.shop.taxRate || 0,
    });
  }, [tenant]);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "branding", branding }),
    });
    setMsg(res.ok ? "Branding saved" : "Failed");
    await refresh();
  }

  async function saveFees(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "fees", shop: fees }),
    });
    setMsg(res.ok ? "Fees saved" : "Failed");
    await refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({
        action: "changePassword",
        currentPassword: pw.current,
        newPassword: pw.next,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Password updated" : data.error || "Failed");
    if (res.ok) {
      setPw({ current: "", next: "" });
      await refresh();
    }
  }

  async function exportData(type: "menu" | "orders", format: "json" | "csv") {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `/api/export?type=${type}&format=${format}${type === "orders" ? `&from=${encodeURIComponent(from)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setMsg("Export failed");
      return;
    }
    if (format === "csv") {
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${tenant?.code}-${type}.csv`;
      a.click();
    } else {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${tenant?.code}-${type}.json`;
      a.click();
    }
    setMsg(`Exported ${type} (${format})`);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell title="Settings">
      <div className={styles.stack}>
        {user?.mustChangePassword && (
          <div className={styles.card} style={{ borderColor: "#f5c542" }}>
            <strong>Demo password in use</strong>
            <p className={styles.muted}>
              /lab demos OK — production pe password change zaroori hai.
            </p>
          </div>
        )}

        <form className={styles.form} onSubmit={saveBranding}>
          <h3 style={{ margin: 0 }}>Branding</h3>
          <input
            value={branding.name}
            onChange={(e) => setBranding({ ...branding, name: e.target.value })}
            placeholder="Restaurant name"
          />
          <input
            value={branding.logoUrl}
            onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
            placeholder="Logo URL"
          />
          <textarea
            value={branding.receiptFooter}
            onChange={(e) => setBranding({ ...branding, receiptFooter: e.target.value })}
            placeholder="Receipt footer"
            rows={2}
          />
          <button type="submit" className={styles.btn}>
            Save branding
          </button>
        </form>

        <form className={styles.form} onSubmit={saveFees}>
          <h3 style={{ margin: 0 }}>Fees (per tenant)</h3>
          <label className={styles.muted}>Delivery fee (PKR)</label>
          <input
            type="number"
            value={fees.deliveryFee}
            onChange={(e) => setFees({ ...fees, deliveryFee: Number(e.target.value) })}
          />
          <label className={styles.muted}>Packing fee</label>
          <input
            type="number"
            value={fees.packingFee}
            onChange={(e) => setFees({ ...fees, packingFee: Number(e.target.value) })}
          />
          <label className={styles.muted}>Service charge %</label>
          <input
            type="number"
            value={fees.serviceChargePercent}
            onChange={(e) => setFees({ ...fees, serviceChargePercent: Number(e.target.value) })}
          />
          <label className={styles.muted}>GST / tax %</label>
          <input
            type="number"
            value={fees.taxRate}
            onChange={(e) => setFees({ ...fees, taxRate: Number(e.target.value) })}
          />
          <button type="submit" className={styles.btn}>
            Save fees
          </button>
        </form>

        <form className={styles.form} onSubmit={changePassword}>
          <h3 style={{ margin: 0 }}>Change password</h3>
          <input
            type="password"
            placeholder="Current password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
          <input
            type="password"
            placeholder="New password (min 6)"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
          <button type="submit" className={styles.btn}>
            Update password
          </button>
        </form>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Backup / export</h3>
          <p className={styles.muted}>Localhost safety — download menu & orders.</p>
          <div className={styles.row}>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("menu", "json")}>
              Menu JSON
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("menu", "csv")}>
              Menu CSV
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("orders", "json")}>
              Orders JSON (30d)
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("orders", "csv")}>
              Orders CSV (30d)
            </button>
          </div>
          <p className={styles.muted} style={{ marginTop: 8 }}>
            LIVE se pehle yahan se backup lein. Mongo switch ke baad bhi export kaam karta hai.
          </p>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Upload logo (Cloudflare R2)</h3>
          <p className={styles.muted}>
            Vercel pe R2_* env set hon to yahan se upload. Warna logo URL field use karein.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !token) return;
              const fd = new FormData();
              fd.append("file", file);
              fd.append("kind", "logo");
              const res = await fetch("/api/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
              });
              const data = await res.json();
              if (!res.ok) {
                setMsg(data.error || data.hint || "Upload failed");
                return;
              }
              setBranding((b) => ({ ...b, logoUrl: data.url }));
              setMsg("Uploaded — Save branding dabao");
            }}
          />
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>QR / guest links</h3>
          <code>
            {origin}/order?tenant={tenant?.code}
          </code>
          <br />
          <code>
            {origin}/order?tenant={tenant?.code}&table=3
          </code>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Stock</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Low at</th>
              </tr>
            </thead>
            <tbody>
              {(tenant?.stock ?? []).map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.name} ({s.unit})
                    {s.quantity <= s.lowThreshold ? " ⚠" : ""}
                  </td>
                  <td>{s.quantity}</td>
                  <td>{s.lowThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
