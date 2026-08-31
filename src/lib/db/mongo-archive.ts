/**
 * Order archiving — protects the 16MB BSON per-document limit on free Mongo.
 *
 * A restaurant's tenant document grows with every order (~0.6–1 KB each).
 * At 500 orders/day that hits 16MB in ~3–4 weeks, so terminal orders older
 * than the retention window are moved OUT of the tenant doc into a separate
 * `order_archive` collection — one document per order — where the per-doc
 * limit is a non-issue. Nothing is deleted; history stays queryable.
 *
 * Rules:
 * - Only orders in a terminal state (completed / cancelled) are archived —
 *   an in-flight order is never touched.
 * - `archivedAt` + `tenantId` are stamped so exports can join history.
 * - The tenant doc keeps `orders` capped at the retention window.
 */
import { getDb } from "../mongo";
import type { Order, TenantState } from "../tenant-types";

const TERMINAL: ReadonlySet<string> = new Set(["completed", "cancelled"]);

export const DEFAULT_RETENTION_DAYS = 90;

async function tenantsCol() {
  return (await getDb()).collection("tenants");
}

async function archiveCol() {
  return (await getDb()).collection("order_archive");
}

export interface ArchiveResult {
  archived: number;
  skipped: number;
  tenantId: string;
  retentionDays: number;
}

export interface ArchivedOrder extends Order {
  tenantId: string;
  archivedAt: string;
}

/**
 * Move terminal orders older than `retentionDays` from the tenant doc into
 * `order_archive`. Returns how many were moved.
 */
export async function archiveOldOrdersMongo(
  tenantId: string,
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<ArchiveResult> {
  const col = await tenantsCol();
  const doc = (await col.findOne({ _id: tenantId } as never)) as unknown as
    | (TenantState & { _id: string })
    | null;
  if (!doc) return { archived: 0, skipped: 0, tenantId, retentionDays };

  const cutoff = Date.now() - retentionDays * 86_400_000;
  const keep: Order[] = [];
  const toArchive: Order[] = [];

  for (const o of doc.orders ?? []) {
    const terminal = TERMINAL.has(o.status);
    const old = new Date(o.createdAt).getTime() <= cutoff;
    if (terminal && old) toArchive.push(o);
    else keep.push(o);
  }

  if (!toArchive.length) {
    return { archived: 0, skipped: 0, tenantId, retentionDays };
  }

  const now = new Date().toISOString();
  const archiveDocs = toArchive.map((o) => ({ ...o, tenantId, archivedAt: now }));

  const ac = await archiveCol();
  // Batch insert; guard duplicate _id collisions if archiving re-runs.
  await ac.insertMany(archiveDocs as never, { ordered: false }).catch(() => {
    // Duplicate-key on rerun is fine — the orders are already archived.
  });

  // Rewrite the tenant doc without the archived orders.
  await col.updateOne(
    { _id: tenantId } as never,
    { $set: { orders: keep, archivedAt: now } } as never,
  );

  return { archived: toArchive.length, skipped: keep.length, tenantId, retentionDays };
}

/** Query archived orders for a tenant, newest first. */
export async function queryArchivedOrdersMongo(
  tenantId: string,
  opts: { from?: string; to?: string; limit?: number; offset?: number } = {},
): Promise<ArchivedOrder[]> {
  const ac = await archiveCol();
  const q: Record<string, unknown> = { tenantId };
  if (opts.from || opts.to) {
    q.createdAt = {
      ...(opts.from ? { $gte: opts.from } : {}),
      ...(opts.to ? { $lte: opts.to } : {}),
    };
  }
  const cursor = ac.find(q).sort({ createdAt: -1 });
  if (opts.offset) cursor.skip(opts.offset);
  if (opts.limit) cursor.limit(opts.limit);
  return (await cursor.toArray()) as unknown as ArchivedOrder[];
}

/** Count archived orders for a tenant (for the Settings "Archive" card). */
export async function countArchivedOrdersMongo(tenantId: string): Promise<number> {
  const ac = await archiveCol();
  return ac.countDocuments({ tenantId } as never);
}

/** List tenant ids that have archive collection entries (Super view). */
export async function listArchivedTenantsMongo(): Promise<
  { tenantId: string; count: number }[]
> {
  const ac = await archiveCol();
  const agg = (await ac
    .aggregate([
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray()) as unknown as { _id: string; count: number }[];
  return agg.map((r) => ({ tenantId: r._id, count: r.count }));
}
