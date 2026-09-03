"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { uploadTenantMedia } from "@/lib/media-client";
import { defaultSpecialOffer, normalizeSpecialOffer } from "@/lib/payments";
import type { TenantSpecialOffer } from "@/lib/tenant-types";
import styles from "@/app/staff.module.css";

export function AdminSpecialOfferCard() {
  const { tenant, api, applyTenant, token } = useStore();
  const [offer, setOffer] = useState<TenantSpecialOffer>(defaultSpecialOffer());
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Hydrate once. Background order polling swaps the tenant reference every
  // few seconds; re-reading on every change would wipe text the admin is
  // typing in Title / Body / Image URL.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!tenant || hydratedRef.current) return;
    hydratedRef.current = true;
    setOffer(normalizeSpecialOffer(tenant.specialOffer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const payload: TenantSpecialOffer = {
      ...offer,
      updatedAt: new Date().toISOString(),
    };
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "specialOffer", specialOffer: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Special offer saved" : (data as { error?: string }).error || "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
    }
  }

  async function clearOffer() {
    setBusy(true);
    setMsg("");
    const payload = defaultSpecialOffer();
    const res = await api("/api/admin", {
      method: "PUT",
      body: JSON.stringify({ action: "specialOffer", specialOffer: payload }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Offer cleared" : (data as { error?: string }).error || "Failed");
    if (res.ok && (data as { tenant?: typeof tenant }).tenant) {
      applyTenant((data as { tenant: NonNullable<typeof tenant> }).tenant);
      setOffer(payload);
    }
  }

  if (!tenant) return null;

  return (
    <form className={styles.form} onSubmit={(e) => void save(e)}>
      <h3 style={{ margin: 0 }}>Special offer popup</h3>
      <p className={styles.muted}>
        Guests see this once on the order menu until they dismiss it (or you update the offer).
      </p>

      <label className={styles.muted}>
        <input
          type="checkbox"
          checked={offer.enabled}
          onChange={(e) => setOffer({ ...offer, enabled: e.target.checked })}
        />{" "}
        Show offer popup
      </label>
      <input
        value={offer.title}
        onChange={(e) => setOffer({ ...offer, title: e.target.value })}
        placeholder="Title"
      />
      <textarea
        value={offer.body}
        onChange={(e) => setOffer({ ...offer, body: e.target.value })}
        placeholder="Body"
        rows={3}
      />
      <input
        value={offer.imageUrl || ""}
        onChange={(e) => setOffer({ ...offer, imageUrl: e.target.value })}
        placeholder="Image URL (optional)"
      />
      <label className={styles.muted}>
        Or upload image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setMsg("Uploading…");
            try {
              const saved = await uploadTenantMedia(token, "logo", file);
              setOffer((o) => ({ ...o, imageUrl: saved.url }));
              setMsg(`Image uploaded (${saved.storage})`);
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Upload failed");
            }
          }}
        />
      </label>
      {offer.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={offer.imageUrl}
          alt=""
          style={{ maxWidth: 160, maxHeight: 100, objectFit: "cover", borderRadius: 8 }}
        />
      ) : null}
      <input
        value={offer.ctaLabel || ""}
        onChange={(e) => setOffer({ ...offer, ctaLabel: e.target.value })}
        placeholder="Button label (e.g. OK)"
      />

      <div className={styles.row}>
        <button type="submit" className={styles.btn} disabled={busy}>
          {busy ? "Saving…" : "Save offer"}
        </button>
        <button type="button" className={styles.btnGhost} disabled={busy} onClick={() => void clearOffer()}>
          Clear / disable
        </button>
      </div>
      {msg && <p className={styles.muted}>{msg}</p>}
    </form>
  );
}
