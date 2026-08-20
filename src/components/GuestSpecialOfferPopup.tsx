"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TenantSpecialOffer } from "@/lib/tenant-types";
import { backdropTransition, usePrefersReducedMotion } from "@/lib/motion";

function dismissKey(tenant: string, updatedAt: string) {
  return `ordo_offer_dismiss_${tenant.toUpperCase()}_${updatedAt}`;
}

export function GuestSpecialOfferPopup({
  tenantCode,
  offer,
}: {
  tenantCode: string;
  offer?: TenantSpecialOffer | null;
}) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!offer?.enabled || !tenantCode) {
      setOpen(false);
      return;
    }
    if (!offer.title?.trim() && !offer.body?.trim()) {
      setOpen(false);
      return;
    }
    try {
      const key = dismissKey(tenantCode, offer.updatedAt || "");
      if (localStorage.getItem(key) === "1") {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [offer, tenantCode]);

  function dismiss() {
    if (offer && tenantCode) {
      try {
        localStorage.setItem(dismissKey(tenantCode, offer.updatedAt || ""), "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!offer?.enabled) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="special-offer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition(reduced)}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(14, 12, 10, 0.58)",
            display: "grid",
            placeItems: "center",
            padding: "1.25rem",
          }}
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={backdropTransition(reduced)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 380px)",
              background: "var(--guest-elevated, #1a1714)",
              color: "var(--guest-text, #f4efe8)",
              borderRadius: 16,
              border: "1px solid var(--guest-line, rgba(255,255,255,0.12))",
              padding: "1.15rem 1.15rem 1.25rem",
              position: "relative",
              boxShadow: "0 18px 48px rgba(0,0,0,0.35)",
            }}
          >
            <button
              type="button"
              aria-label="Close offer"
              onClick={dismiss}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 36,
                height: 36,
                borderRadius: 999,
                border: "1px solid var(--guest-line, rgba(255,255,255,0.14))",
                background: "transparent",
                color: "inherit",
                fontSize: "1.15rem",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            {offer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offer.imageUrl}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "cover",
                  borderRadius: 12,
                  marginBottom: "0.85rem",
                }}
              />
            ) : null}
            <h2 id="offer-title" style={{ margin: "0 1.5rem 0.45rem 0", fontSize: "1.25rem" }}>
              {offer.title || "Special offer"}
            </h2>
            {offer.body ? (
              <p style={{ margin: 0, color: "var(--guest-muted, #b8aea2)", lineHeight: 1.45 }}>
                {offer.body}
              </p>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              style={{
                marginTop: "1rem",
                width: "100%",
                border: "none",
                borderRadius: 999,
                background: "var(--ember, #c45c26)",
                color: "var(--ember-ink, #fff)",
                fontWeight: 800,
                padding: "0.75rem",
                cursor: "pointer",
              }}
            >
              {offer.ctaLabel?.trim() || "OK"}
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
