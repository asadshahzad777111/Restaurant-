import fs from "fs";
import path from "path";
import type { PlatformState } from "./types";
import type { TenantState } from "./tenant-types";
import type { Permission } from "./types";

const DATA_ROOT = path.join(process.cwd(), ".data");
const PLATFORM_PATH = path.join(DATA_ROOT, "platform.json");
const DATA_VERSION = 3;
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
    menu: [
      {
        id: "m1",
        name: "Classic Beef Burger",
        description: "Angus beef · cheddar · house sauce",
        price: 650,
        category: "Burgers",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
        modifiers: [
          {
            id: "mg_size",
            name: "Size",
            required: true,
            multi: false,
            options: [
              { id: "reg", name: "Regular", priceDelta: 0 },
              { id: "large", name: "Large", priceDelta: 120 },
            ],
          },
          {
            id: "mg_spice",
            name: "Spice",
            required: false,
            multi: false,
            options: [
              { id: "mild", name: "Mild", priceDelta: 0 },
              { id: "spicy", name: "Spicy", priceDelta: 0 },
            ],
          },
          {
            id: "mg_add",
            name: "Add-ons",
            required: false,
            multi: true,
            options: [
              { id: "cheese", name: "Extra cheese", priceDelta: 80 },
              { id: "egg", name: "Fried egg", priceDelta: 60 },
            ],
          },
        ],
      },
      {
        id: "m2",
        name: "Chicken Zinger",
        description: "Crispy fillet · spicy mayo",
        price: 580,
        category: "Burgers",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m3",
        name: "Cheese Smash",
        description: "Double smash · american cheese",
        price: 720,
        category: "Burgers",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m4",
        name: "Pepperoni Pizza",
        description: "12\" · mozzarella · oregano",
        price: 1290,
        category: "Pizza",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m5",
        name: "Margherita",
        description: "Fresh basil · tomato · mozzarella",
        price: 990,
        category: "Pizza",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m6",
        name: "Fresh Lime",
        description: "Sweet / salty",
        price: 180,
        category: "Drinks",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m7",
        name: "Chocolate Brownie",
        description: "Warm · vanilla scoop",
        price: 350,
        category: "Desserts",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
      },
      {
        id: "m8",
        name: "Family Feast",
        description: "2 burgers + pizza + 4 drinks",
        price: 3490,
        category: "Deals",
        available: true,
        isDeal: true,
        dealLabel: "Save 18%",
        compareAtPrice: 4250,
        imageUrl:
          "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80",
      },
    ],
    stock: [
      { id: "s1", name: "Beef patties", unit: "pcs", quantity: 48, lowThreshold: 12 },
      { id: "s2", name: "Burger buns", unit: "pcs", quantity: 60, lowThreshold: 15 },
      { id: "s3", name: "Mozzarella", unit: "kg", quantity: 8, lowThreshold: 2 },
      { id: "s4", name: "Soft drink cans", unit: "pcs", quantity: 2, lowThreshold: 12 },
    ],
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
    contactWhatsapp: "+923001234567",
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
  const needsSeed = !fs.existsSync(PLATFORM_PATH) || version < DATA_VERSION;
  if (needsSeed) {
    const platform = defaultPlatform();
    fs.writeFileSync(PLATFORM_PATH, JSON.stringify(platform, null, 2));
    const demoPath = path.join(DATA_ROOT, "tenants", "tenant_demo", "tenant.json");
    fs.mkdirSync(path.dirname(demoPath), { recursive: true });
    fs.writeFileSync(demoPath, JSON.stringify(demoTenant(), null, 2));
    fs.writeFileSync(VERSION_PATH, JSON.stringify({ v: DATA_VERSION }, null, 2));
  } else if (fs.existsSync(PLATFORM_PATH)) {
    const platform = JSON.parse(fs.readFileSync(PLATFORM_PATH, "utf8")) as PlatformState;
    const starter = platform.plans?.find((p) => p.id === "starter");
    if (starter && starter.pricePkr >= 2500) {
      platform.plans = launchPlans();
      fs.writeFileSync(PLATFORM_PATH, JSON.stringify(platform, null, 2));
    }
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
        mustChangePassword: true,
      },
    ],
    orders: [],
    reviews: [],
    tables: base.tables.map((tb) => ({ ...tb, status: "empty" as const, currentOrderId: undefined })),
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
