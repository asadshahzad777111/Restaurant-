/**
 * AsFix/gear-style print BRIDGE — plan (see also docs/PRINT-BRIDGE.md)
 *
 * Laptop / iPhone Safari cannot drive the 58mm Bluetooth printer. The Staff APK
 * (Capacitor mobile/ordo-pos) is the printer host: after login it POSTs
 * /api/print/bridge (heartbeat) and GETs /api/print/jobs every ~1.5s, then
 * prints via the existing AsfixThermalPrint ESC/POS path and acks done/fail.
 *
 * Web POS "Print on Android" only enqueues a job when lastSeen is fresh.
 * Guest pickup/delivery auto-enqueues a customer bill (name, phone, location).
 *
 * Isolation: every document has tenantId; HTTP uses requireTenantSession.
 * Super never uses this API (no tenantId). Storage: Mongo, else .data/ file.
 */
import fs from "fs";
import path from "path";
import { useMongo } from "./env";
import { getDb } from "./mongo";
import { customerReceiptText, kitchenTicketText } from "./print";
import type { Order, TenantState } from "./tenant-types";
import { guestOrderPageUrl, receiptLogoUrl, sanitizeGuestOrderQrUrl, sanitizeReceiptLogoUrl } from "./receipt-layout";

export type PrintJobKind = "bill" | "kitchen";
export type PrintJobStatus = "queued" | "printing" | "done" | "failed";

export type PrintJob = {
  id: string;
  tenantId: string;
  kind: PrintJobKind;
  text: string;
  html?: string;
  /** Guest order URL for this kitchen — Staff APK prints a compact QR under the bill. */
  qrUrl?: string | null;
  /** Shop logo URL when Settings "Print logo on bill" is on. */
  logoUrl?: string | null;
  orderId?: string | null;
  orderRef?: string | null;
  createdAt: string;
  status: PrintJobStatus;
  error?: string | null;
  claimedBy?: string | null;
};

export type PrintBridgePresence = {
  tenantId: string;
  lastSeen: number;
  printerName?: string | null;
};

const SAFE_TENANT_ID = /^[A-Za-z0-9_-]{1,80}$/;
const JOB_TTL_MS = 30 * 60 * 1000;
const DONE_KEEP_MS = 2 * 60 * 60 * 1000;
/** Staff APK heartbeats ~1.5s. After this with no pulse, laptop shows red. */
const ONLINE_MS = 8_000;
const MAX_QUEUED = 40;
const DATA_ROOT = path.join(process.cwd(), ".data");

const fileLocks = new Map<string, Promise<unknown>>();
const bridgeWaiters = new Map<string, Set<() => void>>();

export function subscribeBridge(tenantId: string, fn: () => void): () => void {
  assertTenantId(tenantId);
  let set = bridgeWaiters.get(tenantId);
  if (!set) {
    set = new Set();
    bridgeWaiters.set(tenantId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) bridgeWaiters.delete(tenantId);
  };
}

/** Resolves on the next Staff heartbeat (or timeout). Laptop live-stream uses this. */
export function waitBridgePulse(tenantId: string, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      unsub();
      resolve();
    }, ms);
    const unsub = subscribeBridge(tenantId, () => {
      clearTimeout(t);
      unsub();
      resolve();
    });
  });
}

function notifyBridge(tenantId: string) {
  const set = bridgeWaiters.get(tenantId);
  if (!set) return;
  for (const fn of [...set]) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function assertTenantId(tenantId: string) {
  if (!SAFE_TENANT_ID.test(tenantId)) throw new Error("Invalid tenant");
}

function newJobId() {
  return `job_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function filePath(tenantId: string) {
  assertTenantId(tenantId);
  return path.join(DATA_ROOT, "tenants", tenantId, "print-bridge.json");
}

type FileBlob = {
  jobs: PrintJob[];
  bridge: { lastSeen: number; printerName?: string | null } | null;
};

function emptyBlob(): FileBlob {
  return { jobs: [], bridge: null };
}

function pruneJobs(jobs: PrintJob[], now = Date.now()): PrintJob[] {
  return jobs.filter((j) => {
    const t = new Date(j.createdAt).getTime();
    if (!Number.isFinite(t)) return false;
    if (j.status === "queued" || j.status === "printing") return now - t < JOB_TTL_MS;
    return now - t < DONE_KEEP_MS;
  });
}

function isOnline(lastSeen: number | null | undefined, now = Date.now()) {
  if (!lastSeen || !Number.isFinite(lastSeen)) return false;
  const age = now - lastSeen;
  return age >= 0 && age <= ONLINE_MS;
}

async function withFileLock<T>(tenantId: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = fileLocks.get(tenantId) || Promise.resolve();
  let release: (v?: unknown) => void = () => undefined;
  const next = new Promise((r) => {
    release = r;
  });
  fileLocks.set(tenantId, prev.then(() => next));
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (fileLocks.get(tenantId) === next) fileLocks.delete(tenantId);
  }
}

function readBlob(tenantId: string): FileBlob {
  const file = filePath(tenantId);
  if (!fs.existsSync(file)) return emptyBlob();
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as FileBlob;
    return {
      jobs: pruneJobs(Array.isArray(raw.jobs) ? raw.jobs : []),
      bridge: raw.bridge && Number.isFinite(raw.bridge.lastSeen) ? raw.bridge : null,
    };
  } catch {
    return emptyBlob();
  }
}

function writeBlob(tenantId: string, blob: FileBlob) {
  const file = filePath(tenantId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ jobs: pruneJobs(blob.jobs), bridge: blob.bridge }, null, 2));
}

async function jobsCol() {
  return (await getDb()).collection("print_jobs");
}

async function bridgeCol() {
  return (await getDb()).collection("print_bridge");
}

let mongoIndexed = false;
async function ensurePrintIndexes() {
  if (mongoIndexed) return;
  mongoIndexed = true;
  try {
    const jobs = await jobsCol();
    const bridge = await bridgeCol();
    await Promise.all([
      jobs.createIndex({ tenantId: 1, status: 1, createdAt: 1 }).catch(() => undefined),
      jobs.createIndex({ tenantId: 1, id: 1 }, { unique: true }).catch(() => undefined),
      bridge.createIndex({ tenantId: 1 }, { unique: true }).catch(() => undefined),
    ]);
  } catch {
    mongoIndexed = false;
  }
}

export function printBridgePublic(p: PrintBridgePresence | null, queued = 0) {
  const lastSeen = p?.lastSeen == null ? null : Number(p.lastSeen);
  const seen = lastSeen != null && Number.isFinite(lastSeen) ? lastSeen : null;
  return {
    connected: isOnline(seen),
    lastSeen: seen,
    printerName: p?.printerName || null,
    queued,
  };
}

export async function printBridgeSnapshot(tenantId: string) {
  const [presence, jobs] = await Promise.all([readPrintBridge(tenantId), listQueuedPrintJobs(tenantId)]);
  return printBridgePublic(presence, jobs.length);
}

export async function touchPrintBridge(
  tenantId: string,
  input: { lastSeen?: number; printerName?: string | null } = {},
): Promise<PrintBridgePresence> {
  assertTenantId(tenantId);
  const now = Date.now();
  const lastSeen = Number.isFinite(input.lastSeen) && (input.lastSeen as number) > 0 ? Math.min(input.lastSeen as number, now) : now;
  const printerName = input.printerName?.trim() || null;
  const row: PrintBridgePresence = { tenantId, lastSeen, printerName };

  if (useMongo()) {
    await ensurePrintIndexes();
    const col = await bridgeCol();
    await col.updateOne(
      { tenantId },
      { $set: { tenantId, lastSeen, printerName, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
    notifyBridge(tenantId);
    return row;
  }

  const saved = await withFileLock(tenantId, () => {
    const blob = readBlob(tenantId);
    blob.bridge = { lastSeen, printerName };
    writeBlob(tenantId, blob);
    return row;
  });
  notifyBridge(tenantId);
  return saved;
}

export async function readPrintBridge(tenantId: string): Promise<PrintBridgePresence | null> {
  assertTenantId(tenantId);
  if (useMongo()) {
    await ensurePrintIndexes();
    const col = await bridgeCol();
    const doc = (await col.findOne({ tenantId })) as PrintBridgePresence | null;
    if (!doc?.lastSeen) return null;
    return { tenantId, lastSeen: doc.lastSeen, printerName: doc.printerName ?? null };
  }
  return withFileLock(tenantId, () => {
    const blob = readBlob(tenantId);
    if (!blob.bridge) return null;
    return { tenantId, lastSeen: blob.bridge.lastSeen, printerName: blob.bridge.printerName ?? null };
  });
}

export async function createPrintJob(
  tenantId: string,
  input: {
    kind?: PrintJobKind;
    text?: string;
    html?: string;
    qrUrl?: string | null;
    logoUrl?: string | null;
    orderId?: string | null;
    orderRef?: string | null;
  },
): Promise<PrintJob> {
  assertTenantId(tenantId);
  const kind: PrintJobKind = input.kind === "kitchen" ? "kitchen" : "bill";
  const job: PrintJob = {
    id: newJobId(),
    tenantId,
    kind,
    text: typeof input.text === "string" ? input.text : "",
    html: typeof input.html === "string" ? input.html : undefined,
    qrUrl: sanitizeGuestOrderQrUrl(typeof input.qrUrl === "string" ? input.qrUrl : null),
    logoUrl: sanitizeReceiptLogoUrl(typeof input.logoUrl === "string" ? input.logoUrl : null),
    orderId: input.orderId ?? null,
    orderRef: input.orderRef ?? null,
    createdAt: new Date().toISOString(),
    status: "queued",
    error: null,
    claimedBy: null,
  };
  if (!job.text.trim() && !job.html) {
    throw new Error("Print job is empty");
  }

  if (useMongo()) {
    await ensurePrintIndexes();
    const col = await jobsCol();
    const queued = await col.countDocuments({ tenantId, status: "queued" });
    if (queued >= MAX_QUEUED) {
      const oldest = await col.find({ tenantId, status: "queued" }).sort({ createdAt: 1 }).limit(queued - MAX_QUEUED + 1).toArray();
      const ids = oldest.map((d) => d.id as string);
      if (ids.length) await col.deleteMany({ tenantId, id: { $in: ids } });
    }
    await col.insertOne({ ...job });
    notifyBridge(tenantId);
    return job;
  }

  return withFileLock(tenantId, () => {
    const blob = readBlob(tenantId);
    blob.jobs = pruneJobs(blob.jobs);
    const queued = blob.jobs.filter((j) => j.status === "queued");
    if (queued.length >= MAX_QUEUED) {
      const drop = queued.length - MAX_QUEUED + 1;
      const ids = new Set(queued.slice(0, drop).map((j) => j.id));
      blob.jobs = blob.jobs.filter((j) => !ids.has(j.id));
    }
    blob.jobs.push(job);
    writeBlob(tenantId, blob);
    notifyBridge(tenantId);
    return job;
  });
}

export async function listQueuedPrintJobs(tenantId: string): Promise<PrintJob[]> {
  assertTenantId(tenantId);
  const cutoff = new Date(Date.now() - JOB_TTL_MS).toISOString();
  if (useMongo()) {
    await ensurePrintIndexes();
    const col = await jobsCol();
    const rows = await col
      .find({ tenantId, status: "queued", createdAt: { $gte: cutoff } })
      .sort({ createdAt: 1 })
      .limit(20)
      .toArray();
    return rows.map((d) => ({
      id: String(d.id),
      tenantId: String(d.tenantId),
      kind: d.kind === "kitchen" ? "kitchen" : "bill",
      text: String(d.text || ""),
      html: typeof d.html === "string" ? d.html : undefined,
      qrUrl: typeof d.qrUrl === "string" ? d.qrUrl : null,
      logoUrl: typeof d.logoUrl === "string" ? d.logoUrl : null,
      orderId: (d.orderId as string) ?? null,
      orderRef: (d.orderRef as string) ?? null,
      createdAt: String(d.createdAt),
      status: "queued",
      error: (d.error as string) ?? null,
      claimedBy: (d.claimedBy as string) ?? null,
    }));
  }
  return withFileLock(tenantId, () => {
    const blob = readBlob(tenantId);
    blob.jobs = pruneJobs(blob.jobs);
    writeBlob(tenantId, blob);
    return blob.jobs.filter((j) => j.status === "queued" && j.tenantId === tenantId);
  });
}

export async function updatePrintJob(
  tenantId: string,
  id: string,
  input: { status: PrintJobStatus; error?: string | null; claimedBy?: string | null },
): Promise<PrintJob | null> {
  assertTenantId(tenantId);
  const status = input.status;
  if (useMongo()) {
    await ensurePrintIndexes();
    const col = await jobsCol();
    const filter: Record<string, unknown> = { tenantId, id };
    if (status === "printing") filter.status = "queued";
    const res = await col.findOneAndUpdate(
      filter,
      {
        $set: {
          status,
          error: input.error ?? null,
          claimedBy: input.claimedBy ?? null,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );
    const d = res as PrintJob | null;
    if (!d?.id) return null;
    return {
      id: String(d.id),
      tenantId: String(d.tenantId),
      kind: d.kind === "kitchen" ? "kitchen" : "bill",
      text: String(d.text || ""),
      html: d.html,
      qrUrl: d.qrUrl ?? null,
      logoUrl: d.logoUrl ?? null,
      orderId: d.orderId ?? null,
      orderRef: d.orderRef ?? null,
      createdAt: String(d.createdAt),
      status: d.status,
      error: d.error ?? null,
      claimedBy: d.claimedBy ?? null,
    };
  }

  return withFileLock(tenantId, () => {
    const blob = readBlob(tenantId);
    const job = blob.jobs.find((j) => j.id === id && j.tenantId === tenantId);
    if (!job) return null;
    if (status === "printing" && job.status !== "queued") return null;
    job.status = status;
    if (input.error !== undefined) job.error = input.error;
    if (input.claimedBy !== undefined) job.claimedBy = input.claimedBy;
    writeBlob(tenantId, blob);
    return job;
  });
}

/** Guest pickup/delivery (and any caller): enqueue a 58mm customer bill for this tenant only. */
export async function enqueueOrderSlip(
  tenantId: string,
  tenant: TenantState,
  order: Order,
  kind: PrintJobKind = "bill",
): Promise<PrintJob | null> {
  assertTenantId(tenantId);
  const text = kind === "kitchen" ? kitchenTicketText(tenant, order) : customerReceiptText(tenant, order);
  return createPrintJob(tenantId, {
    kind,
    text,
    qrUrl: kind === "bill" ? guestOrderPageUrl(tenant.code) : null,
    logoUrl: kind === "bill" ? receiptLogoUrl(tenant) : null,
    orderId: order.id,
    orderRef: `#${order.number}`,
  });
}

export function shouldAutoPrintGuestOrder(order: { channel: string; serviceType: string }) {
  if (order.channel !== "guest") return false;
  return order.serviceType === "pickup" || order.serviceType === "delivery";
}
