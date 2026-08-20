"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { showApkNotify } from "@/lib/apk-notify";
import styles from "./StaffAlerts.module.css";
import type { Order } from "@/lib/tenant-types";

export function StaffAlerts() {
  const { tenant, api, mergeOrders, user } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const [soundOk, setSoundOk] = useState(false);

  const canHear =
    user?.role === "admin" ||
    user?.permissions.includes("orders") ||
    user?.permissions.includes("kitchen") ||
    user?.permissions.includes("pos");

  useEffect(() => {
    if (!tenant || !canHear) return;
    if (!primed.current) {
      tenant.orders.forEach((o) => seen.current.add(o.id));
      primed.current = true;
      return;
    }
    const fresh = tenant.orders.filter(
      (o) => !seen.current.has(o.id) && o.status === "placed" && o.channel === "guest",
    );
    if (fresh.length) {
      fresh.forEach((o) => seen.current.add(o.id));
      const msg = `New guest order #${fresh[0].number}`;
      setToast(msg);
      showApkNotify("ORDO · New order", msg, `order-${fresh[0].id}`);
      if (soundOk) {
        try {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = 920;
          gain.gain.value = 0.06;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.22);
        } catch {
          /* ignore */
        }
      }
    }
  }, [tenant, canHear, soundOk]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!canHear) return;
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

    const id = window.setInterval(() => void tick(), 10000);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [api, mergeOrders, canHear]);

  if (!canHear) return null;

  return (
    <>
      {!soundOk && (
        <button type="button" className={styles.enable} onClick={() => setSoundOk(true)}>
          Enable order sound
        </button>
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}
