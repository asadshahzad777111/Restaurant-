import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, Tenant, Order } from "./types";

export const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://ordo.asfins.com/api";

const TOKEN_KEY = "ordo_staff_token_v1";

export async function saveToken(token: string) {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function readToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearToken() {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await readToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

export async function login(code: string, username: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "tenant", code, username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  await saveToken(data.token);
  return data as { token: string; session: Session; user: Tenant["users"][0]; tenant: Tenant };
}

export async function getTenant(): Promise<{ session: Session; user: Tenant["users"][0]; tenant: Tenant }> {
  const res = await authFetch("/state");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load tenant");
  return data;
}

export async function getOrders(): Promise<Order[]> {
  const res = await authFetch("/orders?poll=1");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load orders");
  return data.orders || [];
}

export async function patchOrder(id: string, patch: Partial<Order>): Promise<Order> {
  const res = await authFetch(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data.order;
}

/** Toggle 86 (availability) on a menu item → returns the updated tenant. */
export async function toggle86(itemId: string): Promise<Tenant> {
  const res = await authFetch("/admin", {
    method: "PUT",
    body: JSON.stringify({ action: "toggle86", itemId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data.tenant;
}

/** Save the table list → returns the updated tenant. */
export async function saveTables(tables: unknown[]): Promise<Tenant> {
  const res = await authFetch("/admin", {
    method: "PUT",
    body: JSON.stringify({ action: "tables", tables }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data.tenant;
}

/** Place a counter (POS) order. */
export async function placeOrder(input: {
  serviceType: "counter";
  paymentMethod: string;
  lines: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitPrice: number;
    modifiers?: { groupId: string; optionId: string }[];
  }>;
  note?: string;
  customerName?: string;
  customerPhone?: string;
  discount?: number;
}): Promise<Order> {
  const res = await authFetch("/orders", {
    method: "POST",
    body: JSON.stringify({ channel: "pos", ...input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to place order");
  return data.order;
}

/** Pause / resume guest ordering (billing pause) → returns updated tenant. */
export async function pauseOrdering(paused: boolean): Promise<Tenant> {
  const res = await authFetch("/admin", {
    method: "PUT",
    body: JSON.stringify({ action: "orderingPaused", paused }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data.tenant;
}
