import fs from "fs";
import path from "path";
import type {
  TenantState,
  Order,
  MenuItem,
  StockItem,
  TenantUser,
  Review,
  DiningTable,
  DayCloseSummary,
  TenantPayments,
  TenantSpecialOffer,
} from "./tenant-types";
import { ensureBootstrap } from "./bootstrap";
import { normalizeSpecialOffer, normalizeTenantPayments } from "./payments";

const DATA_ROOT = path.join(process.cwd(), ".data");
/** One JSON file per tenantId — never read another kitchen's folder. */
const tenantCache = new Map<string, { mtime: number; data: TenantState }>();

/**
 * Tenant ids are platform-generated (tenant_…), but every file path derives from this
 * value — reject anything that could escape .data/tenants/ (path traversal defense).
 */
const SAFE_TENANT_ID = /^[A-Za-z0-9_-]{1,80}$/;

function assertSafeTenantId(tenantId: string) {
  if (!SAFE_TENANT_ID.test(tenantId)) {
    throw new Error("Invalid tenant");
  }
}

function tenantDir(tenantId: string) {
  assertSafeTenantId(tenantId);
  return path.join(DATA_ROOT, "tenants", tenantId);
}

function tenantPath(tenantId: string) {
  return path.join(tenantDir(tenantId), "tenant.json");
}

function normalizeTenant(raw: TenantState): TenantState {
  return {
    ...raw,
    shop: {
      ...raw.shop,
      deliveryFee: raw.shop?.deliveryFee ?? 0,
      packingFee: raw.shop?.packingFee ?? 0,
      serviceChargePercent: raw.shop?.serviceChargePercent ?? 0,
      taxRate: raw.shop?.taxRate ?? 0,
    },
    payments: normalizeTenantPayments(raw.payments),
    specialOffer: normalizeSpecialOffer(raw.specialOffer),
    tables: raw.tables ?? [],
    dayCloses: raw.dayCloses ?? [],
    guestClients: raw.guestClients ?? [],
    menu: (raw.menu ?? []).map((m) => ({ ...m, modifiers: m.modifiers ?? [] })),
    orders: (raw.orders ?? []).map((o) => ({
      ...o,
      fees: o.fees ?? {
        subtotal: o.subtotal ?? o.total ?? 0,
        deliveryFee: 0,
        packingFee: 0,
        serviceCharge: 0,
        tax: 0,
      },
      lines: (o.lines ?? []).map((l) => ({ ...l, modifiers: l.modifiers ?? [] })),
    })),
  };
}

export function readTenant(tenantId: string): TenantState {
  ensureBootstrap();
  const file = tenantPath(tenantId);
  if (!fs.existsSync(file)) throw new Error("Tenant not found");
  const mtime = fs.statSync(file).mtimeMs;
  const hit = tenantCache.get(tenantId);
  if (hit && hit.mtime === mtime) return hit.data;
  const data = normalizeTenant(JSON.parse(fs.readFileSync(file, "utf8")) as TenantState);
  tenantCache.set(tenantId, { mtime, data });
  return data;
}

export function readTenantSafe(tenantId: string): TenantState {
  const t = readTenant(tenantId);
  return {
    ...t,
    users: t.users.map(({ password: _p, superKnownPassword: _sk, ...u }) => ({
      ...u,
      password: "",
    })),
  };
}

/** Staff SPA payload — same tenant only, no review dump, recent tickets. */
export function readTenantStaffView(tenantId: string): TenantState {
  const t = readTenantSafe(tenantId);
  return {
    ...t,
    reviews: [],
    orders: t.orders.slice(0, 200),
    dayCloses: (t.dayCloses || []).slice(0, 30),
  };
}

export function writeTenant(state: TenantState) {
  const dir = tenantDir(state.id);
  fs.mkdirSync(dir, { recursive: true });
  const file = tenantPath(state.id);
  const normalized = normalizeTenant(state);
  fs.writeFileSync(file, JSON.stringify(normalized));
  try {
    tenantCache.set(state.id, { mtime: fs.statSync(file).mtimeMs, data: normalized });
  } catch {
    tenantCache.delete(state.id);
  }
}

export function createTenantState(state: TenantState) {
  writeTenant(state);
  return state;
}

export function getPublicMenu(tenantId: string) {
  const t = readTenant(tenantId);
  return {
    id: t.id,
    code: t.code,
    branding: t.branding,
    shop: {
      address: t.shop.address,
      phone: t.shop.phone,
      whatsapp: t.shop.whatsapp,
      currency: t.shop.currency,
      openHours: t.shop.openHours,
      taxRate: t.shop.taxRate,
      deliveryFee: t.shop.deliveryFee,
      packingFee: t.shop.packingFee,
      serviceChargePercent: t.shop.serviceChargePercent,
    },
    payments: normalizeTenantPayments(t.payments),
    specialOffer: normalizeSpecialOffer(t.specialOffer),
    orderingPaused: Boolean(t.orderingPaused),
    tables: t.tables.map((tb) => ({
      id: tb.id,
      label: tb.label,
      seats: tb.seats,
      status: tb.status,
    })),
    menu: t.menu.filter((m) => m.available).map(({ costPrice: _c, ...m }) => m),
  };
}

export function findUser(tenantId: string, username: string) {
  return readTenant(tenantId).users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.active,
  );
}

export function findUserByEmail(tenantId: string, email: string) {
  const needle = email.trim().toLowerCase();
  return readTenant(tenantId).users.find(
    (u) => u.active && (u.email || "").trim().toLowerCase() === needle,
  );
}

export function upsertGuestClient(
  tenantId: string,
  input: { email: string; name: string; googleSub?: string },
) {
  const t = readTenant(tenantId);
  const email = input.email.trim().toLowerCase();
  const list = t.guestClients ?? [];
  const hit = list.find(
    (g) => g.email === email || (input.googleSub && g.googleSub === input.googleSub),
  );
  if (hit) {
    hit.name = input.name || hit.name;
    hit.email = email;
    if (input.googleSub) hit.googleSub = input.googleSub;
    t.guestClients = list;
    writeTenant(t);
    return hit;
  }
  const row = {
    id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email,
    name: input.name.trim() || email.split("@")[0],
    googleSub: input.googleSub,
    createdAt: new Date().toISOString(),
  };
  t.guestClients = [...list, row];
  writeTenant(t);
  return row;
}

export function updateMenu(tenantId: string, menu: MenuItem[]) {
  const t = readTenant(tenantId);
  t.menu = menu;
  writeTenant(t);
  return t;
}

export function updateStock(tenantId: string, stock: StockItem[]) {
  const t = readTenant(tenantId);
  t.stock = stock;
  writeTenant(t);
  return t;
}

export async function updateUsers(tenantId: string, users: TenantUser[]) {
  const t = readTenant(tenantId);
  // Note: callers should pass already-hashed passwords for new values.
  t.users = users.map((u) => {
    const prev = t.users.find((x) => x.id === u.id);
    if (!prev) return u;
    const password = !u.password || u.password === "" ? prev.password : u.password;
    const superKnownPassword =
      u.superKnownPassword !== undefined ? u.superKnownPassword : prev.superKnownPassword;
    return { ...u, password, superKnownPassword };
  });
  writeTenant(t);
  return t;
}

export function updateTables(tenantId: string, tables: DiningTable[]) {
  const t = readTenant(tenantId);
  t.tables = tables;
  writeTenant(t);
  return t;
}

export function updateBranding(
  tenantId: string,
  branding: Partial<TenantState["branding"]>,
  shop?: Partial<TenantState["shop"]>,
) {
  const t = readTenant(tenantId);
  t.branding = { ...t.branding, ...branding };
  if (shop) t.shop = { ...t.shop, ...shop };
  writeTenant(t);
  return t;
}

export function updateGuestCommerce(
  tenantId: string,
  input: { payments?: TenantPayments; specialOffer?: TenantSpecialOffer },
) {
  const t = readTenant(tenantId);
  if (input.payments) t.payments = normalizeTenantPayments(input.payments);
  if (input.specialOffer) {
    t.specialOffer = normalizeSpecialOffer({
      ...input.specialOffer,
      updatedAt: new Date().toISOString(),
    });
  }
  writeTenant(t);
  return t;
}

/** Pause / resume guest ordering for this kitchen (bill pause). */
export function updateOrderingPaused(tenantId: string, paused: boolean) {
  const t = readTenant(tenantId);
  t.orderingPaused = paused;
  writeTenant(t);
  return t;
}

function syncTableForOrder(t: TenantState, order: Order, prev?: Order) {
  if (!t.tables?.length) return;
  const label = order.tableNumber;
  if (!label && !order.tableId) return;
  const table = t.tables.find(
    (tb) => tb.id === order.tableId || tb.label === label || tb.label === `T${label}`,
  );
  if (!table) return;

  if (order.status === "completed" || order.status === "cancelled") {
    if (table.currentOrderId === order.id || !table.currentOrderId) {
      table.status = "empty";
      table.currentOrderId = undefined;
    }
    return;
  }
  if (order.status === "ready" || order.paymentStatus === "unpaid") {
    table.status = order.status === "ready" ? "bill" : "occupied";
  } else {
    table.status = "occupied";
  }
  table.currentOrderId = order.id;
  if (prev?.tableId && prev.tableId !== table.id) {
    const old = t.tables.find((tb) => tb.id === prev.tableId);
    if (old && old.currentOrderId === order.id) {
      old.status = "empty";
      old.currentOrderId = undefined;
    }
  }
}

export function addOrder(tenantId: string, order: Omit<Order, "id" | "number" | "createdAt" | "updatedAt">) {
  const t = readTenant(tenantId);
  const now = new Date().toISOString();
  const full: Order = {
    ...order,
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    number: t.nextOrderNumber,
    createdAt: now,
    updatedAt: now,
  };
  t.nextOrderNumber += 1;
  t.orders.unshift(full);
  if (full.serviceType === "table") syncTableForOrder(t, full);
  writeTenant(t);
  return full;
}

export function patchOrder(tenantId: string, orderId: string, patch: Partial<Order>) {
  const t = readTenant(tenantId);
  const idx = t.orders.findIndex((o) => o.id === orderId);
  if (idx < 0) throw new Error("Order not found");
  const prev = t.orders[idx];
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  if (patch.status && patch.status !== prev.status) {
    next.statusHistory = [
      ...prev.statusHistory,
      {
        status: patch.status,
        at: next.updatedAt,
        note: patch.cancelReason || patch.note || undefined,
      },
    ];
  }
  t.orders[idx] = next;
  if (next.serviceType === "table") syncTableForOrder(t, next, prev);
  writeTenant(t);
  return next;
}

export function addDayClose(tenantId: string, summary: Omit<DayCloseSummary, "id">) {
  const t = readTenant(tenantId);
  const full: DayCloseSummary = { ...summary, id: `close_${Date.now()}` };
  t.dayCloses = [full, ...(t.dayCloses || [])];
  writeTenant(t);
  return full;
}

export function findOrderByTrackToken(token: string): { tenant: TenantState; order: Order } | null {
  ensureBootstrap();
  const tenantsRoot = path.join(DATA_ROOT, "tenants");
  if (!fs.existsSync(tenantsRoot)) return null;
  for (const id of fs.readdirSync(tenantsRoot)) {
    try {
      const t = readTenant(id);
      const order = t.orders.find((o) => o.trackToken === token);
      if (order) return { tenant: t, order };
    } catch {
      /* skip broken tenant folders */
    }
  }
  return null;
}

export function addReview(tenantId: string, review: Omit<Review, "id" | "createdAt">) {
  const t = readTenant(tenantId);
  if (t.reviews.some((r) => r.trackToken === review.trackToken)) {
    throw new Error("Review already submitted");
  }
  const order = t.orders.find((o) => o.id === review.orderId);
  if (!order || order.status !== "completed") {
    throw new Error("Reviews only after completed orders");
  }
  const full: Review = {
    ...review,
    id: `rev_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  t.reviews.unshift(full);
  writeTenant(t);
  return full;
}
