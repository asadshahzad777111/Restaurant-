"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNativeStaffApp, getSavedPrinter, nativePrintText } from "@/lib/thermal/nativePosPrint";
import { printApi } from "@/lib/print-api";

/**
 * Cross-device print bridge station.
 * Runs inside the Capacitor staff APK (native) with a saved printer: heartbeats
 * as 'android', polls pending jobs every 3.5s, prints via the AsFix plugin, and
 * marks each job complete. On a laptop/web this does nothing.
 */
export function usePrintBridge() {
  const [online, setOnline] = useState(false);
  const running = useRef(false);

  const tick = useCallback(async () => {
    if (!isNativeStaffApp()) return;
    const printer = await getSavedPrinter();
    if (!printer?.address) return;
    try {
      await printApi.heartbeat({ station: "android", name: printer.name });
      setOnline(true);
      const res = await printApi.getPending("android");
      const jobs = (res as { jobs?: { id: string; text: string; dataBase64: string }[] })?.jobs || [];
      for (const job of jobs) {
        try {
          await printApi.claim(job.id, { station: "android", name: printer.name });
          const out = await nativePrintText(job.text, { address: printer.address });
          await printApi.complete(job.id, {
            station: "android",
            status: out.ok ? "done" : "failed",
            error: out.ok ? undefined : out.message,
          });
        } catch {
          /* skip this job */
        }
      }
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    void tick();
    const id = setInterval(() => void tick(), 3500);
    return () => {
      clearInterval(id);
      running.current = false;
    };
  }, [tick]);

  return { online };
}
