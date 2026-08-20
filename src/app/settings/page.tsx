"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { apiUrl } from "@/lib/urls";
import { planAllows, upgradeHint } from "@/lib/plans";
import type { TenantUser } from "@/lib/tenant-types";
import type { Permission } from "@/lib/types";
import styles from "../staff.module.css";

export default function SettingsPage() {
  const { tenant, api, refresh, token, planId } = useStore();
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
  const [staffForm, setStaffForm] = useState({
    username: "",
    password: "",
    roleLabel: "Cashier",
  });

  const canLogo = planAllows(planId, "logo");
  const canStaff = planAllows(planId, "staff");

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
    const payload = canLogo
      ? branding
      : {
          name: branding.name,
          receiptFooter: branding.receiptFooter,
          logoUrl: tenant?.branding.logoUrl || "",
        };
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "branding", branding: payload }),
    });
    setMsg(res.ok ? "Saved" : "Failed");
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

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !canStaff) return;
    const users: TenantUser[] = [
      ...tenant.users,
      {
        id: `user_${Date.now()}`,
        username: staffForm.username.trim(),
        password: staffForm.password,
        role: "staff",
        roleLabel: staffForm.roleLabel,
        permissions: ["home", "pos", "orders", "kitchen"] as Permission[],
        active: true,
      },
    ];
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "staff", users }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Staff added" : data.error || "Failed");
    if (res.ok) {
      setStaffForm({ username: "", password: "", roleLabel: "Cashier" });
      await refresh();
    }
  }

  async function exportData(type: "menu" | "orders", format: "json" | "csv") {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = apiUrl(
      `/api/export?type=${type}&format=${format}${type === "orders" ? `&from=${encodeURIComponent(from)}` : ""}`,
    );
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

  async function backupToR2() {
    if (!token) return;
    setMsg("Uploading backup to R2…");
    const res = await fetch(apiUrl("/api/backup"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || data.hint || "R2 backup failed");
      return;
    }
    setMsg(`R2 backup OK — ${data.key}`);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell title="Settings">
      <div className={styles.stack}>
        <form className={styles.form} onSubmit={saveBranding}>
          <h3 style={{ margin: 0 }}>Restaurant name</h3>
          <input
            value={branding.name}
            onChange={(e) => setBranding({ ...branding, name: e.target.value })}
            placeholder="Restaurant name"
          />
          <textarea
            value={branding.receiptFooter}
            onChange={(e) => setBranding({ ...branding, receiptFooter: e.target.value })}
            placeholder="Receipt footer"
            rows={2}
          />
          {canLogo ? (
            <input
              value={branding.logoUrl}
              onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              placeholder="Logo URL"
            />
          ) : (
            <div className={styles.upgrade}>
              <strong>Logo locked on Starter</strong>
              <p className={styles.muted} style={{ margin: "0.35rem 0 0", color: "inherit" }}>
                {upgradeHint(planId)}
              </p>
            </div>
          )}
          <button type="submit" className={styles.btn}>
            Save
          </button>
        </form>

        {canLogo && (
          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Upload logo</h3>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !token) return;
                const fd = new FormData();
                fd.append("file", file);
                fd.append("kind", "logo");
                const res = await fetch(apiUrl("/api/upload"), {
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
                setMsg("Uploaded — tap Save above");
              }}
            />
          </div>
        )}

        {canStaff ? (
          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Staff</h3>
            <p className={styles.muted}>Add cashiers / kitchen logins for this restaurant only.</p>
            <ul className={styles.muted}>
              {(tenant?.users ?? []).map((u) => (
                <li key={u.id}>
                  {u.username} · {u.roleLabel} ({u.role})
                </li>
              ))}
            </ul>
            <form
              className={styles.form}
              style={{ maxWidth: "100%", border: "none", padding: 0 }}
              onSubmit={addStaff}
            >
              <input
                required
                placeholder="Username"
                value={staffForm.username}
                onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              />
              <input
                placeholder="Role label"
                value={staffForm.roleLabel}
                onChange={(e) => setStaffForm({ ...staffForm, roleLabel: e.target.value })}
              />
              <button type="submit" className={styles.btn}>
                Add staff login
              </button>
            </form>
          </div>
        ) : (
          <div className={styles.upgrade}>
            <strong>Staff logins locked on Starter</strong>
            <p className={styles.muted} style={{ margin: "0.35rem 0 0", color: "inherit" }}>
              Starter is one owner login for simple billing. Pro (₨2,500) unlocks staff accounts.
            </p>
          </div>
        )}

        <form className={styles.form} onSubmit={saveFees}>
          <h3 style={{ margin: 0 }}>Fees</h3>
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
          <div className={styles.row}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void exportData("menu", "json")}
            >
              Menu JSON
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void exportData("orders", "csv")}
            >
              Orders CSV
            </button>
            <button type="button" className={styles.btn} onClick={() => void backupToR2()}>
              Backup to R2
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Guest QR links</h3>
          <code>
            {origin}/order?tenant={tenant?.code}
          </code>
        </div>

        {planAllows(planId, "stock") && (
          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Stock</h3>
            <div className={styles.tableWrap}>
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
          </div>
        )}

        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
