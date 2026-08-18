import type { PlatformState, Session, Lead, PlatformTenantMeta, PlanId, TenantStatus } from "../types";
import { getDb } from "../mongo";
import { demoSeedEnabled } from "../env";
import { defaultPlatformSeed, demoTenantSeed, secondTenantSeed } from "./seeds";

const PLATFORM_ID = "platform";

async function col(name: string) {
  return (await getDb()).collection(name);
}

export async function ensureMongoBootstrap() {
  const pcol = await col("platform");
  const existing = await pcol.findOne({ _id: PLATFORM_ID } as never);
  if (!existing) {
    const platform = defaultPlatformSeed();
    if (contactFromEnv()) platform.contactWhatsapp = contactFromEnv();
    await pcol.insertOne({ _id: PLATFORM_ID, ...platform } as never);
  } else if (contactFromEnv() && !(existing as unknown as PlatformState).contactWhatsapp) {
    await pcol.updateOne(
      { _id: PLATFORM_ID } as never,
      { $set: { contactWhatsapp: contactFromEnv() } },
    );
  }

  if (!demoSeedEnabled()) return;

  const tcol = await col("tenants");
  const demo = await tcol.findOne({ _id: "tenant_demo" } as never);
  if (!demo) {
    const d = demoTenantSeed();
    await tcol.insertOne({ _id: d.id, ...d } as never);
  }
  const second = await tcol.findOne({ _id: "tenant_iso2" } as never);
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

function contactFromEnv() {
  return process.env.CONTACT_WHATSAPP?.trim() || "";
}

export async function getPlatformMongo(): Promise<PlatformState> {
  await ensureMongoBootstrap();
  const doc = await (await col("platform")).findOne({ _id: PLATFORM_ID } as never);
  if (!doc) throw new Error("Platform missing");
  const { _id: _omit, ...rest } = doc as unknown as PlatformState & { _id: string };
  return rest;
}

async function savePlatformMongo(state: PlatformState) {
  await (await col("platform")).replaceOne(
    { _id: PLATFORM_ID } as never,
    { _id: PLATFORM_ID, ...state } as never,
    { upsert: true },
  );
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
}): Promise<PlatformTenantMeta> {
  const platform = await getPlatformMongo();
  if (platform.tenants.some((t) => t.code.toUpperCase() === input.code.toUpperCase())) {
    throw new Error("Restaurant code already exists");
  }
  const meta: PlatformTenantMeta = {
    id: input.id,
    code: input.code.toUpperCase(),
    name: input.name,
    planId: input.planId,
    status: "active",
    renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  platform.tenants.push(meta);
  await savePlatformMongo(platform);
  return meta;
}

export async function updateTenantMetaMongo(
  id: string,
  patch: Partial<Pick<PlatformTenantMeta, "name" | "planId" | "status" | "renewsAt">>,
) {
  const platform = await getPlatformMongo();
  const idx = platform.tenants.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tenant not found");
  platform.tenants[idx] = { ...platform.tenants[idx], ...patch };
  await savePlatformMongo(platform);
  return platform.tenants[idx];
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
