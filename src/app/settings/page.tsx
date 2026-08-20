"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import styles from "../staff.module.css";

export default function SettingsPage() {
  const { tenant, api, applyTenant, user, token } = useStore();
  const [msg, setMsg] = useState("");
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    receiptFooter: "",
    address: "",
    phone: "",
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
      address: tenant.shop.address || "",
      phone: tenant.shop.phone || "",
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
      body: JSON.stringify({
        action: "branding",
        branding: {
          name: branding.name,
          logoUrl: branding.logoUrl,
          receiptFooter: branding.receiptFooter,
        },
        shop: { address: branding.address, phone: branding.phone },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Branding saved" : "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
  }

  async function saveFees(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "fees", shop: fees }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Fees saved" : "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
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
            placeholder="Receipt footer (English or Urdu)"
            rows={2}
          />
          <input
            value={branding.address}
            onChange={(e) => setBranding({ ...branding, address: e.target.value })}
            placeholder="Shop address (prints on 58mm bill)"
          />
          <input
            value={branding.phone}
            onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
            placeholder="Shop phone (prints on 58mm footer)"
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
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>QR / guest links</h3>
          <p className={styles.muted}>Print these on table tents — each restaurant uses its own code.</p>
          <code>
            {origin}/guest
          </code>
          <br />
          <code>
            {origin}/scan
          </code>
          <br />
          <code>
            {origin}/order?tenant={tenant?.code}
          </code>
          <br />
          <code>
            {origin}/order?tenant={tenant?.code}&table=3
          </code>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Staff on this kitchen</h3>
          <p className={styles.muted}>Users belong to {tenant?.code} only — never another restaurant.</p>
          <ul className={styles.mobileCards}>
            {(tenant?.users ?? []).map((u) => (
              <li key={u.id} className={styles.mobileCard}>
                <strong>{u.username}</strong>
                <p className={styles.muted}>
                  {u.roleLabel} · {u.active ? "active" : "off"}
                </p>
              </li>
            ))}
          </ul>
          <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
            <table className={`${styles.table} ${styles.tableDesktop}`}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(tenant?.users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.roleLabel}</td>
                    <td>{u.active ? "active" : "off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Stock</h3>
          <ul className={styles.mobileCards}>
            {(tenant?.stock ?? []).map((s) => (
              <li key={s.id} className={styles.mobileCard}>
                <strong>
                  {s.name} ({s.unit})
                  {s.quantity <= s.lowThreshold ? " ⚠" : ""}
                </strong>
                <p className={styles.muted}>
                  Qty {s.quantity} · low at {s.lowThreshold}
                </p>
              </li>
            ))}
          </ul>
          <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
          <table className={`${styles.table} ${styles.tableDesktop}`}>
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
        </div>

        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
