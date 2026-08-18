import { NextRequest } from "next/server";
import { findSession, verifySuper, addSession, deleteSession, findTenantMetaByCode } from "./platform-store";
import { findUser, readTenant } from "./tenant-store";
import type { Permission, Session, SessionRole } from "./types";
import type { TenantUser } from "./tenant-types";

export const TOKEN_COOKIE = "restaurant_pos_token_v2";

export function newToken() {
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

export function requireSession(req: NextRequest): Session {
  const token = getBearerToken(req);
  if (!token) throw new AuthError("Unauthorized", 401);
  const session = findSession(token);
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

export function loginSuper(username: string, password: string): Session {
  if (!verifySuper(username, password)) throw new AuthError("Invalid credentials", 401);
  return addSession({
    token: newToken(),
    role: "super",
    createdAt: new Date().toISOString(),
  });
}

export function loginTenant(code: string, username: string, password: string): Session {
  const meta = findTenantMetaByCode(code);
  if (!meta) throw new AuthError("Restaurant code not found", 404);
  if (meta.status === "suspended") throw new AuthError("Restaurant is suspended", 403);
  const user = findUser(meta.id, username);
  if (!user || user.password !== password) throw new AuthError("Invalid credentials", 401);
  const role: SessionRole = user.role === "admin" ? "tenant_admin" : "staff";
  return addSession({
    token: newToken(),
    role,
    tenantId: meta.id,
    userId: user.id,
    createdAt: new Date().toISOString(),
  });
}

export function impersonateTenant(superSession: Session, tenantId: string): Session {
  if (superSession.role !== "super") throw new AuthError("Forbidden", 403);
  const tenant = readTenant(tenantId);
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

export function logout(token: string) {
  deleteSession(token);
}

export function getSessionUser(session: Session): TenantUser | null {
  if (!session.tenantId || !session.userId) return null;
  const tenant = readTenant(session.tenantId);
  return tenant.users.find((u) => u.id === session.userId) ?? null;
}

export function publicUser(user: TenantUser | null) {
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
}

export function hasPermission(session: Session, perm: Permission): boolean {
  if (session.role === "super") return true;
  if (session.role === "tenant_admin") return true;
  const user = getSessionUser(session);
  return !!user?.permissions.includes(perm);
}

export function requireTenantSession(req: NextRequest): Session {
  const session = requireSession(req);
  if (!session.tenantId || (session.role !== "tenant_admin" && session.role !== "staff")) {
    throw new AuthError("Tenant session required", 403);
  }
  return session;
}

export function requireSuper(req: NextRequest): Session {
  const session = requireSession(req);
  if (session.role !== "super") throw new AuthError("Super admin required", 403);
  return session;
}
