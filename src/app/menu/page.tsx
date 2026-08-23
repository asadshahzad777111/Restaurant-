"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { uploadTenantMedia } from "@/lib/media-client";
import { money } from "@/lib/fees";
import type { MenuItem } from "@/lib/tenant-types";
import styles from "../staff.module.css";

export default function MenuPage() {
  const { tenant, api, applyTenant, token } = useStore();
  const emptyDraft = {
    name: "",
    description: "",
    price: "",
    costPrice: "",
    category: "Burgers",
    isDeal: false,
    dealLabel: "",
    compareAtPrice: "",
    imageUrl: "",
  };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  async function deleteItem(itemId: string) {
    if (!tenant) return;
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({
        action: "menu",
        menu: tenant.menu.filter((m) => m.id !== itemId).map((m) => ({ ...m, modifiers: m.modifiers ?? [] })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg((data as { error?: string }).error || "Failed");
      return;
    }
    if ((data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
    if (editingId === itemId) clearDraft();
    setMsg("Item deleted");
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      costPrice: item.costPrice != null ? String(item.costPrice) : "",
      category: item.isDeal ? "Burgers" : item.category,
      isDeal: !!item.isDeal,
      dealLabel: item.dealLabel || "",
      compareAtPrice: item.compareAtPrice != null ? String(item.compareAtPrice) : "",
      imageUrl: item.imageUrl || "",
    });
    setMsg("");
  }

  function clearDraft() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    const fields = {
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      costPrice: draft.costPrice !== "" ? Number(draft.costPrice) : undefined,
      category: draft.isDeal ? "Deals" : draft.category,
      isDeal: draft.isDeal,
      dealLabel: draft.dealLabel || undefined,
      compareAtPrice: draft.compareAtPrice ? Number(draft.compareAtPrice) : undefined,
      imageUrl: draft.imageUrl || undefined,
      imageEmoji: draft.isDeal ? "🔥" : "🍽️",
    };
    if (editingId) {
      await saveMenu(
        tenant.menu.map((m) =>
          m.id === editingId ? { ...m, ...fields, modifiers: m.modifiers ?? [] } : m,
        ),
      );
    } else {
      const item: MenuItem = {
        id: `m_${Date.now()}`,
        available: true,
        modifiers: [],
        ...fields,
      };
      await saveMenu([item, ...tenant.menu]);
    }
    clearDraft();
  }

  return (
    <AppShell title="Menu">
      <PlanGate need="menu">
      <div className={styles.stack}>
        <form className={styles.form} onSubmit={addItem}>
          <h3 style={{ margin: 0 }}>{editingId ? "Edit item" : "Add item / deal"}</h3>
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
            type="number"
            placeholder="Cost price (Profit Profile — hidden from guests)"
            value={draft.costPrice}
            onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })}
          />
          <input
            placeholder="Image URL (https://...)"
            value={draft.imageUrl}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
          />
          <label className={styles.muted}>
            Or upload photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMsg("Uploading image…");
                try {
                  const saved = await uploadTenantMedia(token, "menu", file);
                  setDraft((d) => ({ ...d, imageUrl: saved.url }));
                  setMsg(`Image uploaded (${saved.storage})`);
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Image upload failed");
                }
              }}
            />
          </label>
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
          <div className={styles.row}>
            <button type="submit" className={styles.btn}>
              {editingId ? "Save changes" : "Add"}
            </button>
            {editingId && (
              <button type="button" className={styles.btnGhost} onClick={clearDraft}>
                Cancel
              </button>
            )}
          </div>
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
                  {m.category} · {tenant ? money(tenant.shop.currency, m.price) : m.price}
                </p>
              </div>
              <div className={styles.cardActions}>
                <button type="button" className={styles.btnGhost} onClick={() => startEdit(m)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={m.available ? styles.btnGhost : styles.btn}
                  onClick={() => void toggle86(m.id)}
                >
                  {m.available ? "86" : "Restore"}
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    if (window.confirm(`Delete ${m.name}?`)) void deleteItem(m.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {(tenant?.menu ?? []).length === 0 && (
            <li className={styles.mobileCard}>
              <p className={styles.muted}>No items yet — add your first item above.</p>
            </li>
          )}
        </ul>
        <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
        <table className={`${styles.table} ${styles.tableDesktop}`}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>86 / Available</th>
              <th></th>
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
                <td>{tenant ? money(tenant.shop.currency, m.price) : m.price}</td>
                <td>
                  <button
                    type="button"
                    className={m.available ? styles.btnGhost : styles.btn}
                    onClick={() => void toggle86(m.id)}
                  >
                    {m.available ? "Available · tap 86" : "86 · tap to restore"}
                  </button>
                </td>
                <td>
                  <div className={styles.row}>
                    <button type="button" className={styles.btnGhost} onClick={() => startEdit(m)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => {
                        if (window.confirm(`Delete ${m.name}?`)) void deleteItem(m.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(tenant?.menu ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className={styles.muted} style={{ padding: "1rem" }}>
                  No items yet — add your first item above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      </PlanGate>
    </AppShell>
  );
}
