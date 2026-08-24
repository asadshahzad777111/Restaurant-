"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PlanGate } from "@/components/PlanGate";
import { useStore } from "@/lib/store";
import type { StockItem } from "@/lib/tenant-types";
import styles from "../staff.module.css";

export default function StockPage() {
  const { tenant, api, applyTenant, user } = useStore();
  const [msg, setMsg] = useState("");
  const [stockDraft, setStockDraft] = useState({
    name: "",
    unit: "pc",
    quantity: "",
    lowThreshold: "",
  });
  const [editingStockId, setEditingStockId] = useState<string | null>(null);

  const canManageStock = user?.role === "admin" || user?.permissions.includes("stock");

  async function saveStock(stock: StockItem[]) {
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "stock", stock }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg((data as { error?: string }).error || "Failed");
      return;
    }
    if ((data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
    setMsg("Stock saved");
  }

  function clearStockDraft() {
    setEditingStockId(null);
    setStockDraft({ name: "", unit: "pc", quantity: "", lowThreshold: "" });
  }

  async function addStockItem(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !canManageStock) return;
    const name = stockDraft.name.trim();
    if (!name) {
      setMsg("Stock name required");
      return;
    }
    const quantity = Number(stockDraft.quantity);
    const lowThreshold = Number(stockDraft.lowThreshold);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setMsg("Quantity must be 0 or more");
      return;
    }
    if (!Number.isFinite(lowThreshold) || lowThreshold < 0) {
      setMsg("Low-stock alert level must be 0 or more");
      return;
    }
    if (editingStockId) {
      await saveStock(
        tenant.stock.map((s) =>
          s.id === editingStockId
            ? {
                ...s,
                name,
                unit: stockDraft.unit.trim() || s.unit,
                quantity,
                lowThreshold,
              }
            : s,
        ),
      );
    } else {
      if (tenant.stock.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        setMsg("Stock item already exists — edit its quantity instead");
        return;
      }
      const item: StockItem = {
        id: `stock_${Date.now()}`,
        name,
        unit: stockDraft.unit.trim() || "pc",
        quantity,
        lowThreshold,
      };
      await saveStock([item, ...tenant.stock]);
    }
    clearStockDraft();
  }

  function startEditStock(s: StockItem) {
    setEditingStockId(s.id);
    setStockDraft({
      name: s.name,
      unit: s.unit,
      quantity: String(s.quantity),
      lowThreshold: String(s.lowThreshold),
    });
    setMsg("");
  }

  async function deleteStockItem(id: string) {
    if (!tenant || !canManageStock) return;
    const item = tenant.stock.find((s) => s.id === id);
    if (!item) return;
    if (window.confirm(`Delete stock item "${item.name}"?`)) {
      await saveStock(tenant.stock.filter((s) => s.id !== id));
      if (editingStockId === id) clearStockDraft();
    }
  }

  return (
    <AppShell title="Stock">
      <PlanGate need="stock">
        <div className={styles.stack}>
          <p className={styles.muted}>
            Stock auto-adjusts with every sale (POS & guest) and is restored on a cancelled order.{" "}
            {canManageStock
              ? "Add, edit or delete items here — same stock list the POS, menu and alerts use."
              : "You can view stock but not edit it (needs Stock permission)."}
          </p>

          {canManageStock && (
            <form className={styles.form} onSubmit={(e) => void addStockItem(e)}>
              <h3 style={{ margin: 0 }}>{editingStockId ? "Edit stock item" : "Add stock item"}</h3>
              <input
                required
                placeholder="Item name (must match menu name to auto-deduct)"
                value={stockDraft.name}
                onChange={(e) => setStockDraft({ ...stockDraft, name: e.target.value })}
              />
              <div className={styles.row}>
                <input
                  required
                  placeholder="Unit (pc, kg, litre)"
                  value={stockDraft.unit}
                  onChange={(e) => setStockDraft({ ...stockDraft, unit: e.target.value })}
                />
                <input
                  required
                  type="number"
                  min={0}
                  placeholder="Quantity"
                  value={stockDraft.quantity}
                  onChange={(e) => setStockDraft({ ...stockDraft, quantity: e.target.value })}
                />
              </div>
              <input
                required
                type="number"
                min={0}
                placeholder="Low-stock alert level"
                value={stockDraft.lowThreshold}
                onChange={(e) => setStockDraft({ ...stockDraft, lowThreshold: e.target.value })}
              />
              <div className={styles.row}>
                <button type="submit" className={styles.btn}>
                  {editingStockId ? "Save changes" : "Add stock"}
                </button>
                {editingStockId && (
                  <button type="button" className={styles.btnGhost} onClick={clearStockDraft}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

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
                {canManageStock && (
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.btnGhost} onClick={() => startEditStock(s)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => void deleteStockItem(s.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
            {(tenant?.stock ?? []).length === 0 && (
              <li className={styles.mobileCard}>
                <p className={styles.muted}>
                  No stock items yet — add your first item above. Name it exactly like a menu item and
                  sales will deduct it automatically.
                </p>
              </li>
            )}
          </ul>
          <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
            <table className={`${styles.table} ${styles.tableDesktop}`}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Low at</th>
                  {canManageStock && <th />}
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
                    {canManageStock && (
                      <td>
                        <div className={styles.row}>
                          <button type="button" className={styles.btnGhost} onClick={() => startEditStock(s)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => void deleteStockItem(s.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {(tenant?.stock ?? []).length === 0 && (
                  <tr>
                    <td colSpan={canManageStock ? 4 : 3} className={styles.muted} style={{ padding: "1rem" }}>
                      No stock items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {msg && <p className={styles.muted}>{msg}</p>}
        </div>
      </PlanGate>
    </AppShell>
  );
}
