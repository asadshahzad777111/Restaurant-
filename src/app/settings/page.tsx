"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import type { StockItem, TenantUser } from "@/lib/tenant-types";
import styles from "../staff.module.css";

const PERMS: Permission[] = [
  "home",
  "pos",
  "orders",
  "kitchen",
  "menu",
  "stock",
  "settings",
  "staff",
];

export default function SettingsPage() {
  const { tenant, api, refresh } = useStore();
  const [msg, setMsg] = useState("");
  const [branding, setBranding] = useState({
    name: tenant?.branding.name || "",
    logoUrl: tenant?.branding.logoUrl || "",
    receiptFooter: tenant?.branding.receiptFooter || "",
  });
  const [staffForm, setStaffForm] = useState({
    username: "",
    password: "",
    roleLabel: "Staff",
    permissions: ["home", "pos"] as Permission[],
  });

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "branding", branding }),
    });
    setMsg(res.ok ? "Branding saved" : "Failed");
    await refresh();
  }

  async function saveStock(stock: StockItem[]) {
    await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "stock", stock }),
    });
    await refresh();
    setMsg("Stock saved");
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const user: TenantUser = {
      id: `user_${Date.now()}`,
      username: staffForm.username,
      password: staffForm.password,
      role: "staff",
      roleLabel: staffForm.roleLabel,
      permissions: staffForm.permissions,
      active: true,
    };
    await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "staff", users: [...tenant.users, user] }),
    });
    setStaffForm({ username: "", password: "", roleLabel: "Staff", permissions: ["home", "pos"] });
    await refresh();
    setMsg("Staff added");
  }

  function updateStockQty(id: string, quantity: number) {
    if (!tenant) return;
    void saveStock(tenant.stock.map((s) => (s.id === id ? { ...s, quantity } : s)));
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <AppShell title="Settings">
      <div className={styles.stack}>
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
            {origin}/order?tenant={tenant?.code}&table=7
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
                  </td>
                  <td>
                    <input
                      type="number"
                      defaultValue={s.quantity}
                      style={{ width: 80 }}
                      onBlur={(e) => updateStockQty(s.id, Number(e.target.value))}
                    />
                  </td>
                  <td>{s.lowThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className={styles.form} onSubmit={addStaff}>
          <h3 style={{ margin: 0 }}>Add staff</h3>
          <input
            required
            placeholder="Username"
            value={staffForm.username}
            onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
          />
          <input
            required
            placeholder="Password"
            value={staffForm.password}
            onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
          />
          <input
            placeholder="Role label"
            value={staffForm.roleLabel}
            onChange={(e) => setStaffForm({ ...staffForm, roleLabel: e.target.value })}
          />
          <div className={styles.row}>
            {PERMS.map((p) => (
              <label key={p}>
                <input
                  type="checkbox"
                  checked={staffForm.permissions.includes(p)}
                  onChange={(e) => {
                    setStaffForm({
                      ...staffForm,
                      permissions: e.target.checked
                        ? [...staffForm.permissions, p]
                        : staffForm.permissions.filter((x) => x !== p),
                    });
                  }}
                />{" "}
                {p}
              </label>
            ))}
          </div>
          <button type="submit" className={styles.btn}>
            Add staff
          </button>
        </form>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Label</th>
              <th>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {(tenant?.users ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.roleLabel}</td>
                <td>{u.permissions.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
