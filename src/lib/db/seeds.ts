import type { PlatformState } from "../types";
import type { Permission } from "../types";
import type { TenantState } from "../tenant-types";
import { CANONICAL_PLANS } from "../plans";
import { PLATFORM_CONTACT_WHATSAPP } from "../contact";
import { demoMenu, demoStock } from "../demo-catalog";

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
    contactWhatsapp: process.env.CONTACT_WHATSAPP?.trim() || PLATFORM_CONTACT_WHATSAPP,
    plans: CANONICAL_PLANS.map((p) => ({ ...p })),
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
    menu: demoMenu(),
    stock: demoStock(),
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
  if (t.menu[0]) {
    t.menu[0] = {
      ...t.menu[0],
      name: "ISO2 Special Burger",
      price: 700,
    };
  }
  return t;
}
