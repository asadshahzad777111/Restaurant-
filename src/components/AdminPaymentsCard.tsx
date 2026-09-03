"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { defaultTenantPayments, normalizeTenantPayments } from "@/lib/payments";
import type { PaymentAccount, TenantPayments } from "@/lib/tenant-types";
import styles from "@/app/staff.module.css";

type RailKey = "bank" | "jazzcash" | "easypaisa";

const RAILS: { key: RailKey; label: string; showBank: boolean }[] = [
  { key: "bank", label: "Bank transfer", showBank: true },
  { key: "jazzcash", label: "JazzCash", showBank: false },
  { key: "easypaisa", label: "EasyPaisa", showBank: false },
];

function emptyAccount(title: string): PaymentAccount {
  return {
    enabled: false,
    title,
    accountName: "",
    accountNumber: "",
    bankName: "",
    iban: "",
  };
}

export function AdminPaymentsCard() {
  const { tenant, api, applyTenant } = useStore();
  const [payments, setPayments] = useState<TenantPayments>(defaultTenantPayments());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Hydrate once. Background order polling swaps the tenant reference every
  // few seconds; re-reading on every change would wipe account numbers the
  // admin is typing.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!tenant || hydratedRef.current) return;
    hydratedRef.current = true;
    setPayments(normalizeTenantPayments(tenant.payments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  function patchRail(key: RailKey, patch: Partial<PaymentAccount>) {
    setPayments((prev) => ({
      ...prev,
      methods: {
        ...prev.methods,
        [key]: { ...(prev.methods[key] || emptyAccount(key)), ...patch },
      },
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "payments", payments }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Payments saved" : (data as { error?: string }).error || "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
  }

  if (!tenant) return null;

  return (
    <form className={styles.form} onSubmit={(e) => void save(e)}>
      <h3 style={{ margin: 0 }}>Guest payments</h3>
      <p className={styles.muted}>
        COD, advance (JazzCash / EasyPaisa / bank), and pay-at-counter — guest menu follows these
        toggles.
      </p>

      <label className={styles.muted}>
        <input
          type="checkbox"
          checked={payments.codEnabled}
          onChange={(e) => setPayments({ ...payments, codEnabled: e.target.checked })}
        />{" "}
        Cash on delivery (delivery)
      </label>
      <label className={styles.muted}>
        <input
          type="checkbox"
          checked={payments.advanceEnabled}
          onChange={(e) => setPayments({ ...payments, advanceEnabled: e.target.checked })}
        />{" "}
        Advance payment (upload proof)
      </label>
      <label className={styles.muted}>
        <input
          type="checkbox"
          checked={payments.payAtCounterEnabled}
          onChange={(e) => setPayments({ ...payments, payAtCounterEnabled: e.target.checked })}
        />{" "}
        Pay at counter (pickup)
      </label>

      {RAILS.map(({ key, label, showBank }) => {
        const a = payments.methods[key] || emptyAccount(label);
        return (
          <div
            key={key}
            style={{
              marginTop: "0.85rem",
              paddingTop: "0.85rem",
              borderTop: "1px solid var(--line, #e8e4dc)",
            }}
          >
            <label className={styles.muted}>
              <input
                type="checkbox"
                checked={Boolean(a.enabled)}
                onChange={(e) => patchRail(key, { enabled: e.target.checked })}
              />{" "}
              Enable {label}
            </label>
            <input
              value={a.title || ""}
              onChange={(e) => patchRail(key, { title: e.target.value })}
              placeholder={`${label} title`}
            />
            <input
              value={a.accountName || ""}
              onChange={(e) => patchRail(key, { accountName: e.target.value })}
              placeholder="Account name"
            />
            <input
              value={a.accountNumber || ""}
              onChange={(e) => patchRail(key, { accountNumber: e.target.value })}
              placeholder="Account / wallet number"
            />
            {showBank && (
              <>
                <input
                  value={a.bankName || ""}
                  onChange={(e) => patchRail(key, { bankName: e.target.value })}
                  placeholder="Bank name"
                />
                <input
                  value={a.iban || ""}
                  onChange={(e) => patchRail(key, { iban: e.target.value })}
                  placeholder="IBAN (optional)"
                />
              </>
            )}
          </div>
        );
      })}

      <button type="submit" className={styles.btn} disabled={busy}>
        {busy ? "Saving…" : "Save payments"}
      </button>
      {msg && <p className={styles.muted}>{msg}</p>}
    </form>
  );
}
