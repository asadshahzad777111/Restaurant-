"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isNativeStaffApp, getSavedPrinter, nativePrintText } from "@/lib/thermal/nativePosPrint";
import { printApi, type PrintBridgeStatus } from "@/lib/print-api";

const PrintBridgeContext = createContext<PrintBridgeHook | null>(null);

export type PrintBridgeHook = {
  online: boolean;
  stationOnline: boolean;
  printerLinked: boolean;
  androidConnected: boolean;
  printerName: string | null;
  queued: number;
};

const OFF: PrintBridgeStatus = { connected: false, lastSeen: null, printerName: null, queued: 0 };

/**
 * Print bridge station + presence.
 * Staff APK: heartbeat + poll jobs ~1.5s, print ESC/POS, ack.
 * Laptop / iPhone: live SSE (/api/print/bridge/live) so the green/red lamp
 * flips as soon as the Staff phone heartbeats — poll fallback every 1s.
 */
function usePrintBridgeState(): PrintBridgeHook {
  const [stationOnline, setStationOnline] = useState(false);
  const [bridge, setBridge] = useState<PrintBridgeStatus>(OFF);
  const running = useRef(false);

  const apply = useCallback((st: PrintBridgeStatus) => {
    const lastSeen = st.lastSeen == null ? null : Number(st.lastSeen);
    const age = lastSeen != null && Number.isFinite(lastSeen) ? Date.now() - lastSeen : Infinity;
    // Fresh SSE/heartbeat wins; a cached connected:true with old lastSeen stays red.
    const connected = lastSeen != null && Number.isFinite(lastSeen) && age <= 20_000 && (Boolean(st.connected) || (age >= 0 && age <= 8_000));
    setBridge({
      connected,
      lastSeen: lastSeen != null && Number.isFinite(lastSeen) ? lastSeen : null,
      printerName: st.printerName ?? null,
      queued: Number(st.queued) || 0,
    });
  }, []);

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
      apply(hb);
      const res = await printApi.getPending();
      if (res?.bridge) apply(res.bridge);
      const jobs = res?.jobs || [];
      for (const job of jobs) {
        try {
          await printApi.ack(job.id, { status: "printing", station: "android" });
        } catch {
          continue;
        }
        try {
          const out = await nativePrintText(job.text, {
            address: printer.address,
            qrUrl: job.kind === "bill" ? job.qrUrl || null : null,
            logoUrl: job.kind === "bill" ? job.logoUrl || null : null,
            logoEscPosBase64: job.kind === "bill" ? job.logoEscPosBase64 || null : null,
          });
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
  }, [apply]);

  const tickPresence = useCallback(async () => {
    if (isNativeStaffApp()) return;
    if (typeof window !== "undefined" && !localStorage.getItem("restaurant_pos_token_v2")) return;
    try {
      apply(await printApi.getBridge());
    } catch {
      apply(OFF);
    }
  }, [apply]);

  useEffect(() => {
    if (running.current) return;
    running.current = true;
    const native = isNativeStaffApp();
    const ctrl = new AbortController();

    if (native) {
      void tickStation();
      const id = setInterval(() => void tickStation(), 1500);
      return () => {
        clearInterval(id);
        running.current = false;
        ctrl.abort();
      };
    }

    let pollId: ReturnType<typeof setInterval> | null = null;
    const startPoll = () => {
      if (pollId) return;
      void tickPresence();
      pollId = setInterval(() => void tickPresence(), 1000);
    };
    const stopPoll = () => {
      if (pollId) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const runLive = async () => {
      try {
        await printApi.watchBridgeLive(apply, ctrl.signal);
      } catch {
        if (!ctrl.signal.aborted) startPoll();
      }
      if (!ctrl.signal.aborted && !pollId) startPoll();
    };

    void tickPresence();
    void runLive();

    return () => {
      running.current = false;
      ctrl.abort();
      stopPoll();
    };
  }, [tickStation, tickPresence, apply]);

  const printerLinked = stationOnline && isNativeStaffApp();
  return {
    online: printerLinked || bridge.connected,
    stationOnline,
    printerLinked,
    androidConnected: bridge.connected,
    printerName: bridge.printerName,
    queued: bridge.queued || 0,
  };
}

export function PrintBridgeProvider({ children }: { children: ReactNode }) {
  const value = usePrintBridgeState();
  return createElement(PrintBridgeContext.Provider, { value }, children);
}

export function usePrintBridge(): PrintBridgeHook {
  const ctx = useContext(PrintBridgeContext);
  if (ctx) return ctx;
  return {
    online: false,
    stationOnline: false,
    printerLinked: false,
    androidConnected: false,
    printerName: null,
    queued: 0,
  };
}
