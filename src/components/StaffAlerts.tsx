"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import styles from "./StaffAlerts.module.css";

export function StaffAlerts() {
  const { tenant, refresh, user } = useStore();
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
      setToast(`New guest order #${fresh[0].number}`);
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
    const id = setInterval(() => {
      void refresh();
    }, 6000);
    return () => clearInterval(id);
  }, [refresh]);

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
