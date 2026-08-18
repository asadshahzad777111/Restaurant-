import type { PlatformState } from "../types";
import type { Permission } from "../types";
import type { TenantState } from "../tenant-types";

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

export function defaultPlatformSeed(): PlatformState {
  return {
    superAdmin: { username: "super", password: "super123" },
    contactWhatsapp: process.env.CONTACT_WHATSAPP?.trim() || "+923001234567",
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

function baseTenant(id: string, code: string, name: string): TenantState {
  return {
    id,
    code,
    branding: {
      name,
      logoUrl: "",
      receiptFooter: `Thank you for dining with ${name}`,
    },
    shop: {
      address: "Lahore",
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
        id: `user_admin_${id}`,
        username: "admin",
        password: "admin123",
        role: "admin",
        roleLabel: "Owner",
        permissions: ALL_PERMS,
        active: true,
        mustChangePassword: true,
      },
    ],
    menu: [
      {
        id: "m1",
        name: "Classic Beef Burger",
        description: "Angus beef · cheddar",
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
        ],
      },
      {
        id: "m2",
        name: "Fresh Lime",
        description: "Sweet / salty",
        price: 180,
        category: "Drinks",
        available: true,
        imageUrl:
          "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=600&q=80",
      },
    ],
    stock: [
      { id: "s1", name: "Beef patties", unit: "pcs", quantity: 40, lowThreshold: 10 },
      { id: "s2", name: "Soft drink cans", unit: "pcs", quantity: 2, lowThreshold: 12 },
    ],
    orders: [],
    reviews: [],
    tables: [
      { id: "t1", label: "1", seats: 2, status: "empty" },
      { id: "t2", label: "2", seats: 4, status: "empty" },
      { id: "t3", label: "3", seats: 4, status: "empty" },
    ],
    dayCloses: [],
    nextOrderNumber: 1001,
  };
}

export function demoTenantSeed(): TenantState {
  return baseTenant("tenant_demo", "DEMO", "Demo Restaurant");
}

/** Second isolated restaurant for live multi-tenant proof */
export function secondTenantSeed(): TenantState {
  const t = baseTenant("tenant_iso2", "ISO2", "Iso Kitchen Two");
  t.menu[0] = {
    ...t.menu[0],
    name: "ISO2 Special Burger",
    price: 700,
  };
  return t;
}
