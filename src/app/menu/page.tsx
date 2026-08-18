"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { MenuItem } from "@/lib/tenant-types";
import styles from "../staff.module.css";

export default function MenuPage() {
  const { tenant, api, refresh } = useStore();
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    price: "",
    category: "Mains",
    isDeal: false,
    dealLabel: "",
    compareAtPrice: "",
  });
  const [msg, setMsg] = useState("");

  async function saveMenu(menu: MenuItem[]) {
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "menu", menu }),
    });
    if (!res.ok) {
      const d = await res.json();
      setMsg(d.error || "Failed");
      return;
    }
    setMsg("Saved");
    await refresh();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const item: MenuItem = {
      id: `m_${Date.now()}`,
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      category: draft.isDeal ? "Deals" : draft.category,
      available: true,
      isDeal: draft.isDeal,
      dealLabel: draft.dealLabel || undefined,
      compareAtPrice: draft.compareAtPrice ? Number(draft.compareAtPrice) : undefined,
      imageEmoji: draft.isDeal ? "🔥" : "🍽️",
    };
    await saveMenu([item, ...tenant.menu]);
    setDraft({
      name: "",
      description: "",
      price: "",
      category: "Mains",
      isDeal: false,
      dealLabel: "",
      compareAtPrice: "",
    });
  }

  async function toggle(item: MenuItem) {
    if (!tenant) return;
    await saveMenu(
      tenant.menu.map((m) => (m.id === item.id ? { ...m, available: !m.available } : m)),
    );
  }

  return (
    <AppShell title="Menu">
      <div className={styles.stack}>
        <form className={styles.form} onSubmit={addItem}>
          <h3 style={{ margin: 0 }}>Add item / deal</h3>
          <input
            required
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <input
            required
            type="number"
            placeholder="Price"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={draft.isDeal}
              onChange={(e) => setDraft({ ...draft, isDeal: e.target.checked })}
            />{" "}
            Deal
          </label>
          {!draft.isDeal && (
            <input
              placeholder="Category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          )}
          {draft.isDeal && (
            <>
              <input
                placeholder="Deal label"
                value={draft.dealLabel}
                onChange={(e) => setDraft({ ...draft, dealLabel: e.target.value })}
              />
              <input
                type="number"
                placeholder="Compare at price"
                value={draft.compareAtPrice}
                onChange={(e) => setDraft({ ...draft, compareAtPrice: e.target.value })}
              />
            </>
          )}
          <button type="submit" className={styles.btn}>
            Add
          </button>
          {msg && <p className={styles.muted}>{msg}</p>}
        </form>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {(tenant?.menu ?? []).map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {m.isDeal ? " · deal" : ""}
                </td>
                <td>{m.category}</td>
                <td>{m.price}</td>
                <td>
                  <button type="button" className={styles.btnGhost} onClick={() => void toggle(m)}>
                    {m.available ? "On" : "Off"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
