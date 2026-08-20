"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { Permission } from "@/lib/types";
import type { TenantUser } from "@/lib/tenant-types";
import styles from "../staff.module.css";

const PERMS: { id: Permission; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "pos", label: "POS / counter" },
  { id: "orders", label: "Orders / billing" },
  { id: "kitchen", label: "Kitchen" },
  { id: "menu", label: "Menu" },
  { id: "stock", label: "Stock" },
  { id: "settings", label: "Settings" },
  { id: "staff", label: "Staff" },
];

const STATION_PRESETS: Record<string, { roleLabel: string; permissions: Permission[] }> = {
  counter: {
    roleLabel: "Counter",
    permissions: ["home", "pos", "orders"],
  },
  kitchen: {
    roleLabel: "Kitchen",
    permissions: ["home", "kitchen", "orders"],
  },
  full: {
    roleLabel: "Floor",
    permissions: ["home", "pos", "orders", "kitchen"],
  },
};

export default function StaffPage() {
  const { tenant, user, api, applyTenant } = useStore();
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState({
    username: "",
    password: "",
    email: "",
    roleLabel: "Cashier",
    permissions: ["home", "pos", "orders"] as Permission[],
  });

  const canManage = user?.role === "admin" || user?.permissions.includes("staff");

  async function saveUsers(users: TenantUser[]) {
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "staff", users }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg((data as { error?: string }).error || "Failed");
      return;
    }
    if ((data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
    setMsg("Saved");
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !canManage) return;
    if (tenant.users.some((u) => u.username.toLowerCase() === draft.username.trim().toLowerCase())) {
      setMsg("Username already exists on this kitchen");
      return;
    }
    const next: TenantUser = {
      id: `user_${Date.now()}`,
      username: draft.username.trim(),
      password: draft.password,
      email: draft.email.trim() || undefined,
      role: "staff",
      roleLabel: draft.roleLabel.trim() || "Staff",
      permissions: draft.permissions,
      active: true,
    };
    await saveUsers([...tenant.users, next]);
    setDraft({
      username: "",
      password: "",
      email: "",
      roleLabel: "Cashier",
      permissions: ["home", "pos", "orders"],
    });
  }

  async function toggleActive(id: string) {
    if (!tenant || !canManage) return;
    if (id === user?.id) {
      setMsg("You cannot disable your own login");
      return;
    }
    await saveUsers(tenant.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  }

  function togglePerm(id: Permission) {
    setDraft((d) => ({
      ...d,
      permissions: d.permissions.includes(id)
        ? d.permissions.filter((p) => p !== id)
        : [...d.permissions, id],
    }));
  }

  return (
    <AppShell title="Staff">
      <div className={styles.stack}>
        <p className={styles.muted}>
          Logins belong to {tenant?.code} only. Staff from another restaurant cannot sign in here.
        </p>

        {canManage && (
          <form className={styles.form} onSubmit={(e) => void addStaff(e)}>
            <h3 style={{ margin: 0 }}>Add staff</h3>
            <p className={styles.muted}>Station presets (AsFix Counter / Kitchen)</p>
            <div className={styles.row}>
              {Object.entries(STATION_PRESETS).map(([id, preset]) => (
                <button
                  key={id}
                  type="button"
                  className={styles.btnGhost}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      roleLabel: preset.roleLabel,
                      permissions: [...preset.permissions],
                    }))
                  }
                >
                  {preset.roleLabel}
                </button>
              ))}
            </div>
            <input
              required
              placeholder="Username"
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
              autoComplete="off"
            />
            <input
              required
              type="password"
              placeholder="Password (min 6)"
              minLength={6}
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            />
            <input
              type="email"
              placeholder="Gmail (optional — for Google staff login)"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            <input
              required
              placeholder="Role label (Cashier, Kitchen…)"
              value={draft.roleLabel}
              onChange={(e) => setDraft({ ...draft, roleLabel: e.target.value })}
            />
            <div className={styles.row} style={{ marginTop: 0 }}>
              {PERMS.map((p) => (
                <label key={p.id} className={styles.muted}>
                  <input
                    type="checkbox"
                    checked={draft.permissions.includes(p.id)}
                    onChange={() => togglePerm(p.id)}
                  />{" "}
                  {p.label}
                </label>
              ))}
            </div>
            <button type="submit" className={styles.btn}>
              Add to this kitchen
            </button>
          </form>
        )}

        <ul className={styles.mobileCards}>
          {(tenant?.users ?? []).map((u) => (
            <li key={u.id} className={styles.mobileCard}>
              <strong>{u.username}</strong>
              <p className={styles.muted}>
                {u.roleLabel} · {u.role} · {u.active ? "active" : "off"}
                {u.email ? ` · ${u.email}` : ""}
              </p>
              {canManage && u.id !== user?.id && (
                <button type="button" className={styles.btnGhost} onClick={() => void toggleActive(u.id)}>
                  {u.active ? "Disable" : "Enable"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
          <table className={`${styles.table} ${styles.tableDesktop}`}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Access</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(tenant?.users ?? []).map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.roleLabel}</td>
                  <td>{(u.permissions || []).join(", ")}</td>
                  <td>{u.active ? "active" : "off"}</td>
                  <td>
                    {canManage && u.id !== user?.id ? (
                      <button type="button" className={styles.btnGhost} onClick={() => void toggleActive(u.id)}>
                        {u.active ? "Disable" : "Enable"}
                      </button>
                    ) : null}
                  </td>
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
