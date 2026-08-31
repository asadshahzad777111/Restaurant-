/**
 * Unified data access: Mongo on Vercel (MONGODB_URI set), file `.data/` on localhost.
 * Tenant isolation: each restaurant is its own tenant document / folder.
 */
import { useMongo } from "../env";
import { ensureBootstrap, createEmptyTenant } from "../bootstrap";
import * as filePlatform from "../platform-store";
import * as fileTenant from "../tenant-store";
import * as fileArchive from "./file-archive";
import * as mongoPlatform from "./mongo-platform";
import * as mongoTenant from "./mongo-tenant";
import * as mongoArchive from "./mongo-archive";
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
import type { Rider } from "../rider-types";
import type { DispatchOffer } from "../rider-types";
import type { Promo, PromoUsage } from "../promo";

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
  planId?: string;
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
  const created = useMongo()
    ? await mongoTenant.addOrderMongo(tenantId, order)
    : fileTenant.addOrder(tenantId, order);
  // Lazy auto-archive: after each new order, at most once per tenant per hour,
  // move terminal orders past the retention window out of the tenant doc.
  void maybeAutoArchive(tenantId);
  return created;
}

// ---- Auto-archive (16MB BSON protection) ----

const lastAutoArchive = new Map<string, number>();
const AUTO_ARCHIVE_MIN_MS = 60 * 60 * 1000; // once per hour per tenant

async function maybeAutoArchive(tenantId: string) {
  const now = Date.now();
  const last = lastAutoArchive.get(tenantId) ?? 0;
  if (now - last < AUTO_ARCHIVE_MIN_MS) return;
  lastAutoArchive.set(tenantId, now);
  try {
    const t = await readTenant(tenantId);
    if (t.shop?.archiveOrders === false) return;
    const days = t.shop?.archiveRetentionDays ?? 90;
    await archiveOldOrders(tenantId, days);
  } catch {
    // Archiving is best-effort; a failure must never break an order.
  }
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

/* ---- Order archiving (16MB BSON protection) ---- */

export {
  DEFAULT_RETENTION_DAYS,
  type ArchivedOrder,
  type ArchiveResult,
} from "./mongo-archive";

export async function archiveOldOrders(
  tenantId: string,
  retentionDays?: number,
): Promise<mongoArchive.ArchiveResult> {
  await ensureStore();
  return useMongo()
    ? mongoArchive.archiveOldOrdersMongo(tenantId, retentionDays)
    : fileArchive.archiveOldOrdersFile(tenantId, retentionDays);
}

export async function queryArchivedOrders(
  tenantId: string,
  opts: { from?: string; to?: string; limit?: number; offset?: number } = {},
): Promise<mongoArchive.ArchivedOrder[]> {
  await ensureStore();
  return useMongo()
    ? mongoArchive.queryArchivedOrdersMongo(tenantId, opts)
    : fileArchive.queryArchivedOrdersFile(tenantId, opts);
}

export async function countArchivedOrders(tenantId: string): Promise<number> {
  await ensureStore();
  return useMongo()
    ? mongoArchive.countArchivedOrdersMongo(tenantId)
    : fileArchive.countArchivedOrdersFile(tenantId);
}

// ---- Riders (Phase 2 delivery) ----

export async function listRiders(tenantId: string): Promise<Rider[]> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.listRidersMongo(tenantId)
    : fileTenant.listRiders(tenantId);
}

export async function upsertRider(tenantId: string, rider: Rider): Promise<Rider> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.upsertRiderMongo(tenantId, rider)
    : fileTenant.upsertRider(tenantId, rider);
}

export async function updateRiderPresence(
  tenantId: string,
  riderId: string,
  input: { online?: boolean; lat?: number; lng?: number },
): Promise<Rider | null> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.updateRiderPresenceMongo(tenantId, riderId, input)
    : fileTenant.updateRiderPresence(tenantId, riderId, input);
}

export async function setRiderActiveOrder(
  tenantId: string,
  riderId: string,
  activeOrderId: string | undefined,
): Promise<Rider | null> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.setRiderActiveOrderMongo(tenantId, riderId, activeOrderId)
    : fileTenant.setRiderActiveOrder(tenantId, riderId, activeOrderId);
}

export async function listDispatchOffers(tenantId: string): Promise<DispatchOffer[]> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.listDispatchOffersMongo(tenantId)
    : fileTenant.listDispatchOffers(tenantId);
}

export async function upsertDispatchOffer(
  tenantId: string,
  offer: DispatchOffer,
): Promise<DispatchOffer> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.upsertDispatchOfferMongo(tenantId, offer)
    : fileTenant.upsertDispatchOffer(tenantId, offer);
}

export async function decideDispatchOffer(
  tenantId: string,
  offerId: string,
  status: "accepted" | "declined" | "expired",
): Promise<DispatchOffer | null> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.decideDispatchOfferMongo(tenantId, offerId, status)
    : fileTenant.decideDispatchOffer(tenantId, offerId, status);
}

// ---- Promos (Phase 3) ----

export async function listPromos(tenantId: string): Promise<Promo[]> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.listPromosMongo(tenantId)
    : fileTenant.listPromos(tenantId);
}

export async function upsertPromo(tenantId: string, promo: Promo): Promise<Promo> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.upsertPromoMongo(tenantId, promo)
    : fileTenant.upsertPromo(tenantId, promo);
}

export async function deletePromo(tenantId: string, promoId: string): Promise<boolean> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.deletePromoMongo(tenantId, promoId)
    : fileTenant.deletePromo(tenantId, promoId);
}

export async function listPromoUsage(tenantId: string): Promise<PromoUsage[]> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.listPromoUsageMongo(tenantId)
    : fileTenant.listPromoUsage(tenantId);
}

export async function recordPromoUsage(
  tenantId: string,
  usage: PromoUsage,
): Promise<PromoUsage> {
  await ensureStore();
  return useMongo()
    ? mongoTenant.recordPromoUsageMongo(tenantId, usage)
    : fileTenant.recordPromoUsage(tenantId, usage);
}

export { useMongo, storageMode } from "../env";
