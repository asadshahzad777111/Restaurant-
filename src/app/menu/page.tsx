"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { MenuItem } from "@/lib/tenant-types";
import styles from "../staff.module.css";

export default function MenuPage() {
  const { tenant, api, applyTenant } = useStore();
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    price: "",
    category: "Burgers",
    isDeal: false,
    dealLabel: "",
    compareAtPrice: "",
    imageUrl: "",
  });
  const [msg, setMsg] = useState("");

  async function saveMenu(menu: MenuItem[]) {
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "menu", menu }),
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

  async function toggle86(itemId: string) {
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "toggle86", itemId }),
    });
    const data = await res.json().catch(() => ({}));
    if ((data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
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
      imageUrl: draft.imageUrl || undefined,
      imageEmoji: draft.isDeal ? "🔥" : "🍽️",
      modifiers: [],
    };
    await saveMenu([item, ...tenant.menu]);
    setDraft({
      name: "",
      description: "",
      price: "",
      category: "Burgers",
      isDeal: false,
      dealLabel: "",
      compareAtPrice: "",
      imageUrl: "",
    });
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
          <input
            placeholder="Image URL (https://...)"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
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
        <ul className={styles.mobileCards}>
            {(tenant?.menu ?? []).map((m) => (
            <li key={m.id} className={styles.mobileCard}>
              <div>
                <strong>
                  {m.name}
                  {m.isDeal ? " · deal" : ""}
                  {(m.modifiers?.length || 0) > 0 ? " · mods" : ""}
                </strong>
                <p className={styles.muted}>
                  {m.category} · {tenant?.shop.currency} {m.price}
                </p>
              </div>
              <button
                type="button"
                className={m.available ? styles.btnGhost : styles.btn}
                onClick={() => void toggle86(m.id)}
              >
                {m.available ? "86" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
        <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
        <table className={`${styles.table} ${styles.tableDesktop}`}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>86 / Available</th>
            </tr>
          </thead>
          <tbody>
            {(tenant?.menu ?? []).map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {m.isDeal ? " · deal" : ""}
                  {(m.modifiers?.length || 0) > 0 ? " · mods" : ""}
                </td>
                <td>{m.category}</td>
                <td>{m.price}</td>
                <td>
                  <button
                    type="button"
                    className={m.available ? styles.btnGhost : styles.btn}
                    onClick={() => void toggle86(m.id)}
                  >
                    {m.available ? "Available · tap 86" : "86 · tap to restore"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}
