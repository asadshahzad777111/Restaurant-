"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import styles from "./StaffAlerts.module.css";

export function StaffAlerts() {
  const { tenant, api, refresh } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (!tenant) return;
    if (!primed.current) {
      tenant.orders.forEach((o) => seen.current.add(o.id));
      primed.current = true;
      return;
    }
    const fresh = tenant.orders.filter((o) => !seen.current.has(o.id) && o.status === "placed");
    if (fresh.length) {
      fresh.forEach((o) => seen.current.add(o.id));
      setToast(`New order #${fresh[0].number}`);
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.05;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch {
        /* ignore */
      }
    }
  }, [tenant]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 8000);
    return () => clearInterval(id);
  }, [refresh, api]);

  if (!toast) return null;
  return <div className={styles.toast}>{toast}</div>;
}
