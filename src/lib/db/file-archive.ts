/**
 * Order archiving on the local file platform (.data/tenants/<id>/).
 *
 * Mirrors mongo-archive.ts: terminal orders older than the retention window
 * move from tenant.json into <tenant>/orders-archive.json. One archive file
 * per kitchen, appended as a batch on each run.
 */
import fs from "fs";
import path from "path";
import { DEFAULT_RETENTION_DAYS, type ArchivedOrder, type ArchiveResult } from "./mongo-archive";
import type { Order, TenantState } from "../tenant-types";

const DATA_ROOT = path.join(process.cwd(), ".data");
const SAFE_TENANT_ID = /^[A-Za-z0-9_-]{1,80}$/;

const TERMINAL: ReadonlySet<string> = new Set(["completed", "cancelled"]);

function tenantDir(tenantId: string) {
  if (!SAFE_TENANT_ID.test(tenantId)) throw new Error("Invalid tenant");
  return path.join(DATA_ROOT, "tenants", tenantId);
}

function archivePath(tenantId: string) {
  return path.join(tenantDir(tenantId), "orders-archive.json");
}

function readArchive(tenantId: string): ArchivedOrder[] {
  const file = archivePath(tenantId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as ArchivedOrder[];
  } catch {
    return [];
  }
}

export async function archiveOldOrdersFile(
  tenantId: string,
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<ArchiveResult> {
  const file = path.join(tenantDir(tenantId), "tenant.json");
  if (!fs.existsSync(file)) return { archived: 0, skipped: 0, tenantId, retentionDays };

  const t = JSON.parse(fs.readFileSync(file, "utf8")) as TenantState;
  const cutoff = Date.now() - retentionDays * 86_400_000;
  const keep: Order[] = [];
  const toArchive: Order[] = [];

  for (const o of t.orders ?? []) {
    const terminal = TERMINAL.has(o.status);
    const old = new Date(o.createdAt).getTime() <= cutoff;
    if (terminal && old) toArchive.push(o);
    else keep.push(o);
  }

  if (!toArchive.length) return { archived: 0, skipped: 0, tenantId, retentionDays };

  const now = new Date().toISOString();
  const stamped: ArchivedOrder[] = toArchive.map((o) => ({ ...o, tenantId, archivedAt: now }));

  const existing = readArchive(tenantId);
  const known = new Set(existing.map((o) => o.id));
  const fresh = stamped.filter((o) => !known.has(o.id));
  fs.writeFileSync(archivePath(tenantId), JSON.stringify([...fresh, ...existing], null, 2), "utf8");

  t.orders = keep;
  t.archivedAt = now;
  fs.writeFileSync(file, JSON.stringify(t, null, 2), "utf8");

  return { archived: toArchive.length, skipped: keep.length, tenantId, retentionDays };
}

export async function queryArchivedOrdersFile(
  tenantId: string,
  opts: { from?: string; to?: string; limit?: number; offset?: number } = {},
): Promise<ArchivedOrder[]> {
  let rows = readArchive(tenantId);
  if (opts.from || opts.to) {
    const fromMs = opts.from ? new Date(opts.from).getTime() : 0;
    const toMs = opts.to ? new Date(opts.to).getTime() : Date.now();
    rows = rows.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromMs && t <= toMs;
    });
  }
  rows = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (opts.offset) rows = rows.slice(opts.offset);
  if (opts.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

export async function countArchivedOrdersFile(tenantId: string): Promise<number> {
  return readArchive(tenantId).length;
}
