import { createPrintJobsStore, type PrintJobsStore } from "./print-jobs-store";

// Global singleton so a warm serverless instance shares the queue + presence.
const g = globalThis as unknown as {
  __ordoPrintJobs?: PrintJobsStore;
  __ordoPrintPresence?: Map<string, { station: string; lastSeen: number; name?: string }>;
};

const STATION_ONLINE_MS = 25_000;

export const printJobs = (g.__ordoPrintJobs ||= createPrintJobsStore());
const presence = (g.__ordoPrintPresence ||= new Map());

function normStation(raw: string) {
  const v = String(raw || "").trim().toLowerCase();
  return v === "android" || v === "laptop" ? v : null;
}

function touch(station: string, name?: string) {
  const k = normStation(station);
  if (!k) return null;
  const e = { station: k, lastSeen: Date.now(), name: name || k };
  presence.set(k, e);
  return e;
}

function stat(s: string) {
  const e = presence.get(s);
  if (!e) return { station: s, online: false, lastSeen: null, name: null };
  const age = Date.now() - e.lastSeen;
  return {
    station: s,
    online: Number.isFinite(age) && age >= 0 && age <= STATION_ONLINE_MS,
    lastSeen: e.lastSeen,
    name: e.name || null,
  };
}

export const printStations = () => ({ android: stat("android"), laptop: stat("laptop") });

export function touchPrintStation(station: string, name?: string) {
  touch(station, name);
}
