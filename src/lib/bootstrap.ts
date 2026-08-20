import fs from "fs";
import path from "path";
import type { PlatformState } from "./types";
import type { TenantState } from "./tenant-types";
import type { Permission } from "./types";
import { PLATFORM_CONTACT_WHATSAPP } from "./contact";
import { demoMenu, demoStock } from "./demo-catalog";

const DATA_ROOT = path.join(process.cwd(), ".data");
const PLATFORM_PATH = path.join(DATA_ROOT, "platform.json");
const DATA_VERSION = 5;
const OLD_PLATFORM_WHATSAPP = ["+923001234567", "+923000000000", "03001234567"];
const VERSION_PATH = path.join(DATA_ROOT, "version.json");

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

function demoTenant(): TenantState {
  return {
    id: "tenant_demo",
    code: "DEMO",
    branding: {
      name: "Demo Restaurant",
      logoUrl: "",
      receiptFooter: "Thank you for dining with Demo Restaurant",
    },
    shop: {
      address: "12 MM Alam Road, Lahore",
      phone: "+92 300 0000000",
      whatsapp: "+923000000000",
      currency: "PKR",
      taxRate: 5,
      openHours: "11:00 – 23:00",
      deliveryFee: 150,
      packingFee: 40,
      serviceChargePercent: 0,
    },
    users: [
      {
        id: "user_admin",
        username: "admin",
        password: "admin123",
        role: "admin",
        roleLabel: "Owner",
        permissions: ALL_PERMS,
        active: true,
        mustChangePassword: true,
      },
      {
        id: "user_cashier",
        username: "cashier",
        password: "staff123",
        role: "staff",
        roleLabel: "Cashier",
        permissions: ["home", "pos", "orders"],
        active: true,
      },
      {
        id: "user_kitchen",
        username: "kitchen",
        password: "staff123",
        role: "staff",
        roleLabel: "Kitchen",
        permissions: ["home", "kitchen", "orders"],
        active: true,
      },
    ],
    stock: demoStock(),
    menu: demoMenu(),
    orders: [],
    reviews: [],
    tables: [
      { id: "t1", label: "1", seats: 2, status: "empty" },
      { id: "t2", label: "2", seats: 2, status: "empty" },
      { id: "t3", label: "3", seats: 4, status: "empty" },
      { id: "t4", label: "4", seats: 4, status: "empty" },
      { id: "t5", label: "5", seats: 6, status: "empty" },
      { id: "t6", label: "6", seats: 6, status: "empty" },
      { id: "t7", label: "7", seats: 4, status: "empty" },
      { id: "t8", label: "8", seats: 2, status: "empty" },
    ],
    dayCloses: [],
    nextOrderNumber: 1001,
  };
}

export function launchPlans(): PlatformState["plans"] {
  return [
    {
      id: "starter",
      name: "Starter",
      pricePkr: 999,
      maxStaff: 5,
      description: "One kitchen · guest QR · kitchen tickets",
      features: [
        "Guest dining, takeaway, delivery",
        "QR / scan entry",
        "Counter POS + kitchen display",
        "Public menu in sync with POS",
        "Browser receipts",
        "Up to 5 staff",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      pricePkr: 1999,
      maxStaff: 15,
      description: "Staff roles · stock · reviews",
      features: [
        "Everything in Starter",
        "Staff roles & permissions",
        "Stock alerts",
        "Guest tracking + reviews",
        "Receipt branding",
        "Up to 15 staff",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      pricePkr: 4499,
      maxStaff: 40,
      description: "Multi-kitchen Super desk · printer quote",
      features: [
        "Everything in Pro",
        "Super Admin: create / suspend kitchens",
        "Open restaurant (help without mixing data)",
        "Thermal printer package on request",
        "Priority onboarding",
        "Up to 40 staff",
      ],
    },
  ];
}

function defaultPlatform(): PlatformState {
  return {
    superAdmin: { username: "super", password: "super123" },
    contactWhatsapp: PLATFORM_CONTACT_WHATSAPP,
    plans: launchPlans(),
    tenants: [
      {
        id: "tenant_demo",
        code: "DEMO",
        name: "Demo Restaurant",
        planId: "pro",
        status: "active",
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    leads: [],
  };
}

function refreshDemoCatalogOnly() {
  const demoPath = path.join(DATA_ROOT, "tenants", "tenant_demo", "tenant.json");
  fs.mkdirSync(path.dirname(demoPath), { recursive: true });
  if (!fs.existsSync(demoPath)) {
    fs.writeFileSync(demoPath, JSON.stringify(demoTenant(), null, 2));
    return;
  }
  try {
    const existing = JSON.parse(fs.readFileSync(demoPath, "utf8")) as TenantState;
    if (existing.id !== "tenant_demo" || existing.code !== "DEMO") return;
    const next: TenantState = {
      ...existing,
      menu: demoMenu(),
      stock: demoStock(),
    };
    fs.writeFileSync(demoPath, JSON.stringify(next, null, 2));
  } catch {
    fs.writeFileSync(demoPath, JSON.stringify(demoTenant(), null, 2));
  }
}

function patchPlatform(platform: PlatformState) {
  let dirty = false;
  const starter = platform.plans?.find((p) => p.id === "starter");
  if (!starter || starter.pricePkr !== 999) {
    platform.plans = launchPlans();
    dirty = true;
  }
  const wa = String(platform.contactWhatsapp || "").replace(/\s/g, "");
  if (!wa || OLD_PLATFORM_WHATSAPP.includes(wa)) {
    platform.contactWhatsapp = PLATFORM_CONTACT_WHATSAPP;
    dirty = true;
  }
  if (dirty) {
    fs.writeFileSync(PLATFORM_PATH, JSON.stringify(platform, null, 2));
  }
}

let bootstrapped = false;

export function ensureBootstrap() {
  fs.mkdirSync(path.join(DATA_ROOT, "tenants"), { recursive: true });
  let version = 0;
  if (fs.existsSync(VERSION_PATH)) {
    try {
      version = (JSON.parse(fs.readFileSync(VERSION_PATH, "utf8")) as { v: number }).v || 0;
    } catch {
      version = 0;
    }
  }

  if (!fs.existsSync(PLATFORM_PATH)) {
    fs.writeFileSync(PLATFORM_PATH, JSON.stringify(defaultPlatform(), null, 2));
    refreshDemoCatalogOnly();
    fs.writeFileSync(VERSION_PATH, JSON.stringify({ v: DATA_VERSION }, null, 2));
  } else if (version < DATA_VERSION) {
    /* DEMO menu/stock only — keep orders, users, branding, and every other tenant. */
    refreshDemoCatalogOnly();
    const platform = JSON.parse(fs.readFileSync(PLATFORM_PATH, "utf8")) as PlatformState;
    patchPlatform(platform);
    fs.writeFileSync(VERSION_PATH, JSON.stringify({ v: DATA_VERSION }, null, 2));
  } else {
    const platform = JSON.parse(fs.readFileSync(PLATFORM_PATH, "utf8")) as PlatformState;
    patchPlatform(platform);
  }
  bootstrapped = true;
}

export function createEmptyTenant(input: {
  id: string;
  code: string;
  name: string;
  adminUsername: string;
  adminPassword: string;
}): TenantState {
  // Isolated kitchen: empty catalog, not DEMO menu/logo/stock. Admin belongs to this id only.
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
  fs.mkdirSync(path.join(DATA_ROOT, "tenants", input.id), { recursive: true });
  fs.writeFileSync(
    path.join(DATA_ROOT, "tenants", input.id, "tenant.json"),
    JSON.stringify(state, null, 2),
  );
  return state;
}
