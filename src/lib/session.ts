import { NextRequest } from "next/server";
import {
  findSession,
  verifySuper,
  addSession,
  deleteSession,
  findTenantMetaByCode,
  findUser,
  findUserByEmail,
  readTenant,
} from "@/lib/db";
import type { Permission, Session, SessionRole } from "./types";
import type { TenantUser } from "./tenant-types";

/**
 * Bearer token cookie name (legacy). Live auth is Authorization: Bearer from localStorage.
 * Super and restaurant Admin MUST NOT share a session: Super has no tenantId;
 * Admin/staff always have tenantId. Impersonation is a *second* tenant_admin session
 * with impersonating:true — it is never created on HQ page load, plan edit, or messages.
 */
export const TOKEN_COOKIE = "restaurant_pos_token_v2";

export function newToken() {
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

export async function requireSession(req: NextRequest): Promise<Session> {
  const token = getBearerToken(req);
  if (!token) throw new AuthError("Unauthorized", 401);
  const session = await findSession(token);
  if (!session) throw new AuthError("Invalid session", 401);
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Platform owner only. No tenantId — Super is not a restaurant Admin. */
export async function loginSuper(username: string, password: string): Promise<Session> {
  if (!(await verifySuper(username, password))) throw new AuthError("Invalid credentials", 401);
  return addSession({
    token: newToken(),
    role: "super",
    createdAt: new Date().toISOString(),
  });
}

/** Restaurant staff/admin. Bound to one tenantId from that kitchen's code — never Super. */
export async function loginTenant(
  code: string,
  username: string,
  password: string,
): Promise<Session> {
  const meta = await findTenantMetaByCode(code);
  if (!meta) throw new AuthError("Restaurant code not found", 404);
  if (meta.status === "suspended") throw new AuthError("Restaurant is suspended", 403);
  const user = await findUser(meta.id, username);
  if (!user) throw new AuthError("Invalid credentials", 401);
  const { verifyPassword, ensureHashed } = await import("./password");
  const { updateUsers } = await import("./db");
  const check = await verifyPassword(password, user.password);
  if (!check.ok) throw new AuthError("Invalid credentials", 401);
  if (check.needsRehash) {
    const fresh = await readTenant(meta.id);
    const next = await Promise.all(
      fresh.users.map(async (u) =>
        u.id === user.id ? { ...u, password: await ensureHashed(password) } : u,
      ),
    );
    await updateUsers(meta.id, next);
  }
  const role: SessionRole = user.role === "admin" ? "tenant_admin" : "staff";
  return addSession({
    token: newToken(),
    role,
    tenantId: meta.id,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
}

/** Staff/Admin Google login — email must already be set on that kitchen user. */
export async function loginTenantByEmail(code: string, email: string): Promise<Session> {
  const meta = await findTenantMetaByCode(code);
  if (!meta) throw new AuthError("Restaurant code not found", 404);
  if (meta.status === "suspended") throw new AuthError("Restaurant is suspended", 403);
  const user = await findUserByEmail(meta.id, email);
  if (!user) {
    throw new AuthError(
      "No staff account with this Gmail on that restaurant. Super/Admin must add the email first.",
      404,
    );
  }
  const role: SessionRole = user.role === "admin" ? "tenant_admin" : "staff";
  return addSession({
    token: newToken(),
    role,
    tenantId: meta.id,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Explicit Help this restaurant only. Keeps the Super session intact (caller saves it).
 * Never call this from HQ Home / plans / messages / settings load.
 */
export async function impersonateTenant(
  superSession: Session,
  tenantId: string,
): Promise<Session> {
  if (superSession.role !== "super") throw new AuthError("Forbidden", 403);
  if (superSession.impersonating) throw new AuthError("Already in help mode", 403);
  const tenant = await readTenant(tenantId);
  const admin = tenant.users.find((u) => u.role === "admin");
  if (!admin) throw new AuthError("No admin user", 400);
  return addSession({
    token: newToken(),
    role: "tenant_admin",
    tenantId,
    userId: admin.id,
    impersonating: true,
    createdAt: new Date().toISOString(),
  });
}

export async function logout(token: string) {
  await deleteSession(token);
}

export async function getSessionUser(session: Session): Promise<TenantUser | null> {
  if (!session.tenantId || !session.userId) return null;
  const tenant = await readTenant(session.tenantId);
  return tenant.users.find((u) => u.id === session.userId) ?? null;
}

export function publicUser(user: TenantUser | null) {
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
}

export async function hasPermission(session: Session, perm: Permission): Promise<boolean> {
  // Super is the platform owner. Do not use this to let Super act as a kitchen Admin —
  // tenant routes must go through requireTenantSession, which rejects role=super.
  if (session.role === "super") return true;
  if (session.role === "tenant_admin") return true;
  const user = await getSessionUser(session);
  return !!user?.permissions.includes(perm);
}

export async function hasAnyPermission(session: Session, perms: Permission[]): Promise<boolean> {
  if (session.role === "super" || session.role === "tenant_admin") return true;
  const user = await getSessionUser(session);
  if (!user) return false;
  return perms.some((p) => user.permissions.includes(p));
}

/** Explicit role gate — never log credentials. */
export async function requireRole(session: Session, roles: SessionRole[]) {
  if (!roles.includes(session.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

/** One restaurant only. Super (no tenantId) cannot pass — that is how HQ stays HQ. */
export async function requireTenantSession(req: NextRequest): Promise<Session> {
  const session = await requireSession(req);
  if (!session.tenantId || (session.role !== "tenant_admin" && session.role !== "staff")) {
    throw new AuthError("Tenant session required", 403);
  }
  return session;
}

/** Platform owner. Impersonating help sessions are tenant_admin and must fail here. */
export async function requireSuper(req: NextRequest): Promise<Session> {
  const session = await requireSession(req);
  if (session.role !== "super" || session.impersonating) {
    throw new AuthError("Super admin required", 403);
  }
  return session;
}
