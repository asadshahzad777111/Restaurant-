import fs from "fs";
import path from "path";
import type { TenantState, Order, MenuItem, StockItem, TenantUser, Review } from "./tenant-types";
import { ensureBootstrap } from "./bootstrap";

const DATA_ROOT = path.join(process.cwd(), ".data");

function tenantDir(tenantId: string) {
  return path.join(DATA_ROOT, "tenants", tenantId);
}

function tenantPath(tenantId: string) {
  return path.join(tenantDir(tenantId), "tenant.json");
}

export function readTenant(tenantId: string): TenantState {
  ensureBootstrap();
  const file = tenantPath(tenantId);
  if (!fs.existsSync(file)) throw new Error("Tenant not found");
  return JSON.parse(fs.readFileSync(file, "utf8")) as TenantState;
}

/** Full tenant state for authenticated staff — strip passwords from users. */
export function readTenantSafe(tenantId: string): TenantState {
  const t = readTenant(tenantId);
  return {
    ...t,
    users: t.users.map(({ password: _p, ...u }) => ({ ...u, password: "" })),
  };
}

export function writeTenant(state: TenantState) {
  const dir = tenantDir(state.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(tenantPath(state.id), JSON.stringify(state, null, 2));
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
    },
    menu: t.menu.filter((m) => m.available),
  };
}

export function findUser(tenantId: string, username: string) {
  return readTenant(tenantId).users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.active,
  );
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

export function updateUsers(tenantId: string, users: TenantUser[]) {
  const t = readTenant(tenantId);
  t.users = users;
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
      { status: patch.status, at: next.updatedAt, note: patch.note },
    ];
  }
  t.orders[idx] = next;
  writeTenant(t);
  return next;
}

export function findOrderByTrackToken(token: string): { tenant: TenantState; order: Order } | null {
  ensureBootstrap();
  const tenantsRoot = path.join(DATA_ROOT, "tenants");
  if (!fs.existsSync(tenantsRoot)) return null;
  for (const id of fs.readdirSync(tenantsRoot)) {
    const file = tenantPath(id);
    if (!fs.existsSync(file)) continue;
    const t = JSON.parse(fs.readFileSync(file, "utf8")) as TenantState;
    const order = t.orders.find((o) => o.trackToken === token);
    if (order) return { tenant: t, order };
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
