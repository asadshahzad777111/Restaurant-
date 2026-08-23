/**
 * Unified data access: Mongo on Vercel (MONGODB_URI set), file `.data/` on localhost.
 * Tenant isolation: each restaurant is its own tenant document / folder.
 */
import { useMongo } from "../env";
import { ensureBootstrap, createEmptyTenant } from "../bootstrap";
import * as filePlatform from "../platform-store";
import * as fileTenant from "../tenant-store";
import * as mongoPlatform from "./mongo-platform";
import * as mongoTenant from "./mongo-tenant";
import type { PlatformState, Session, Lead, PlatformTenantMeta, PlanId, TenantStatus } from "../types";
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

export async function ensureStore() {
  if (useMongo()) await mongoPlatform.ensureMongoBootstrap();
  else ensureBootstrap();
}

export async function getPlatform(): Promise<PlatformState> {
  await ensureStore();
  return useMongo() ? mongoPlatform.getPlatformMongo() : filePlatform.getPlatform();
}

export async function listPlans() {
  await ensureStore();
  return useMongo() ? mongoPlatform.listPlansMongo() : filePlatform.listPlans();
}

export async function listTenantsMeta() {
  await ensureStore();
  return useMongo() ? mongoPlatform.listTenantsMetaMongo() : filePlatform.listTenantsMeta();
}

export async function findTenantMetaByCode(code: string) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.findTenantMetaByCodeMongo(code)
    : filePlatform.findTenantMetaByCode(code);
}

export async function findTenantMetaById(id: string) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.findTenantMetaByIdMongo(id)
    : filePlatform.findTenantMetaById(id);
}

export async function createTenantMeta(input: {
  id: string;
  code: string;
  name: string;
  planId: PlanId;
  adminEmail?: string;
}): Promise<PlatformTenantMeta> {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.createTenantMetaMongo(input)
    : filePlatform.createTenantMeta(input);
}

export async function updateTenantMeta(
  id: string,
  patch: Partial<
    Pick<PlatformTenantMeta, "name" | "planId" | "status" | "renewsAt" | "adminEmail" | "billingNote">
  >,
) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.updateTenantMetaMongo(id, patch)
    : filePlatform.updateTenantMeta(id, patch);
}

export async function getPlatformFeatures() {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.getPlatformFeaturesMongo()
    : filePlatform.getPlatformFeatures();
}

export async function setPlatformFeatures(features: { fbrOptional: boolean }) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.setPlatformFeaturesMongo(features)
    : filePlatform.setPlatformFeatures(features);
}

export async function setTenantStatus(id: string, status: TenantStatus) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.setTenantStatusMongo(id, status)
    : filePlatform.setTenantStatus(id, status);
}

export async function addSession(session: Session) {
  await ensureStore();
  return useMongo() ? mongoPlatform.addSessionMongo(session) : filePlatform.addSession(session);
}

export async function findSession(token: string) {
  await ensureStore();
  return useMongo() ? mongoPlatform.findSessionMongo(token) : filePlatform.findSession(token);
}

export async function deleteSession(token: string) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.deleteSessionMongo(token)
    : filePlatform.deleteSession(token);
}

export async function verifySuper(username: string, password: string) {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.verifySuperMongo(username, password)
    : filePlatform.verifySuperSecure(username, password);
}

export async function addLead(lead: Omit<Lead, "id" | "createdAt"> & { id?: string }) {
  await ensureStore();
  return useMongo() ? mongoPlatform.addLeadMongo(lead) : filePlatform.addLead(lead);
}

export async function listLeads() {
  await ensureStore();
  return useMongo() ? mongoPlatform.listLeadsMongo() : filePlatform.listLeads();
}

export async function getContactWhatsapp() {
  await ensureStore();
  return useMongo()
    ? mongoPlatform.getContactWhatsappMongo()
    : filePlatform.getContactWhatsapp();
}

export async function readTenant(tenantId: string): Promise<TenantState> {
  await ensureStore();
  return useMongo() ? mongoTenant.readTenantMongo(tenantId) : fileTenant.readTenant(tenantId);
}

export async function readTenantSafe(tenantId: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.readTenantSafeMongo(tenantId)
    : fileTenant.readTenantSafe(tenantId);
}

/** Staff SPA payload — same tenant only, no review dump, recent tickets. */
export async function readTenantStaffView(tenantId: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.readTenantStaffViewMongo(tenantId)
    : fileTenant.readTenantStaffView(tenantId);
}

export async function createEmptyTenantState(input: {
  id: string;
  code: string;
  name: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail?: string;
  adminKnownPassword?: string;
}) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.createEmptyTenantMongo(input)
    : createEmptyTenant(input);
}

export async function getPublicMenu(tenantId: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.getPublicMenuMongo(tenantId)
    : fileTenant.getPublicMenu(tenantId);
}

export async function findUser(tenantId: string, username: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.findUserMongo(tenantId, username)
    : fileTenant.findUser(tenantId, username);
}

export async function findUserByEmail(tenantId: string, email: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.findUserByEmailMongo(tenantId, email)
    : fileTenant.findUserByEmail(tenantId, email);
}

export async function upsertGuestClient(
  tenantId: string,
  input: { email: string; name: string; googleSub?: string },
) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.upsertGuestClientMongo(tenantId, input)
    : fileTenant.upsertGuestClient(tenantId, input);
}

export async function updateMenu(tenantId: string, menu: MenuItem[]) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateMenuMongo(tenantId, menu)
    : fileTenant.updateMenu(tenantId, menu);
}

export async function updateStock(tenantId: string, stock: StockItem[]) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateStockMongo(tenantId, stock)
    : fileTenant.updateStock(tenantId, stock);
}

export async function updateUsers(tenantId: string, users: TenantUser[]) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateUsersMongo(tenantId, users)
    : fileTenant.updateUsers(tenantId, users);
}

export async function updateTables(tenantId: string, tables: DiningTable[]) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateTablesMongo(tenantId, tables)
    : fileTenant.updateTables(tenantId, tables);
}

export { tableToken } from "../tenant-store";
export async function reserveTable(
  tenantId: string,
  tableId: string,
  name: string,
  minutes: number,
  token: string,
) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.reserveTableMongo(tenantId, tableId, name, minutes, token)
    : fileTenant.reserveTable(tenantId, tableId, name, minutes, token);
}

export async function claimTable(tenantId: string, tableId: string, token: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.claimTableMongo(tenantId, tableId, token)
    : fileTenant.claimTable(tenantId, tableId, token);
}

export async function releaseTable(tenantId: string, tableId: string, token?: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.releaseTableMongo(tenantId, tableId, token)
    : fileTenant.releaseTable(tenantId, tableId, token);
}

export async function updateBranding(
  tenantId: string,
  branding: Partial<TenantState["branding"]>,
  shop?: Partial<TenantState["shop"]>,
) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateBrandingMongo(tenantId, branding, shop)
    : fileTenant.updateBranding(tenantId, branding, shop);
}

export async function updateGuestCommerce(
  tenantId: string,
  input: {
    payments?: import("../tenant-types").TenantPayments;
    specialOffer?: import("../tenant-types").TenantSpecialOffer;
  },
) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateGuestCommerceMongo(tenantId, input)
    : fileTenant.updateGuestCommerce(tenantId, input);
}

export async function updateOrderingPaused(tenantId: string, paused: boolean) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateOrderingPausedMongo(tenantId, paused)
    : fileTenant.updateOrderingPaused(tenantId, paused);
}

export async function addOrder(
  tenantId: string,
  order: Omit<Order, "id" | "number" | "createdAt" | "updatedAt">,
) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.addOrderMongo(tenantId, order)
    : fileTenant.addOrder(tenantId, order);
}

export async function patchOrder(tenantId: string, orderId: string, patch: Partial<Order>) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.patchOrderMongo(tenantId, orderId, patch)
    : fileTenant.patchOrder(tenantId, orderId, patch);
}

export async function addDayClose(tenantId: string, summary: Omit<DayCloseSummary, "id">) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.addDayCloseMongo(tenantId, summary)
    : fileTenant.addDayClose(tenantId, summary);
}

export async function findOrderByTrackToken(token: string) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.findOrderByTrackTokenMongo(token)
    : fileTenant.findOrderByTrackToken(token);
}

export async function addReview(tenantId: string, review: Omit<Review, "id" | "createdAt">) {
  await ensureStore();
  return useMongo()
    ? mongoTenant.addReviewMongo(tenantId, review)
    : fileTenant.addReview(tenantId, review);
}

export { useMongo, storageMode } from "../env";
