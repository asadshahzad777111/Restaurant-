import fs from "fs";
import path from "path";
import type { PlatformState } from "./types";
import type { TenantState } from "./tenant-types";
import type { Permission } from "./types";

const DATA_ROOT = path.join(process.cwd(), ".data");
const PLATFORM_PATH = path.join(DATA_ROOT, "platform.json");
const DATA_VERSION = 2;
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
        name: "Classic Beef Burger",
        description: "Angus beef · cheddar · house sauce",
        price: 650,
        category: "Burgers",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
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
    nextOrderNumber: 1001,
  };
}

function defaultPlatform(): PlatformState {
  return {
    superAdmin: { username: "super", password: "super123" },
    contactWhatsapp: "+923001234567",
    plans: [
      {
        id: "starter",
        name: "Starter",
        pricePkr: 2500,
        maxStaff: 5,
        description: "One branch · QR ordering · kitchen display",
        features: ["Guest QR + pickup", "POS & kitchen", "Basic stock", "Up to 5 staff"],
      },
      {
        id: "pro",
        name: "Pro",
        pricePkr: 6000,
        maxStaff: 20,
        description: "Multi-shift teams · deals · reviews",
        features: [
          "Everything in Starter",
          "Deals & reviews",
          "Staff roles",
          "Up to 20 staff",
          "Receipt branding",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        pricePkr: 15000,
        maxStaff: 100,
        description: "Groups · dedicated support · custom printers",
        features: [
          "Everything in Pro",
          "Multi-outlet roadmap",
          "Priority support",
          "Printer package",
          "Up to 100 staff",
        ],
      },
    ],
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
    fs.writeFileSync(PLATFORM_PATH, JSON.stringify(defaultPlatform(), null, 2));
    const demoPath = path.join(DATA_ROOT, "tenants", "tenant_demo", "tenant.json");
    fs.mkdirSync(path.dirname(demoPath), { recursive: true });
    fs.writeFileSync(demoPath, JSON.stringify(demoTenant(), null, 2));
    fs.writeFileSync(VERSION_PATH, JSON.stringify({ v: DATA_VERSION }, null, 2));
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
