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
import type { TenantState, MenuItem, Order, StockItem, TenantUser } from "./tenant-types";

export const TOKEN_KEY = "restaurant_pos_token_v2";

export interface AuthUser {
  id: string;
  username: string;
  role: "admin" | "staff";
  roleLabel: string;
  permissions: Permission[];
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

interface StoreContextValue extends AuthState {
  setToken: (token: string | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  api: (path: string, init?: RequestInit) => Promise<Response>;
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
      logout,
      api,
    }),
    [token, role, tenantId, impersonating, user, tenant, loading, setToken, refresh, logout, api],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export type { MenuItem, Order, StockItem, TenantUser, TenantState };
