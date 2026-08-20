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
import type { Permission } from "../types";
import { getDb } from "../mongo";
import { ensureMongoBootstrap } from "./mongo-platform";

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

export async function readTenantMongo(tenantId: string): Promise<TenantState> {
  await ensureMongoBootstrap();
  const doc = (await (await tenantsCol()).findOne({
    _id: tenantId,
  } as never)) as unknown as TenantDoc | null;
  if (!doc) throw new Error("Tenant not found");
  const { _id: _omit, ...rest } = doc;
  return normalize(rest as TenantState);
}

/** Guest menu payload — skip orders/reviews/users so /api/state stays small + fast. */
export async function getPublicMenuMongo(tenantId: string) {
  await ensureMongoBootstrap();
  const doc = (await (await tenantsCol()).findOne(
    { _id: tenantId } as never,
    {
      projection: {
        id: 1,
        code: 1,
        branding: 1,
        shop: 1,
        tables: 1,
        menu: 1,
      },
    },
  )) as unknown as Partial<TenantDoc> | null;
  if (!doc) throw new Error("Tenant not found");
  const t = normalize({
    id: (doc.id as string) || tenantId,
    code: doc.code || "",
    branding: doc.branding!,
    shop: doc.shop!,
    users: [],
    stock: [],
    menu: doc.menu || [],
    orders: [],
    reviews: [],
    tables: doc.tables || [],
    dayCloses: [],
    nextOrderNumber: 1001,
  } as TenantState);
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

export async function writeTenantMongo(state: TenantState) {
  await (await tenantsCol()).replaceOne(
    { _id: state.id } as never,
    { _id: state.id, ...state } as never,
    { upsert: true },
  );
}

const ALL_PERMS: Permission[] = [
  "home",
  "pos",
  "orders",
  "kitchen",
  "menu",
  "stock",
  "settings",
  "staff",
];

export async function createEmptyTenantMongo(input: {
  id: string;
  code: string;
  name: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail?: string;
}) {
  const state: TenantState = {
    id: input.id,
    code: input.code.toUpperCase(),
    branding: {
      name: input.name,
      logoUrl: "",
      receiptFooter: `Thank you for dining with ${input.name}`,
    },
    shop: {
      address: "",
      phone: "",
      whatsapp: "",
      currency: "PKR",
      taxRate: 0,
      openHours: "",
      deliveryFee: 0,
      packingFee: 0,
      serviceChargePercent: 0,
    },
    users: [
      {
        id: `user_${Date.now()}`,
        username: input.adminUsername,
        password: input.adminPassword,
        role: "admin",
        roleLabel: "Owner",
        permissions: ALL_PERMS,
        active: true,
        mustChangePassword: true,
        ...(input.adminEmail?.trim() ? { email: input.adminEmail.trim() } : {}),
      },
    ],
    stock: [],
    menu: [],
    orders: [],
    reviews: [],
    tables: [
      { id: "t1", label: "1", seats: 4, status: "empty" },
      { id: "t2", label: "2", seats: 4, status: "empty" },
      { id: "t3", label: "3", seats: 4, status: "empty" },
      { id: "t4", label: "4", seats: 4, status: "empty" },
    ],
    dayCloses: [],
    nextOrderNumber: 1001,
  };
  await writeTenantMongo(state);
  return state;
}

export async function findUserMongo(tenantId: string, username: string) {
  const t = await readTenantMongo(tenantId);
  return t.users.find((u) => u.username.toLowerCase() === username.toLowerCase() && u.active);
}

export async function findUserByEmailMongo(tenantId: string, email: string) {
  const t = await readTenantMongo(tenantId);
  const needle = email.trim().toLowerCase();
  return t.users.find((u) => u.active && (u.email || "").trim().toLowerCase() === needle);
}

export async function upsertGuestClientMongo(
  tenantId: string,
  input: { email: string; name: string; googleSub?: string },
) {
  const t = await readTenantMongo(tenantId);
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
    await writeTenantMongo(t);
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
  await writeTenantMongo(t);
  return row;
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
  t.users = users.map((u) => {
    const prev = t.users.find((x) => x.id === u.id);
    if (prev && (!u.password || u.password === "")) {
      return { ...u, password: prev.password };
    }
    return u;
  });
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
  const doc = (await (await tenantsCol()).findOne({
    "orders.trackToken": token,
  } as never)) as unknown as TenantDoc | null;
  if (!doc) return null;
  const { _id: _omit, ...rest } = doc;
  const t = normalize(rest as TenantState);
  const order = t.orders.find((o) => o.trackToken === token);
  if (!order) return null;
  return { tenant: t, order };
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

export async function readTenantStaffViewMongo(tenantId: string) {
  await ensureMongoBootstrap();
  const docs = await (
    await tenantsCol()
  )
    .aggregate([
      { $match: { _id: tenantId } },
      {
        $project: {
          id: 1,
          code: 1,
          branding: 1,
          shop: 1,
          users: 1,
          stock: 1,
          menu: 1,
          tables: 1,
          nextOrderNumber: 1,
          orders: { $slice: ["$orders", 200] },
          dayCloses: { $slice: [{ $ifNull: ["$dayCloses", []] }, 30] },
        },
      },
    ])
    .toArray();
  const doc = docs[0] as unknown as TenantDoc | undefined;
  if (!doc) throw new Error("Tenant not found");
  const { _id: _omit, ...rest } = doc;
  const t = normalize({
    ...(rest as TenantState),
    reviews: [],
  });
  return {
    ...t,
    users: t.users.map(({ password: _p, ...u }) => ({ ...u, password: "" })),
    reviews: [],
  };
}
