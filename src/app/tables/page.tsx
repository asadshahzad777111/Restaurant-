"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import type { DiningTable, TableStatus } from "@/lib/tenant-types";
import styles from "../staff.module.css";

const emptyDraft = { label: "", seats: 4 };

export default function TablesPage() {
  const { tenant, api, applyTenant, refresh, user } = useStore();
  const tables = tenant?.tables ?? [];
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ label: "", seats: 4 });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const canEdit =
    user?.permissions?.includes("settings") ||
    user?.permissions?.includes("pos") ||
    user?.role === "admin";

  useEffect(() => {
    if (!tenant) void refresh({ force: true });
  }, [tenant, refresh]);

  const statusClass = (s: string) =>
    s === "empty"
      ? styles.tableEmpty
      : s === "occupied"
        ? styles.tableOccupied
        : s === "reserved"
          ? styles.tableReserved
          : styles.tableBill;

  async function saveTables(next: DiningTable[]) {
    setBusy(true);
    setMsg("");
    try {
      const res = await api("/api/admin", {
        method: "PUT",
        body: JSON.stringify({ action: "tables", tables: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((data as { error?: string }).error || "Could not save tables");
        return;
      }
      if ((data as { tenant?: typeof tenant }).tenant) {
        applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
      }
      setMsg("Tables saved");
    } finally {
      setBusy(false);
    }
  }

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.label.trim();
    if (!label) return;
    if (tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setMsg("That table label already exists");
      return;
    }
    const seats = Math.max(1, Math.min(50, Number(draft.seats) || 4));
    const row: DiningTable = {
      id: `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      seats,
      status: "empty",
    };
    await saveTables([...tables, row]);
    setDraft(emptyDraft);
  }

  async function saveEdit(id: string) {
    const label = edit.label.trim();
    if (!label) return;
    if (tables.some((t) => t.id !== id && t.label.toLowerCase() === label.toLowerCase())) {
      setMsg("That table label already exists");
      return;
    }
    const seats = Math.max(1, Math.min(50, Number(edit.seats) || 4));
    await saveTables(tables.map((t) => (t.id === id ? { ...t, label, seats } : t)));
    setEditingId(null);
  }

  async function removeTable(id: string) {
    const row = tables.find((t) => t.id === id);
    if (!row) return;
    if (row.status !== "empty" || row.currentOrderId) {
      setMsg("Free the table (complete or cancel the order) before removing it.");
      return;
    }
    if (!window.confirm(`Remove table ${row.label}?`)) return;
    await saveTables(tables.filter((t) => t.id !== id));
  }

  async function setTableStatus(id: string, status: TableStatus) {
    await saveTables(
      tables.map((t) =>
        t.id === id
          ? { ...t, status, ...(status === "empty" ? { currentOrderId: undefined } : {}) }
          : t,
      ),
    );
  }

  return (
    <AppShell title="Tables">
      <div className={styles.page}>
        <p className={styles.muted}>
          Empty / Occupied / Bill. Table orders update this automatically; complete or cancel frees the
          table. Add or edit floor labels here — each kitchen keeps its own list.
        </p>

        {canEdit && (
          <form className={styles.form} onSubmit={(e) => void addTable(e)} style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Add table</h3>
            <label>
              Label (e.g. 1, A3, Patio)
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                required
              />
            </label>
            <label>
              Seats
              <input
                type="number"
                min={1}
                max={50}
                value={draft.seats}
                onChange={(e) => setDraft({ ...draft, seats: Number(e.target.value) })}
              />
            </label>
            <button type="submit" className={styles.btn} disabled={busy}>
              Add table
            </button>
          </form>
        )}

        <div className={styles.kitchen}>
          {tables.map((tb) => (
            <article key={tb.id} className={`${styles.ticket} ${statusClass(tb.status)}`}>
              {editingId === tb.id ? (
                <>
                  <input
                    value={edit.label}
                    onChange={(e) => setEdit({ ...edit, label: e.target.value })}
                    placeholder="Label"
                  />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={edit.seats}
                    onChange={(e) => setEdit({ ...edit, seats: Number(e.target.value) })}
                  />
                  <div className={styles.row}>
                    <button type="button" className={styles.btn} disabled={busy} onClick={() => void saveEdit(tb.id)}>
                      Save
                    </button>
                    <button type="button" className={styles.btnGhost} onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3>Table {tb.label}</h3>
                  <p className={styles.muted}>{tb.seats} seats</p>
                  <strong aria-live="polite">{tb.status}</strong>
                  {tb.status === "reserved" && (
                    <p className={`${styles.muted} ${styles.tableReservedMeta}`}>
                      {tb.reservedBy || "Guest"} arriving in{" "}
                      {tb.reservedUntil ? (
                        <>
                          {Math.max(0, Math.ceil((new Date(tb.reservedUntil).getTime() - Date.now()) / 60000))} min
                          <span> · {new Date(tb.reservedUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </>
                      ) : (
                        "soon"
                      )}
                    </p>
                  )}
                  {tb.currentOrderId && <p className={styles.muted}>Order linked</p>}
                  {canEdit && (
                    <div className={styles.row} style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => {
                          setEditingId(tb.id);
                          setEdit({ label: tb.label, seats: tb.seats });
                        }}
                      >
                        Edit
                      </button>
                      {tb.status !== "empty" && (
                        <button
                          type="button"
                          className={styles.btnGhost}
                          disabled={busy}
                          onClick={() => void setTableStatus(tb.id, "empty")}
                        >
                          Mark empty
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnGhost}
                        disabled={busy}
                        onClick={() => void removeTable(tb.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </>
              )}
            </article>
          ))}
        </div>
        {!tables.length && (
          <p className={styles.muted}>No tables yet — add floor labels above.</p>
        )}
        <div className={styles.row}>
          <button type="button" className={styles.btnGhost} onClick={() => void refresh({ force: true })}>
            Refresh
          </button>
        </div>
        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
