import fs from "fs";
import path from "path";
import type { PlatformState, Session, Lead, PlatformTenantMeta, PlanId, TenantStatus } from "./types";
import { ensureBootstrap } from "./bootstrap";

const DATA_ROOT = path.join(process.cwd(), ".data");
const PLATFORM_PATH = path.join(DATA_ROOT, "platform.json");

function readPlatform(): PlatformState {
  ensureBootstrap();
  const raw = fs.readFileSync(PLATFORM_PATH, "utf8");
  return JSON.parse(raw) as PlatformState;
}

function writePlatform(state: PlatformState) {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.writeFileSync(PLATFORM_PATH, JSON.stringify(state, null, 2));
}

export function getPlatform(): PlatformState {
  return readPlatform();
}

export function listPlans() {
  return getPlatform().plans;
}

export function listTenantsMeta(): PlatformTenantMeta[] {
  return getPlatform().tenants;
}

export function findTenantMetaByCode(code: string) {
  return getPlatform().tenants.find((t) => t.code.toUpperCase() === code.toUpperCase());
}

export function findTenantMetaById(id: string) {
  return getPlatform().tenants.find((t) => t.id === id);
}

export function createTenantMeta(input: {
  id: string;
  code: string;
  name: string;
  planId: PlanId;
}): PlatformTenantMeta {
  const platform = readPlatform();
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
  writePlatform(platform);
  return meta;
}

export function updateTenantMeta(
  id: string,
  patch: Partial<Pick<PlatformTenantMeta, "name" | "planId" | "status" | "renewsAt">>,
) {
  const platform = readPlatform();
  const idx = platform.tenants.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Tenant not found");
  platform.tenants[idx] = { ...platform.tenants[idx], ...patch };
  writePlatform(platform);
  return platform.tenants[idx];
}

export function setTenantStatus(id: string, status: TenantStatus) {
  return updateTenantMeta(id, { status });
}

export function addSession(session: Session) {
  const platform = readPlatform();
  platform.sessions.push(session);
  writePlatform(platform);
  return session;
}

export function findSession(token: string): Session | undefined {
  return getPlatform().sessions.find((s) => s.token === token);
}

export function deleteSession(token: string) {
  const platform = readPlatform();
  platform.sessions = platform.sessions.filter((s) => s.token !== token);
  writePlatform(platform);
}

export function verifySuper(username: string, password: string) {
  const { superAdmin } = getPlatform();
  return superAdmin.username === username && superAdmin.password === password;
}

export function addLead(lead: Omit<Lead, "id" | "createdAt"> & { id?: string }) {
  const platform = readPlatform();
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
  writePlatform(platform);
  return full;
}

export function listLeads() {
  return getPlatform().leads;
}

export function getContactWhatsapp() {
  return getPlatform().contactWhatsapp;
}
