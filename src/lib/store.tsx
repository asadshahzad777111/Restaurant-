"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import type { Permission, PlatformFeatures, SessionRole, TenantStatus } from "./types";
import type { DiningTable, TenantState, MenuItem, Order, StockItem, TenantUser } from "./tenant-types";
import { setHelpModeCookieClient } from "./help-mode";

export const TOKEN_KEY = "restaurant_pos_token_v2";
/** Super token parked while Help mode uses TOKEN_KEY for the restaurant session. */
export const OWNER_TOKEN_KEY = "ordo_owner_token_v1";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: Permission[];
  mustChangePassword?: boolean;
  email?: string;
}

export interface AuthState {
  token: string | null;
  role: SessionRole | null;
  tenantId: string | null;
  impersonating: boolean;
  user: AuthUser | null;
  tenant: TenantState | null;
  platformFeatures: PlatformFeatures | null;
  billingPastDue: boolean;
  tenantStatus: TenantStatus | null;
  loading: boolean;
}

export interface LoginPayload {
  token?: string;
  session?: {
    role?: SessionRole | null;
    tenantId?: string | null;
    impersonating?: boolean;
  };
  user?: AuthUser | null;
  tenant?: TenantState | null;
}

interface StoreContextValue extends AuthState {
  setToken: (token: string | null) => void;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  hydrate: (payload: LoginPayload) => void;
  logout: () => Promise<void>;
  enterHelp: (impersonationToken: string) => void;
  exitHelp: () => Promise<void>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  applyTenant: (tenant: TenantState) => void;
  applyOrder: (order: Order, extras?: { tables?: DiningTable[] }) => void;
  mergeOrders: (orders: Order[]) => void;
}

type MemorySession = {
  token: string;
  role: SessionRole | null;
  tenantId: string | null;
  impersonating: boolean;
  user: AuthUser | null;
  tenant: TenantState | null;
  platformFeatures: PlatformFeatures | null;
  billingPastDue: boolean;
  tenantStatus: TenantStatus | null;
};

/** Survives StoreProvider remounts during client navigation (React state does not). */
let memorySession: MemorySession | null = null;

/**
 * Guest / marketing routes that must not boot restaurant Admin session.
 * Do not use startsWith("/order") — that also matches Admin /orders and
 * skips session hydrate, which crashes the Orders page on iPhone (Safari
 * then shows “This page couldn’t load”).
 */
export function isPublicPath(path: string) {
  return (
    path === "/" ||
    path.startsWith("/guest") ||
    path === "/order" ||
    path.startsWith("/order/") ||
    path.startsWith("/scan") ||
    path.startsWith("/track") ||
    path.startsWith("/login") ||
    path.startsWith("/lab") ||
    path.startsWith("/super") ||
    path.startsWith("/control")
  );
}

function readMemory(token: string | null): MemorySession | null {
  if (!token || !memorySession || memorySession.token !== token) return null;
  return memorySession;
}

function writeMemory(next: MemorySession | null) {
  memorySession = next;
}

function emptyAuth(): Omit<AuthState, "loading"> {
  return {
    token: null,
    role: null,
    tenantId: null,
    impersonating: false,
    user: null,
    tenant: null,
    platformFeatures: null,
    billingPastDue: false,
    tenantStatus: null,
  };
}

function clientBootState(): AuthState {
  // Always match SSR. Reading localStorage here hydrates a different tree than
  // the server (token / loading flags) and iPhone Safari kills the tab —
  // native “This page couldn’t load”. Session is restored in useEffect.
  return { ...emptyAuth(), loading: true };
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [boot] = useState(clientBootState);
  const [token, setTokenState] = useState<string | null>(boot.token);
  const [role, setRole] = useState<SessionRole | null>(boot.role);
  const [tenantId, setTenantId] = useState<string | null>(boot.tenantId);
  const [impersonating, setImpersonating] = useState(boot.impersonating);
  const [user, setUser] = useState<AuthUser | null>(boot.user);
  const [tenant, setTenant] = useState<TenantState | null>(boot.tenant);
  const [platformFeatures, setPlatformFeatures] = useState<PlatformFeatures | null>(
    boot.platformFeatures,
  );
  const [billingPastDue, setBillingPastDue] = useState(boot.billingPastDue);
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(boot.tenantStatus);
  const [loading, setLoading] = useState(boot.loading);

  const setToken = useCallback((t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setTokenState(t);
    if (!t || (memorySession && memorySession.token !== t)) writeMemory(null);
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type") && init?.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(path, { ...init, headers });
    },
    [token],
  );

  const applySession = useCallback((payload: MemorySession, doneLoading = true) => {
    writeMemory(payload);
    startTransition(() => {
      setTokenState(payload.token);
      setRole(payload.role);
      setTenantId(payload.tenantId);
      setImpersonating(payload.impersonating);
      setUser(payload.user);
      setTenant(payload.tenant);
      setPlatformFeatures(payload.platformFeatures);
      setBillingPastDue(Boolean(payload.billingPastDue));
      setTenantStatus(payload.tenantStatus ?? null);
      if (doneLoading) setLoading(false);
    });
  }, []);

  const hydrate = useCallback((payload: LoginPayload) => {
    const t = payload.token ?? (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null);
    if (payload.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
    }
    if (!t) {
      writeMemory(null);
      setLoading(false);
      return;
    }
    applySession({
      token: t,
      role: payload.session?.role ?? null,
      tenantId: payload.session?.tenantId ?? null,
      impersonating: !!payload.session?.impersonating,
      user: payload.user ?? null,
      tenant: payload.tenant ?? null,
      platformFeatures: null,
      billingPastDue: false,
      tenantStatus: null,
    });
  }, [applySession]);

  const applyTenant = useCallback((next: TenantState) => {
    if (memorySession) writeMemory({ ...memorySession, tenant: next });
    startTransition(() => setTenant(next));
  }, []);

  const applyOrder = useCallback((order: Order, extras?: { tables?: DiningTable[] }) => {
    setTenant((prev) => {
      if (!prev) return prev;
      const idx = prev.orders.findIndex((o) => o.id === order.id);
      const orders =
        idx >= 0 ? prev.orders.map((o) => (o.id === order.id ? order : o)) : [order, ...prev.orders];
      return { ...prev, orders, tables: extras?.tables ?? prev.tables };
    });
  }, []);

  const mergeOrders = useCallback((incoming: Order[]) => {
    if (!incoming.length) return;
    setTenant((prev) => {
      if (!prev) return prev;
      const known = new Set(prev.orders.map((o) => o.id));
      const fresh = incoming.filter((o) => !known.has(o.id));
      const updated = prev.orders.map((o) => incoming.find((n) => n.id === o.id) || o);
      return { ...prev, orders: fresh.length ? [...fresh, ...updated] : updated };
    });
  }, []);

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      writeMemory(null);
      setTokenState(null);
      setRole(null);
      setTenantId(null);
      setUser(null);
      setTenant(null);
      setPlatformFeatures(null);
      setBillingPastDue(false);
      setTenantStatus(null);
      setImpersonating(false);
      setLoading(false);
      return;
    }

    const cached = readMemory(t);
    if (!opts?.force && cached && (cached.tenant || cached.role === "super")) {
      applySession(cached);
      return;
    }

    setTokenState(t);
    try {
      const res = await fetch("/api/state", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        // Do not destroy a parked Super token just because restaurant state failed.
        const owner = localStorage.getItem(OWNER_TOKEN_KEY);
        if (owner && owner !== t) {
          setLoading(false);
          return;
        }
        localStorage.removeItem(TOKEN_KEY);
        writeMemory(null);
        setTokenState(null);
        setRole(null);
        setTenant(null);
        setPlatformFeatures(null);
        setBillingPastDue(false);
        setTenantStatus(null);
        setUser(null);
        setImpersonating(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      applySession({
        token: t,
        role: data.session?.role ?? null,
        tenantId: data.session?.tenantId ?? null,
        impersonating: !!data.session?.impersonating,
        user: data.user ?? null,
        tenant: data.tenant ?? null,
        platformFeatures: data.features ?? null,
        billingPastDue: Boolean(data.billingPastDue || data.meta?.status === "past_due"),
        tenantStatus: data.meta?.status ?? null,
      });
    } catch {
      setLoading(false);
    }
  }, [applySession]);

  const enterHelp = useCallback(
    (impersonationToken: string) => {
      const owner = localStorage.getItem(TOKEN_KEY);
      if (owner && owner !== impersonationToken) {
        localStorage.setItem(OWNER_TOKEN_KEY, owner);
      }
      setHelpModeCookieClient(true);
      localStorage.setItem(TOKEN_KEY, impersonationToken);
      writeMemory(null);
      setTokenState(impersonationToken);
    },
    [],
  );

  const exitHelp = useCallback(async () => {
    const helpTok = localStorage.getItem(TOKEN_KEY);
    const owner = localStorage.getItem(OWNER_TOKEN_KEY);
    if (helpTok && helpTok !== owner) {
      await fetch("/api/auth", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${helpTok}` },
      });
    }
    setHelpModeCookieClient(false);
    writeMemory(null);
    if (owner) {
      localStorage.setItem(TOKEN_KEY, owner);
      localStorage.removeItem(OWNER_TOKEN_KEY);
      setTokenState(owner);
      setRole("super");
      setTenantId(null);
      setUser(null);
      setTenant(null);
      setPlatformFeatures(null);
      setBillingPastDue(false);
      setTenantStatus(null);
      setImpersonating(false);
      setLoading(false);
      return;
    }
    setToken(null);
    setRole(null);
    setTenantId(null);
    setUser(null);
    setTenant(null);
    setPlatformFeatures(null);
    setBillingPastDue(false);
    setTenantStatus(null);
    setImpersonating(false);
  }, [setToken]);

  const logout = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    const owner = localStorage.getItem(OWNER_TOKEN_KEY);
    if (t) {
      await fetch("/api/auth", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
    }
    if (owner && owner !== t) {
      await fetch("/api/auth", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${owner}` },
      });
    }
    setHelpModeCookieClient(false);
    localStorage.removeItem(OWNER_TOKEN_KEY);
    writeMemory(null);
    setToken(null);
    setRole(null);
    setTenantId(null);
    setUser(null);
    setTenant(null);
    setPlatformFeatures(null);
    setBillingPastDue(false);
    setTenantStatus(null);
    setImpersonating(false);
  }, [setToken]);

  useEffect(() => {
    const path = window.location.pathname;
    if (isPublicPath(path)) {
      const t = localStorage.getItem(TOKEN_KEY);
      setTokenState(t);
      setLoading(false);
      return;
    }
    const t = localStorage.getItem(TOKEN_KEY);
    if (readMemory(t)?.tenant || readMemory(t)?.role === "super") {
      setLoading(false);
      return;
    }
    void refresh({ force: false });
  }, [refresh]);

  useEffect(() => {
    if (!token) return;
    /* Don't clobber a warm cache with an empty boot snapshot. */
    if (!tenant && !user && role !== "super") return;
    writeMemory({
      token,
      role,
      tenantId,
      impersonating,
      user,
      tenant,
      platformFeatures,
      billingPastDue,
      tenantStatus,
    });
  }, [token, role, tenantId, impersonating, user, tenant, platformFeatures, billingPastDue, tenantStatus]);

  const value = useMemo(
    () => ({
      token,
      role,
      tenantId,
      impersonating,
      user,
      tenant,
      platformFeatures,
      billingPastDue,
      tenantStatus,
      loading,
      setToken,
      refresh,
      hydrate,
      logout,
      enterHelp,
      exitHelp,
      api,
      applyTenant,
      applyOrder,
      mergeOrders,
    }),
    [
      token,
      role,
      tenantId,
      impersonating,
      user,
      tenant,
      platformFeatures,
      billingPastDue,
      tenantStatus,
      loading,
      setToken,
      refresh,
      hydrate,
      logout,
      enterHelp,
      exitHelp,
      api,
      applyTenant,
      applyOrder,
      mergeOrders,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export type { MenuItem, Order, StockItem, TenantUser, TenantState };
