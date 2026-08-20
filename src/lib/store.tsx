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
import type { Permission, SessionRole } from "./types";
import type { DiningTable, TenantState, MenuItem, Order, StockItem, TenantUser } from "./tenant-types";

export const TOKEN_KEY = "restaurant_pos_token_v2";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: Permission[];
  mustChangePassword?: boolean;
}

export interface AuthState {
  token: string | null;
  role: SessionRole | null;
  tenantId: string | null;
  impersonating: boolean;
  user: AuthUser | null;
  tenant: TenantState | null;
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
  refresh: () => Promise<void>;
  hydrate: (payload: LoginPayload) => void;
  logout: () => Promise<void>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  applyTenant: (tenant: TenantState) => void;
  applyOrder: (order: Order, extras?: { tables?: DiningTable[] }) => void;
  mergeOrders: (orders: Order[]) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [role, setRole] = useState<SessionRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<TenantState | null>(null);
  const [loading, setLoading] = useState(true);

  const setToken = useCallback((t: string | null) => {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    setTokenState(t);
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type") && init?.body) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(path, { ...init, headers });
    },
    [token],
  );

  const hydrate = useCallback((payload: LoginPayload) => {
    if (payload.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
      setTokenState(payload.token);
    }
    startTransition(() => {
      if (payload.session) {
        setRole(payload.session.role ?? null);
        setTenantId(payload.session.tenantId ?? null);
        setImpersonating(!!payload.session.impersonating);
      }
      if (payload.user !== undefined) setUser(payload.user);
      if (payload.tenant !== undefined) setTenant(payload.tenant);
      setLoading(false);
    });
  }, []);

  const applyTenant = useCallback((next: TenantState) => {
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

  const refresh = useCallback(async () => {
    const t = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setTokenState(null);
      setRole(null);
      setTenantId(null);
      setUser(null);
      setTenant(null);
      setImpersonating(false);
      setLoading(false);
      return;
    }
    setTokenState(t);
    const res = await fetch("/api/state", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      setRole(null);
      setTenant(null);
      setUser(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    startTransition(() => {
      setRole(data.session?.role ?? null);
      setTenantId(data.session?.tenantId ?? null);
      setImpersonating(!!data.session?.impersonating);
      setUser(data.user ?? null);
      setTenant(data.tenant ?? null);
      setLoading(false);
    });
  }, []);

  const logout = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      await fetch("/api/auth", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
    }
    setToken(null);
    setRole(null);
    setTenantId(null);
    setUser(null);
    setTenant(null);
    setImpersonating(false);
  }, [setToken]);

  useEffect(() => {
    const path = window.location.pathname;
    const publicRoute =
      path === "/" ||
      path.startsWith("/guest") ||
      path.startsWith("/order") ||
      path.startsWith("/scan") ||
      path.startsWith("/track") ||
      path.startsWith("/login") ||
      path.startsWith("/lab") ||
      path.startsWith("/super");
    if (publicRoute) {
      const t = localStorage.getItem(TOKEN_KEY);
      setTokenState(t);
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      token,
      role,
      tenantId,
      impersonating,
      user,
      tenant,
      loading,
      setToken,
      refresh,
      hydrate,
      logout,
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
      loading,
      setToken,
      refresh,
      hydrate,
      logout,
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
