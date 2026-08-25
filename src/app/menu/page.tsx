"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import { uploadTenantMedia } from "@/lib/media-client";
import { money } from "@/lib/fees";
import type { MenuItem, ModifierGroup, ModifierOption } from "@/lib/tenant-types";
import styles from "../staff.module.css";

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

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
  prepMin: "",
  tags: [] as string[],
  modifiers: [] as ModifierGroup[],
};

/** One-tap templates so the admin can add options without any complexity. */
const MOD_TEMPLATES: Array<{ label: string; group: ModifierGroup }> = [
  {
    label: "Size",
    group: {
      id: "",
      name: "Size",
      required: true,
      multi: false,
      options: [
        { id: "", name: "Medium", priceDelta: 0 },
        { id: "", name: "Large", priceDelta: 200 },
        { id: "", name: "Extra Large", priceDelta: 400 },
      ],
    },
  },
  {
    label: "Sauce / Spice",
    group: {
      id: "",
      name: "Spice level",
      required: true,
      multi: false,
      options: [
        { id: "", name: "Mild", priceDelta: 0 },
        { id: "", name: "Medium", priceDelta: 0 },
        { id: "", name: "Spicy", priceDelta: 0 },
      ],
    },
  },
  {
    label: "Add-ons",
    group: {
      id: "",
      name: "Add-ons",
      required: false,
      multi: true,
      options: [
        { id: "", name: "Extra cheese", priceDelta: 150 },
        { id: "", name: "Extra patty", priceDelta: 300 },
        { id: "", name: "Fries", priceDelta: 250 },
      ],
    },
  },
];

function freshGroup(template?: ModifierGroup): ModifierGroup {
  return {
    id: uid(),
    name: template?.name || "",
    required: template?.required ?? false,
    multi: template?.multi ?? false,
    options: (template?.options || []).map((o) => ({ id: uid(), name: o.name, priceDelta: o.priceDelta })),
  };
}

export default function MenuPage() {
  const { tenant, api, applyTenant, token } = useStore();
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
      prepMin: item.prepMin != null ? String(item.prepMin) : "",
      tags: item.tags || [],
      modifiers: (item.modifiers || []).map((g) => ({
        ...g,
        id: g.id || uid(),
        options: g.options.map((o) => ({ ...o, id: o.id || uid() })),
      })),
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
      prepMin: draft.prepMin !== "" ? Math.max(1, Math.min(180, Number(draft.prepMin) || 0)) : undefined,
      tags: draft.tags.length ? [...draft.tags] : undefined,
    };
    const modifiers = draft.modifiers
      .filter((g) => g.name.trim() && g.options.some((o) => o.name.trim()))
      .map((g) => ({
        ...g,
        name: g.name.trim(),
        options: g.options.filter((o) => o.name.trim()).map((o) => ({ ...o, name: o.name.trim() })),
      }));
    if (editingId) {
      await saveMenu(
        tenant.menu.map((m) => (m.id === editingId ? { ...m, ...fields, modifiers } : m)),
      );
    } else {
      const item: MenuItem = {
        id: `m_${Date.now()}`,
        available: true,
        modifiers,
        ...fields,
      };
      await saveMenu([item, ...tenant.menu]);
    }
    clearDraft();
  }

  function updateGroup(idx: number, patch: Partial<ModifierGroup>) {
    setDraft((d) => ({
      ...d,
      modifiers: d.modifiers.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    }));
  }

  function updateOption(gIdx: number, oIdx: number, patch: Partial<ModifierOption>) {
    setDraft((d) => ({
      ...d,
      modifiers: d.modifiers.map((g, i) =>
        i === gIdx ? { ...g, options: g.options.map((o, k) => (k === oIdx ? { ...o, ...patch } : o)) } : g,
      ),
    }));
  }

  function removeGroup(idx: number) {
    setDraft((d) => ({ ...d, modifiers: d.modifiers.filter((_, i) => i !== idx) }));
  }

  function removeOption(gIdx: number, oIdx: number) {
    setDraft((d) => ({
      ...d,
      modifiers: d.modifiers.map((g, i) =>
        i === gIdx ? { ...g, options: g.options.filter((_, k) => k !== oIdx) } : g,
      ),
    }));
  }

  function addOption(gIdx: number) {
    setDraft((d) => ({
      ...d,
      modifiers: d.modifiers.map((g, i) =>
        i === gIdx ? { ...g, options: [...g.options, { id: uid(), name: "", priceDelta: 0 }] } : g,
      ),
    }));
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
          <input
            type="number"
            min={1}
            max={180}
            placeholder="Prep time (minutes, e.g. 12) — shown to guests"
            value={draft.prepMin}
            onChange={(e) => setDraft({ ...draft, prepMin: e.target.value.replace(/[^\d]/g, "") })}
          />
          <div className={styles.badgeRow}>
            {(["bestseller", "new", "spicy"] as const).map((tag) => {
              const on = draft.tags.includes(tag);
              return (
                <label key={tag} className={`${styles.badgeChip}${on ? ` ${styles.badgeChipOn}` : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        tags: on ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
                      }))
                    }
                  />{" "}
                  {tag === "bestseller" ? "🔥 Bestseller" : tag === "new" ? "🆕 New" : "🌶️ Spicy"}
                </label>
              );
            })}
          </div>
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

          {/* ---- Modifier / extra options editor ---- */}
          <div className={styles.modsEditor}>
            <div className={styles.modsEditorHead}>
              <strong style={{ display: "block" }}>Extra options</strong>
              <span className={styles.muted}>
                Size, spice, add-ons — show these as choices when a customer orders this item.
              </span>
            </div>

            {draft.modifiers.length > 0 && (
              <div className={styles.modsList}>
                {draft.modifiers.map((g, gIdx) => (
                  <div key={g.id} className={styles.modGroup}>
                    <div className={styles.modGroupRow}>
                      <input
                        placeholder="Group name (e.g. Size, Spice, Add-ons)"
                        value={g.name}
                        onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        className={styles.btnGhost}
                        aria-label="Remove group"
                        onClick={() => removeGroup(gIdx)}
                      >
                        ✕
                      </button>
                    </div>
                    <div className={styles.row}>
                      <label className={styles.muted}>
                        <input
                          type="checkbox"
                          checked={g.required}
                          onChange={(e) => updateGroup(gIdx, { required: e.target.checked })}
                        />{" "}
                        Required (must pick one)
                      </label>
                      <label className={styles.muted}>
                        <input
                          type="checkbox"
                          checked={g.multi}
                          onChange={(e) => updateGroup(gIdx, { multi: e.target.checked })}
                        />{" "}
                        Multi-select (pick several)
                      </label>
                    </div>
                    <div className={styles.modOptions}>
                      {g.options.map((o, oIdx) => (
                        <div key={o.id} className={styles.modOptionRow}>
                          <input
                            placeholder="Option (e.g. Large, Spicy, Extra cheese)"
                            value={o.name}
                            onChange={(e) => updateOption(gIdx, oIdx, { name: e.target.value })}
                          />
                          <input
                            type="number"
                            min={0}
                            placeholder="+price"
                            value={o.priceDelta === 0 ? "" : String(o.priceDelta)}
                            onChange={(e) =>
                              updateOption(gIdx, oIdx, {
                                priceDelta: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                          />
                          <button
                            type="button"
                            className={styles.btnGhost}
                            aria-label="Remove option"
                            onClick={() => removeOption(gIdx, oIdx)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className={styles.btnGhost} onClick={() => addOption(gIdx)}>
                      + Add option
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.row}>
              {MOD_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setDraft((d) => ({ ...d, modifiers: [...d.modifiers, freshGroup(t.group)] }))}
                >
                  + {t.label}
                </button>
              ))}
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setDraft((d) => ({ ...d, modifiers: [...d.modifiers, freshGroup()] }))}
              >
                + Custom
              </button>
            </div>
          </div>

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
                  {(m.modifiers?.length || 0) > 0
                    ? ` · ${m.modifiers!.map((g) => g.name).filter(Boolean).join(" / ")}`
                    : ""}
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
                  {m.available ? "Out of stock" : "Restore"}
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
              <th>Options</th>
              <th>Out of stock / Available</th>
              <th></th>
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
                <td>{tenant ? money(tenant.shop.currency, m.price) : m.price}</td>
                <td className={styles.muted}>
                  {(m.modifiers?.length || 0) > 0
                    ? m.modifiers!.map((g) => g.name).filter(Boolean).join(" / ")
                    : "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className={m.available ? styles.btnGhost : styles.btn}
                    onClick={() => void toggle86(m.id)}
                  >
                    {m.available ? "Available" : "Out of stock"}
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
                <td colSpan={6} className={styles.muted} style={{ padding: "1rem" }}>
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
