"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { uploadTenantMedia } from "@/lib/media-client";
import { AdminApkCard } from "@/components/AdminApkCard";
import { AdminIosInstallCard } from "@/components/AdminIosInstallCard";
import { AdminThermalPrinterCard } from "@/components/AdminThermalPrinterCard";
import { AdminPaymentsCard } from "@/components/AdminPaymentsCard";
import { AdminSpecialOfferCard } from "@/components/AdminSpecialOfferCard";
import styles from "../staff.module.css";

export default function SettingsPage() {
  const { tenant, api, applyTenant, user, token, loading, platformFeatures, refresh } = useStore();
  const [msg, setMsg] = useState("");
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    receiptFooter: "",
    address: "",
    phone: "",
    allowApk: false,
  });
  const [fees, setFees] = useState({
    deliveryFee: 0,
    packingFee: 0,
    serviceChargePercent: 0,
    taxRate: 0,
  });
  const [printLogoOnBill, setPrintLogoOnBill] = useState(true);
  const [printGstOnBill, setPrintGstOnBill] = useState(false);
  const [fbrEnabled, setFbrEnabled] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });
  const [emailDraft, setEmailDraft] = useState("");

  useEffect(() => {
    if (!tenant) return;
    setBranding({
      name: tenant.branding.name,
      logoUrl: tenant.branding.logoUrl,
      receiptFooter: tenant.branding.receiptFooter,
      address: tenant.shop.address || "",
      phone: tenant.shop.phone || "",
      allowApk: Boolean(tenant.branding.allowApk),
    });
    setFees({
      deliveryFee: tenant.shop.deliveryFee || 0,
      packingFee: tenant.shop.packingFee || 0,
      serviceChargePercent: tenant.shop.serviceChargePercent || 0,
      taxRate: tenant.shop.taxRate || 0,
    });
    setPrintLogoOnBill(tenant.shop.printLogoOnBill !== false);
    setPrintGstOnBill(tenant.shop.printGstOnBill === true);
    setFbrEnabled(Boolean(tenant.shop.fbrEnabled));
    setEmailDraft(user?.email || "");
  }, [tenant, user]);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    if (!branding.name.trim()) {
      setMsg("Restaurant name required");
      return;
    }
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({
        action: "branding",
        branding: {
          name: branding.name,
          logoUrl: branding.logoUrl,
          receiptFooter: branding.receiptFooter,
          allowApk: Boolean(branding.allowApk),
        },
        shop: { address: branding.address, phone: branding.phone },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Branding saved" : "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
  }

  async function saveFees(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({
        action: "fees",
        shop: { ...fees, printLogoOnBill, printGstOnBill },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Fees saved" : "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
  }

  async function saveFbrOptIn(next: boolean) {
    setFbrEnabled(next);
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "fees", shop: { fbrEnabled: next } }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? (next ? "FBR fields enabled for this kitchen" : "FBR fields off") : "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    } else if (!res.ok) {
      setFbrEnabled(!next);
    }
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
    }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "changeEmail", email: emailDraft }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Gmail / email saved — use it for Google staff login" : data.error || "Failed");
    if (res.ok) {
      await refresh({ force: true });
      if ((data as { tenant?: typeof tenant }).tenant) {
        applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
      }
    }
  }

  async function exportData(type: "menu" | "orders", format: "json" | "csv") {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = `/api/export?type=${type}&format=${format}${type === "orders" ? `&from=${encodeURIComponent(from)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setMsg("Export failed");
      return;
    }
    if (format === "csv") {
      const blob = await res.blob();
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${tenant?.code}-${type}.csv`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${tenant?.code}-${type}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    setMsg(`Exported ${type} (${format})`);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading || !tenant) {
    return (
      <AppShell title="Settings">
        <p className={styles.muted}>Loading current values…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <div className={styles.stack}>
        {user?.mustChangePassword && (
          <div className={styles.card} style={{ borderColor: "#f5c542" }}>
            <strong>Demo password in use</strong>
            <p className={styles.muted}>
              /lab demos OK — production pe password change zaroori hai.
            </p>
          </div>
        )}

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
          <label className={styles.muted}>
            Or upload logo (R2 when configured, otherwise local file-store)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setMsg("Uploading logo…");
                try {
                  const saved = await uploadTenantMedia(token, "logo", file);
                  setBranding((b) => ({ ...b, logoUrl: saved.url }));
                  setMsg(`Logo uploaded (${saved.storage})`);
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : "Logo upload failed");
                }
              }}
            />
          </label>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" style={{ maxWidth: 120, maxHeight: 80, objectFit: "contain" }} />
          ) : null}
          <textarea
            value={branding.receiptFooter}
            onChange={(e) => setBranding({ ...branding, receiptFooter: e.target.value })}
            placeholder="Receipt footer (English or Urdu)"
            rows={2}
          />
          <input
            value={branding.address}
            onChange={(e) => setBranding({ ...branding, address: e.target.value })}
            placeholder="Shop address (prints on 58mm bill)"
          />
          <input
            value={branding.phone}
            onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
            placeholder="Shop phone (prints on 58mm header if filled — not a placeholder)"
          />
          <button type="submit" className={styles.btn}>
            Save branding
          </button>
        </form>

        <form className={styles.form} onSubmit={saveBranding}>
          <h3 style={{ margin: 0 }}>📱 Mobile App (per restaurant)</h3>
          <label className={styles.rowCheck}>
            <input
              type="checkbox"
              checked={branding.allowApk}
              onChange={(e) => {
                setBranding({ ...branding, allowApk: e.target.checked });
              }}
            />
            Allow this kitchen's own APK download (Staff + Customer)
          </label>
          {branding.allowApk && tenant && (
            <div className={styles.apkLinks}>
              <a className={styles.btn} href={`/apk/install/${tenant.code}/staff`} download>🧑‍🍳 Staff APK</a>
              <a className={styles.btn} href={`/apk/install/${tenant.code}/customer`} download>🍽️ Customer APK</a>
              <span className={styles.muted}>
                Staff + Customer APKs for this kitchen only — Super HQ is never included.
              </span>
            </div>
          )}
          <button type="submit" className={styles.btn}>
            Save
          </button>
        </form>

        <form className={styles.form} onSubmit={saveFees}>
          <h3 style={{ margin: 0 }}>Fees (per tenant)</h3>
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
          <label className={styles.rowCheck}>
            <input
              type="checkbox"
              checked={printGstOnBill}
              onChange={(e) => setPrintGstOnBill(e.target.checked)}
            />
            Print GST on bill
          </label>
          <p className={styles.muted} style={{ margin: 0 }}>
            Off by default. GST/Tax is not printed (and not added) until this is ticked.
          </p>
          <label className={styles.muted}>
            <input
              type="checkbox"
              checked={printLogoOnBill}
              onChange={(e) => setPrintLogoOnBill(e.target.checked)}
            />{" "}
            Print logo on 58mm customer bill (AsFix tick-on-print)
          </label>
          <button type="submit" className={styles.btn}>
            Save fees
          </button>
        </form>

        <AdminPaymentsCard />

        <AdminSpecialOfferCard />

        {platformFeatures?.fbrOptional && (
          <div className={styles.card}>
            <h3 style={{ marginTop: 0 }}>Optional · FBR fields</h3>
            <p className={styles.muted}>
              Super enabled this option platform-wide. There is no separate FBR page — turn fields on only
              if this kitchen needs them. Off by default.
            </p>
            <button
              type="button"
              className={fbrEnabled ? styles.btn : styles.btnGhost}
              onClick={() => void saveFbrOptIn(!fbrEnabled)}
            >
              {fbrEnabled ? "FBR fields ON for this kitchen" : "Enable FBR fields (experimental)"}
            </button>
          </div>
        )}

        <form className={styles.form} onSubmit={changePassword}>
          <h3 style={{ margin: 0 }}>Change password</h3>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={pw.current}
            onChange={(e) => setPw({ ...pw, current: e.target.value })}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 6)"
            value={pw.next}
            onChange={(e) => setPw({ ...pw, next: e.target.value })}
          />
          <button type="submit" className={styles.btn}>
            Update password
          </button>
        </form>

        <form className={styles.form} onSubmit={(e) => void changeEmail(e)}>
          <h3 style={{ margin: 0 }}>Gmail / login email</h3>
          <p className={styles.muted}>
            Save your Gmail here so you can Sign in with Google on Staff login (with this kitchen’s code).
          </p>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
          />
          <button type="submit" className={styles.btn}>
            Save email
          </button>
        </form>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Backup / export</h3>
          <p className={styles.muted}>Localhost safety — download menu & orders.</p>
          <div className={styles.row}>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("menu", "json")}>
              Menu JSON
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("menu", "csv")}>
              Menu CSV
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("orders", "json")}>
              Orders JSON (30d)
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => void exportData("orders", "csv")}>
              Orders CSV (30d)
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>QR / guest links</h3>
          <p className={styles.muted}>
            Table tents and every 58mm bill QR open this kitchen only:
          </p>
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
            {origin}/order?tenant={tenant?.code}&table=3
          </code>
        </div>

        <AdminApkCard />

        <AdminIosInstallCard />

        <AdminThermalPrinterCard />

        <div className={styles.card}>
          <h3 style={{ marginTop: 0 }}>Staff on this kitchen</h3>
          <p className={styles.muted}>Users belong to {tenant?.code} only — never another restaurant.</p>
          <ul className={styles.mobileCards}>
            {(tenant?.users ?? []).map((u) => (
              <li key={u.id} className={styles.mobileCard}>
                <strong>{u.username}</strong>
                <p className={styles.muted}>
                  {u.roleLabel} · {u.active ? "active" : "off"}
                </p>
              </li>
            ))}
          </ul>
          <div className={`${styles.tableScroll} ${styles.tableScrollDesktop}`}>
            <table className={`${styles.table} ${styles.tableDesktop}`}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(tenant?.users ?? []).map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.roleLabel}</td>
                    <td>{u.active ? "active" : "off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {msg && <p className={styles.muted}>{msg}</p>}
      </div>
    </AppShell>
  );
}
