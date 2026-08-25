"use client";

import { useMemo } from "react";
import Link from "next/link";
import { guestOrderPath } from "@/lib/guest";
import { guestOrderPageUrl } from "@/lib/receipt-layout";
import { qrSvgMarkup } from "@/lib/qr-byte";
import styles from "./GuestCoverQr.module.css";

/**
 * Per-kitchen cover QR — same URL as the 58mm bill:
 * https://ordo.asfins.com/order?tenant=CODE
 * Scan with another phone, or tap to open this kitchen’s menu.
 */
export function GuestCoverQr({
  tenantCode,
  restaurantName,
  compact = false,
}: {
  tenantCode: string;
  restaurantName?: string;
  compact?: boolean;
}) {
  const code = String(tenantCode || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
  const scanUrl = code ? guestOrderPageUrl(code) : "";
  const href = code ? guestOrderPath({ tenant: code }) : "/guest";
  const svg = useMemo(() => (scanUrl ? qrSvgMarkup(scanUrl, compact ? 28 : 42) : ""), [scanUrl, compact]);
  if (!code || !svg) return null;
  const label = restaurantName?.trim() || code;
  return (
    <Link
      href={href}
      className={`${styles.coverQr} ${compact ? styles.compact : ""}`}
      aria-label={`Scan or tap to order from ${label}`}
    >
      <span className={styles.frame} dangerouslySetInnerHTML={{ __html: svg }} />
      <span className={styles.caption}>
        <strong>Scan to order</strong>
        <span>Tap to open {label} menu</span>
      </span>
    </Link>
  );
}
