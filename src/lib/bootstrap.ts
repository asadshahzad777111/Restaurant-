import fs from "fs";
import path from "path";
import type { PlatformState } from "./types";
import type { TenantState } from "./tenant-types";
import type { Permission } from "./types";

const DATA_ROOT = path.join(process.cwd(), ".data");
const PLATFORM_PATH = path.join(DATA_ROOT, "platform.json");

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
      name: "Demo Kitchen",
      logoUrl: "",
      receiptFooter: "Thank you for dining with Demo Kitchen",
    },
    shop: {
      address: "12 MM Alam Road, Lahore",
      phone: "+92 300 0000000",
      whatsapp: "+923000000000",
      currency: "PKR",
      taxRate: 0,
      openHours: "11:00 – 23:00",
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
    menu: [
      {
        id: "m1",
        name: "Chicken Karahi",
        description: "Half · bone-in · spicy",
        price: 1450,
        category: "Mains",
        available: true,
        imageEmoji: "🍛",
      },
      {
        id: "m2",
        name: "Beef Biryani",
        description: "Dum cooked · raita",
        price: 890,
        category: "Mains",
        available: true,
        imageEmoji: "🍚",
      },
      {
        id: "m3",
        name: "Chapli Kebab",
        description: "2 pcs · mint chutney",
        price: 650,
        category: "Starters",
        available: true,
        imageEmoji: "🥙",
      },
      {
        id: "m4",
        name: "Fresh Lime",
        description: "Sweet / salty",
        price: 180,
        category: "Drinks",
        available: true,
        imageEmoji: "🍋",
      },
      {
        id: "m5",
        name: "Family Feast",
        description: "Karahi + biryani + 4 drinks",
        price: 3990,
        category: "Deals",
        available: true,
        isDeal: true,
        dealLabel: "Save 18%",
        compareAtPrice: 4850,
        imageEmoji: "🔥",
      },
      {
        id: "m6",
        name: "Lunch Express",
        description: "Biryani + drink",
        price: 990,
        category: "Deals",
        available: true,
        isDeal: true,
        dealLabel: "Weekday",
        compareAtPrice: 1070,
        imageEmoji: "⚡",
      },
    ],
    stock: [
      { id: "s1", name: "Chicken", unit: "kg", quantity: 18, lowThreshold: 5 },
      { id: "s2", name: "Basmati rice", unit: "kg", quantity: 40, lowThreshold: 10 },
      { id: "s3", name: "Cooking oil", unit: "L", quantity: 8, lowThreshold: 3 },
      { id: "s4", name: "Soft drink cans", unit: "pcs", quantity: 2, lowThreshold: 12 },
    ],
    orders: [],
    reviews: [],
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
    contactWhatsapp: "+923001234567",
    plans: launchPlans(),
    tenants: [
      {
        id: "tenant_demo",
        code: "DEMO",
        name: "Demo Kitchen",
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

let bootstrapped = false;

export function ensureBootstrap() {
  if (bootstrapped && fs.existsSync(PLATFORM_PATH)) return;
  fs.mkdirSync(path.join(DATA_ROOT, "tenants"), { recursive: true });
  if (!fs.existsSync(PLATFORM_PATH)) {
    fs.writeFileSync(PLATFORM_PATH, JSON.stringify(defaultPlatform(), null, 2));
  } else {
    const platform = JSON.parse(fs.readFileSync(PLATFORM_PATH, "utf8")) as PlatformState;
    const starter = platform.plans?.find((p) => p.id === "starter");
    if (starter && starter.pricePkr >= 4999) {
      platform.plans = launchPlans();
      fs.writeFileSync(PLATFORM_PATH, JSON.stringify(platform, null, 2));
    }
  }
  const demoPath = path.join(DATA_ROOT, "tenants", "tenant_demo", "tenant.json");
  if (!fs.existsSync(demoPath)) {
    fs.mkdirSync(path.dirname(demoPath), { recursive: true });
    fs.writeFileSync(demoPath, JSON.stringify(demoTenant(), null, 2));
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
  const base = demoTenant();
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
        permissions: ALL_PERMS,
        active: true,
      },
    ],
    orders: [],
    reviews: [],
    nextOrderNumber: 1001,
  };
  fs.mkdirSync(path.join(DATA_ROOT, "tenants", input.id), { recursive: true });
  fs.writeFileSync(
    path.join(DATA_ROOT, "tenants", input.id, "tenant.json"),
    JSON.stringify(state, null, 2),
  );
  return state;
}
