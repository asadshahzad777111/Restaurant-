import type { PlatformState, Session, Lead, PlatformTenantMeta, PlanId, TenantStatus } from "../types";
import { getDb } from "../mongo";
import { demoSeedEnabled } from "../env";
import { PLATFORM_CONTACT_WHATSAPP } from "../contact";
import { defaultPlatformSeed, demoTenantSeed, secondTenantSeed } from "./seeds";

const OLD_PLATFORM_WHATSAPP = ["+923001234567", "+923000000000", "03001234567"];

const PLATFORM_ID = "platform";
const PLATFORM_CACHE_MS = 20_000;

declare global {
  // eslint-disable-next-line no-var
  var __ordoMongoBooted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __ordoMongoBootPromise: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var __ordoPlatformCache: { at: number; data: PlatformState } | undefined;
}

async function col(name: string) {
  return (await getDb()).collection(name);
}

function contactFromEnv() {
  return process.env.CONTACT_WHATSAPP?.trim() || "";
}

function invalidatePlatformCache() {
  global.__ordoPlatformCache = undefined;
}

/**
 * One-time (per warm instance) seed / repair. Must NOT write on every API request —
 * that was the main free-tier lag (Atlas write + round trips on every /api/state).
 */
export async function ensureMongoBootstrap() {
  if (global.__ordoMongoBooted) return;
  if (global.__ordoMongoBootPromise) {
    await global.__ordoMongoBootPromise;
    return;
  }
  global.__ordoMongoBootPromise = (async () => {
    const pcol = await col("platform");
    const tcol = await col("tenants");

    await Promise.all([
      tcol.createIndex({ code: 1 }, { unique: true, sparse: true }).catch(() => undefined),
      tcol.createIndex({ "orders.trackToken": 1 }, { sparse: true }).catch(() => undefined),
    ]);

    const existing = await pcol.findOne({ _id: PLATFORM_ID } as never);
    if (!existing) {
      const platform = defaultPlatformSeed();
      if (contactFromEnv()) platform.contactWhatsapp = contactFromEnv();
      await pcol.insertOne({ _id: PLATFORM_ID, ...platform } as never);
      invalidatePlatformCache();
    } else {
      const seedPlans = defaultPlatformSeed().plans;
      const current = existing as unknown as PlatformState;
      const patch: Record<string, unknown> = {};
      const starter = current.plans?.find((p) => p.id === "starter");
      if (!starter || starter.pricePkr !== seedPlans.find((p) => p.id === "starter")?.pricePkr) {
        patch.plans = seedPlans;
      }
      const currentWa = String(current.contactWhatsapp || "").replace(/\s/g, "");
      if (contactFromEnv()) {
        if (currentWa !== contactFromEnv().replace(/\s/g, "")) {
          patch.contactWhatsapp = contactFromEnv();
        }
      } else if (!currentWa || OLD_PLATFORM_WHATSAPP.includes(currentWa)) {
        patch.contactWhatsapp = PLATFORM_CONTACT_WHATSAPP;
      }
      if (Object.keys(patch).length) {
        await pcol.updateOne({ _id: PLATFORM_ID } as never, { $set: patch });
        invalidatePlatformCache();
      }
    }

    if (demoSeedEnabled()) {
      const demo = await tcol.findOne({ _id: "tenant_demo" } as never, { projection: { _id: 1 } });
      if (!demo) {
        const d = demoTenantSeed();
        await tcol.insertOne({ _id: d.id, ...d } as never);
      }
      /* Existing DEMO/ISO2 kitchens keep Mongo menu, stock, branding — never reset on deploy. */
      const second = await tcol.findOne({ _id: "tenant_iso2" } as never, { projection: { _id: 1 } });
      if (!second) {
        const s = secondTenantSeed();
        await tcol.insertOne({ _id: s.id, ...s } as never);
        const plat = await getPlatformMongo();
        if (!plat.tenants.some((t) => t.id === s.id)) {
          plat.tenants.push({
            id: s.id,
            code: s.code,
            name: s.branding.name,
            planId: "starter",
            status: "active",
            renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          });
          await savePlatformMongo(plat);
        }
      }
    }

    global.__ordoMongoBooted = true;
  })().finally(() => {
    global.__ordoMongoBootPromise = undefined;
  });

  await global.__ordoMongoBootPromise;
}

export async function getPlatformMongo(): Promise<PlatformState> {
  await ensureMongoBootstrap();
  const cached = global.__ordoPlatformCache;
  if (cached && Date.now() - cached.at < PLATFORM_CACHE_MS) {
    return cached.data;
  }
  const doc = await (await col("platform")).findOne({ _id: PLATFORM_ID } as never);
  if (!doc) throw new Error("Platform missing");
  const { _id: _omit, ...rest } = doc as unknown as PlatformState & { _id: string };
  global.__ordoPlatformCache = { at: Date.now(), data: rest };
  return rest;
}

async function savePlatformMongo(state: PlatformState) {
  await (await col("platform")).replaceOne(
    { _id: PLATFORM_ID } as never,
    { _id: PLATFORM_ID, ...state } as never,
    { upsert: true },
  );
  invalidatePlatformCache();
}

export async function listPlansMongo() {
  return (await getPlatformMongo()).plans;
}

export async function listTenantsMetaMongo() {
  return (await getPlatformMongo()).tenants;
}

export async function findTenantMetaByCodeMongo(code: string) {
  return (await getPlatformMongo()).tenants.find(
    (t) => t.code.toUpperCase() === code.toUpperCase(),
  );
}

export async function findTenantMetaByIdMongo(id: string) {
  return (await getPlatformMongo()).tenants.find((t) => t.id === id);
}

export async function createTenantMetaMongo(input: {
  id: string;
  code: string;
  name: string;
  planId: PlanId;
  adminEmail?: string;
}): Promise<PlatformTenantMeta> {
  const platform = await getPlatformMongo();
  if (platform.tenants.some((t) => t.code.toUpperCase() === input.code.toUpperCase())) {
    throw new Error("Restaurant code already exists");
  }
  const adminEmail = input.adminEmail?.trim() || undefined;
  const meta: PlatformTenantMeta = {
    id: input.id,
    code: input.code.toUpperCase(),
    name: input.name,
    planId: input.planId,
    status: "active",
    ...(adminEmail ? { adminEmail } : {}),
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  platform.tenants.push(meta);
  await savePlatformMongo(platform);
  return meta;
}

export async function updateTenantMetaMongo(
  id: string,
  patch: Partial<
    Pick<PlatformTenantMeta, "name" | "planId" | "status" | "renewsAt" | "adminEmail" | "billingNote">
  >,
) {
  const platform = await getPlatformMongo();
  const idx = platform.tenants.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tenant not found");
  platform.tenants[idx] = { ...platform.tenants[idx], ...patch };
  await savePlatformMongo(platform);
  return platform.tenants[idx];
}

export async function getPlatformFeaturesMongo() {
  const platform = await getPlatformMongo();
  return platform.features ?? { fbrOptional: false };
}

export async function setPlatformFeaturesMongo(features: { fbrOptional: boolean }) {
  const platform = await getPlatformMongo();
  platform.features = { fbrOptional: Boolean(features.fbrOptional) };
  await savePlatformMongo(platform);
  return platform.features;
}

export async function setTenantStatusMongo(id: string, status: TenantStatus) {
  return updateTenantMetaMongo(id, { status });
}

export async function addSessionMongo(session: Session) {
  const platform = await getPlatformMongo();
  platform.sessions.push(session);
  await savePlatformMongo(platform);
  return session;
}

export async function findSessionMongo(token: string) {
  return (await getPlatformMongo()).sessions.find((s) => s.token === token);
}

export async function deleteSessionMongo(token: string) {
  const platform = await getPlatformMongo();
  platform.sessions = platform.sessions.filter((s) => s.token !== token);
  await savePlatformMongo(platform);
}

export async function verifySuperMongo(username: string, password: string) {
  const { superAdmin } = await getPlatformMongo();
  return superAdmin.username === username && superAdmin.password === password;
}

export async function addLeadMongo(lead: Omit<Lead, "id" | "createdAt"> & { id?: string }) {
  const platform = await getPlatformMongo();
  const full: Lead = {
    id: lead.id ?? `lead_${Date.now()}`,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    restaurantName: lead.restaurantName,
    planId: lead.planId,
    message: lead.message,
    source: lead.source,
    createdAt: new Date().toISOString(),
  };
  platform.leads.unshift(full);
  await savePlatformMongo(platform);
  return full;
}

export async function listLeadsMongo() {
  return (await getPlatformMongo()).leads;
}

export async function getContactWhatsappMongo() {
  return contactFromEnv() || (await getPlatformMongo()).contactWhatsapp;
}
