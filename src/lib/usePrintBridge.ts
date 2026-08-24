"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isNativeStaffApp, getSavedPrinter, nativePrintText } from "@/lib/thermal/nativePosPrint";
import { printApi, type PrintBridgeStatus } from "@/lib/print-api";

/**
 * Print bridge station + presence.
 * Staff APK (native + saved 58mm printer): heartbeat POST /api/print/bridge,
 * poll GET /api/print/jobs every 1.5s, print ESC/POS, ack done/fail.
 * Laptop / iPhone: only poll GET /api/print/bridge so POS can show Print on Android.
 */
export function usePrintBridge() {
  const [stationOnline, setStationOnline] = useState(false);
  const [bridge, setBridge] = useState<PrintBridgeStatus>({ connected: false, lastSeen: null, printerName: null });
  const running = useRef(false);

  const tickStation = useCallback(async () => {
    if (!isNativeStaffApp()) return;
    if (typeof window !== "undefined" && !localStorage.getItem("restaurant_pos_token_v2")) return;
    const printer = await getSavedPrinter();
    if (!printer?.address) {
      setStationOnline(false);
      return;
    }
    try {
      const hb = await printApi.heartbeat({ lastSeen: Date.now(), printerName: printer.name });
      setStationOnline(true);
      setBridge(hb);
      const res = await printApi.getPending();
      const jobs = res?.jobs || [];
      for (const job of jobs) {
        try {
          await printApi.ack(job.id, { status: "printing", station: "android" });
        } catch {
          continue;
        }
        try {
          const out = await nativePrintText(job.text, { address: printer.address });
          await printApi.ack(job.id, {
            status: out.ok ? "done" : "failed",
            error: out.ok ? undefined : out.message,
            station: "android",
          });
        } catch {
          try {
            await printApi.ack(job.id, { status: "failed", error: "print_failed", station: "android" });
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      setStationOnline(false);
    }
  }, []);

  const tickPresence = useCallback(async () => {
    if (isNativeStaffApp()) return;
    if (typeof window !== "undefined" && !localStorage.getItem("restaurant_pos_token_v2")) return;
    try {
      const st = await printApi.getBridge();
      setBridge(st);
    } catch {
      setBridge({ connected: false, lastSeen: null, printerName: null });
    }
  }, []);

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    const native = isNativeStaffApp();
    void (native ? tickStation() : tickPresence());
    const id = setInterval(() => void (native ? tickStation() : tickPresence()), native ? 1500 : 4000);
    return () => {
      clearInterval(id);
      running.current = false;
    };
  }, [tickStation, tickPresence]);

  const printerLinked = stationOnline && isNativeStaffApp();
  return {
    online: printerLinked || bridge.connected,
    stationOnline,
    printerLinked,
    androidConnected: bridge.connected,
    printerName: bridge.printerName,
  };
}
