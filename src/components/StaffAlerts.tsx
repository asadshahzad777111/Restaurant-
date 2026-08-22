"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { showApkNotify } from "@/lib/apk-notify";
import { serviceTypeLabel } from "@/lib/notify";
import {
  readSoundPref,
  writeSoundPref,
  unlockStaffAlertAudio,
  startContinuousAlert,
  stopStaffAlert,
  resumeStaffAlertAudioIfNeeded,
  ensureStaffAlertVisibilityResume,
} from "@/lib/staff-alert-sound";
import styles from "./StaffAlerts.module.css";
import type { Order, StockItem } from "@/lib/tenant-types";

const DEFAULT_LOW_THRESHOLD = 5;

function effectiveLowThreshold(s: StockItem) {
  const n = Number(s.lowThreshold);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_LOW_THRESHOLD;
  return n;
}

function isLowStock(s: StockItem) {
  return s.quantity <= effectiveLowThreshold(s);
}

function orderAlertCopy(o: Order): { title: string; body: string } {
  const type = serviceTypeLabel(o.serviceType);
  const bits: string[] = [];
  if (o.serviceType === "table" && o.tableNumber) bits.push(`Table ${o.tableNumber}`);
  if (o.serviceType === "delivery") {
    if (o.deliveryAddress?.trim()) bits.push(o.deliveryAddress.trim().slice(0, 48));
    else if (o.customerPhone) bits.push(o.customerPhone);
  }
  if (o.serviceType === "pickup" && o.customerName) bits.push(o.customerName);
  if (o.channel === "pos") bits.push("POS");
  const detail = bits.length ? ` · ${bits.join(" · ")}` : "";
  return {
    title: `New ${type} order #${o.number}`,
    body: `${type}${detail} · ${o.lines.length} item${o.lines.length === 1 ? "" : "s"}`,
  };
}

export function StaffAlerts() {
  const { tenant, api, mergeOrders, user } = useStore();
  const [panel, setPanel] = useState<{
    kind: "order" | "stock";
    title: string;
    body: string;
  } | null>(null);
  const seenOrders = useRef<Set<string>>(new Set());
  const primedOrders = useRef(false);
  /** Orders that are currently alerting (placed). Cleared by ack or by kitchen action. */
  const alertingOrders = useRef<Set<string>>(new Set());
  const seenLow = useRef<Set<string>>(new Set());
  const primedStock = useRef(false);
  const [soundOk, setSoundOk] = useState(false);

  const canHearOrders =
    user?.role === "admin" ||
    user?.permissions.includes("orders") ||
    user?.permissions.includes("kitchen") ||
    user?.permissions.includes("pos");

  const canHearStock =
    user?.role === "admin" ||
    user?.permissions.includes("stock") ||
    user?.permissions.includes("pos") ||
    user?.permissions.includes("settings");

  useEffect(() => {
    setSoundOk(readSoundPref());
    ensureStaffAlertVisibilityResume();
  }, []);

  useEffect(() => {
    return () => stopStaffAlert();
  }, []);

  // New-order detection (guest table/delivery/pickup + POS counter).
  useEffect(() => {
    if (!tenant || !canHearOrders) return;
    if (!primedOrders.current) {
      tenant.orders.forEach((o) => seenOrders.current.add(o.id));
      primedOrders.current = true;
      return;
    }
    const fresh = tenant.orders.filter(
      (o) => !seenOrders.current.has(o.id) && o.status === "placed",
    );
    if (fresh.length) {
      fresh.forEach((o) => {
        seenOrders.current.add(o.id);
        alertingOrders.current.add(o.id);
      });
      const primary = fresh[0];
      const copy = orderAlertCopy(primary);
      const extra =
        fresh.length > 1 ? ` (+${fresh.length - 1} more)` : "";
      setPanel({
        kind: "order",
        title: copy.title + extra,
        body: copy.body,
      });
      showApkNotify(
        tenant.branding.name || "ORDO · New order",
        `${copy.title}${extra}`,
        `order-${primary.id}`,
      );
      if (soundOk) startContinuousAlert("order");
    }
    // Staff acknowledgment by action: once every alerted order leaves "placed"
    // (accepted on /kitchen or /orders), stop the beep. Panel stays until Stop alert.
    if (alertingOrders.current.size) {
      for (const id of [...alertingOrders.current]) {
        const o = tenant.orders.find((x) => x.id === id);
        if (!o || o.status !== "placed") alertingOrders.current.delete(id);
      }
      if (!alertingOrders.current.size) stopStaffAlert();
    }
  }, [tenant, canHearOrders, soundOk]);

  // Stock-low / 86 qty — alert when items newly cross threshold.
  useEffect(() => {
    if (!tenant || !canHearStock) return;
    const stock = tenant.stock ?? [];
    if (!primedStock.current) {
      stock.filter(isLowStock).forEach((s) => seenLow.current.add(s.id));
      primedStock.current = true;
      return;
    }
    const newlyLow = stock.filter((s) => isLowStock(s) && !seenLow.current.has(s.id));
    // Drop recovered items from seen so they can alert again later.
    const lowIds = new Set(stock.filter(isLowStock).map((s) => s.id));
    for (const id of [...seenLow.current]) {
      if (!lowIds.has(id)) seenLow.current.delete(id);
    }
    if (!newlyLow.length) return;
    newlyLow.forEach((s) => seenLow.current.add(s.id));
    const names = newlyLow
      .map((s) => `${s.name} (${s.quantity}${s.unit || ""})`)
      .join(" · ");
    const zero = newlyLow.some((s) => s.quantity <= 0);
    setPanel({
      kind: "stock",
      title: zero ? "Stock 86 / empty" : "Low stock",
      body: names,
    });
    showApkNotify(
      tenant.branding.name || "ORDO · Stock",
      zero ? `86 / empty: ${names}` : `Low stock: ${names}`,
      `stock-${newlyLow[0].id}`,
    );
    if (soundOk) startContinuousAlert("stock");
  }, [tenant, canHearStock, soundOk]);

  useEffect(() => {
    if (!canHearOrders) return;
    let cancelled = false;

    async function tick() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await api("/api/orders?poll=1");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { orders?: Order[] };
        if (data.orders?.length) mergeOrders(data.orders);
      } catch {
        /* ignore poll errors */
      }
    }

    // New orders reach /kitchen + /orders fast: poll every 3s, and the instant the
    // staff tab regains focus (browser throttles timers in background tabs).
    const id = window.setInterval(() => void tick(), 3000);
    const onFocus = () => {
      void tick();
      resumeStaffAlertAudioIfNeeded();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void tick();
        resumeStaffAlertAudioIfNeeded();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [api, mergeOrders, canHearOrders]);

  async function enableSound() {
    const ok = await unlockStaffAlertAudio();
    writeSoundPref(true);
    setSoundOk(true);
    // Brief confirmation so iOS Safari/PWA users hear that audio unlocked.
    if (ok) {
      startContinuousAlert("order");
      window.setTimeout(() => stopStaffAlert(), 900);
    }
  }

  function acknowledge() {
    stopStaffAlert();
    setPanel(null);
  }

  if (!canHearOrders && !canHearStock) return null;

  return (
    <>
      {!soundOk && (canHearOrders || canHearStock) && (
        <button type="button" className={styles.enable} onClick={() => void enableSound()}>
          Enable order sound
        </button>
      )}
      {soundOk && !panel && canHearOrders && (
        <button
          type="button"
          className={styles.mute}
          onClick={() => {
            writeSoundPref(false);
            setSoundOk(false);
            stopStaffAlert();
          }}
          title="Mute order alerts on this device"
        >
          Sound on
        </button>
      )}
      {panel && (
        <div className={styles.alertPanel} role="alertdialog" aria-live="assertive">
          <div className={styles.alertText}>
            <strong>{panel.title}</strong>
            <p>{panel.body}</p>
            {panel.kind === "order" && (
              <p className={styles.hint}>Beep continues until you stop it.</p>
            )}
          </div>
          <button type="button" className={styles.stop} onClick={acknowledge}>
            Stop alert
          </button>
        </div>
      )}
    </>
  );
}
