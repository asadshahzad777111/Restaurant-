import type {
  TenantState,
  Order,
  MenuItem,
  StockItem,
  TenantUser,
  Review,
  DiningTable,
  DayCloseSummary,
} from "../tenant-types";
import { getDb } from "../mongo";
import { ensureMongoBootstrap } from "./mongo-platform";
import { demoTenantSeed } from "./seeds";

type TenantDoc = TenantState & { _id: string };

async function tenantsCol() {
  return (await getDb()).collection("tenants");
}

function normalize(raw: TenantState): TenantState {
  return {
    ...raw,
    shop: {
      ...raw.shop,
      deliveryFee: raw.shop?.deliveryFee ?? 0,
      packingFee: raw.shop?.packingFee ?? 0,
      serviceChargePercent: raw.shop?.serviceChargePercent ?? 0,
      taxRate: raw.shop?.taxRate ?? 0,
    },
    tables: raw.tables ?? [],
    dayCloses: raw.dayCloses ?? [],
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

export async function readTenantMongo(tenantId: string): Promise<TenantState> {
  await ensureMongoBootstrap();
  const doc = (await (await tenantsCol()).findOne({
    _id: tenantId,
  } as never)) as unknown as TenantDoc | null;
  if (!doc) throw new Error("Tenant not found");
  const { _id: _omit, ...rest } = doc;
  return normalize(rest as TenantState);
}

export async function writeTenantMongo(state: TenantState) {
  await (await tenantsCol()).replaceOne(
    { _id: state.id } as never,
    { _id: state.id, ...state } as never,
    { upsert: true },
  );
}

export async function createEmptyTenantMongo(input: {
  id: string;
  code: string;
  name: string;
  adminUsername: string;
  adminPassword: string;
}) {
  const base = demoTenantSeed();
  const state: TenantState = {
    ...base,
    id: input.id,
    code: input.code.toUpperCase(),
    branding: {
      name: input.name,
      logoUrl: "",
      receiptFooter: `Thank you for dining with ${input.name}`,
    },
    users: [
      {
        id: `user_${Date.now()}`,
        username: input.adminUsername,
        password: input.adminPassword,
        role: "admin",
        roleLabel: "Owner",
        permissions: base.users[0].permissions,
        active: true,
        mustChangePassword: true,
      },
    ],
    orders: [],
    reviews: [],
    tables: base.tables.map((tb) => ({
      ...tb,
      status: "empty" as const,
      currentOrderId: undefined,
    })),
    dayCloses: [],
    nextOrderNumber: 1001,
  };
  await writeTenantMongo(state);
  return state;
}

export async function getPublicMenuMongo(tenantId: string) {
  const t = await readTenantMongo(tenantId);
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
    tables: t.tables.map((tb) => ({
      id: tb.id,
      label: tb.label,
      seats: tb.seats,
      status: tb.status,
    })),
    menu: t.menu.filter((m) => m.available),
  };
}

export async function findUserMongo(tenantId: string, username: string) {
  const t = await readTenantMongo(tenantId);
  return t.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.active);
}

export async function updateMenuMongo(tenantId: string, menu: MenuItem[]) {
  const t = await readTenantMongo(tenantId);
  t.menu = menu;
  await writeTenantMongo(t);
  return t;
}

export async function updateStockMongo(tenantId: string, stock: StockItem[]) {
  const t = await readTenantMongo(tenantId);
  t.stock = stock;
  await writeTenantMongo(t);
  return t;
}

export async function updateUsersMongo(tenantId: string, users: TenantUser[]) {
  const t = await readTenantMongo(tenantId);
  t.users = users;
  await writeTenantMongo(t);
  return t;
}

export async function updateTablesMongo(tenantId: string, tables: DiningTable[]) {
  const t = await readTenantMongo(tenantId);
  t.tables = tables;
  await writeTenantMongo(t);
  return t;
}

export async function updateBrandingMongo(
  tenantId: string,
  branding: Partial<TenantState["branding"]>,
  shop?: Partial<TenantState["shop"]>,
) {
  const t = await readTenantMongo(tenantId);
  t.branding = { ...t.branding, ...branding };
  if (shop) t.shop = { ...t.shop, ...shop };
  await writeTenantMongo(t);
  return t;
}

function syncTable(t: TenantState, order: Order, prev?: Order) {
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
  table.status = order.status === "ready" ? "bill" : "occupied";
  table.currentOrderId = order.id;
  if (prev?.tableId && prev.tableId !== table.id) {
    const old = t.tables.find((tb) => tb.id === prev.tableId);
    if (old && old.currentOrderId === order.id) {
      old.status = "empty";
      old.currentOrderId = undefined;
    }
  }
}

export async function addOrderMongo(
  tenantId: string,
  order: Omit<Order, "id" | "number" | "createdAt" | "updatedAt">,
) {
  const t = await readTenantMongo(tenantId);
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
  if (full.serviceType === "table") syncTable(t, full);
  await writeTenantMongo(t);
  return full;
}

export async function patchOrderMongo(tenantId: string, orderId: string, patch: Partial<Order>) {
  const t = await readTenantMongo(tenantId);
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
  if (next.serviceType === "table") syncTable(t, next, prev);
  await writeTenantMongo(t);
  return next;
}

export async function addDayCloseMongo(tenantId: string, summary: Omit<DayCloseSummary, "id">) {
  const t = await readTenantMongo(tenantId);
  const full: DayCloseSummary = { ...summary, id: `close_${Date.now()}` };
  t.dayCloses = [full, ...(t.dayCloses || [])];
  await writeTenantMongo(t);
  return full;
}

export async function findOrderByTrackTokenMongo(token: string) {
  await ensureMongoBootstrap();
  const docs = await (await tenantsCol()).find({}).toArray();
  for (const doc of docs) {
    const { _id: _omit, ...rest } = doc as unknown as TenantDoc;
    const t = normalize(rest as TenantState);
    const order = t.orders.find((o) => o.trackToken === token);
    if (order) return { tenant: t, order };
  }
  return null;
}

export async function addReviewMongo(tenantId: string, review: Omit<Review, "id" | "createdAt">) {
  const t = await readTenantMongo(tenantId);
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
  await writeTenantMongo(t);
  return full;
}

export async function readTenantSafeMongo(tenantId: string) {
  const t = await readTenantMongo(tenantId);
  return {
    ...t,
    users: t.users.map(({ password: _p, ...u }) => ({ ...u, password: "" })),
  };
}
