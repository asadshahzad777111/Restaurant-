import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PublicMenu } from "./types";

export const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://ordo.asfins.com/api";

const CODE_KEY = "ordo_guest_code";

export async function saveCode(code: string) {
  try {
    await AsyncStorage.setItem(CODE_KEY, code);
  } catch {
    /* ignore */
  }
}
export async function readCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CODE_KEY);
  } catch {
    return null;
  }
}

export async function getMenu(code: string): Promise<PublicMenu> {
  const res = await fetch(`${BASE_URL}/state?tenant=${encodeURIComponent(code)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Restaurant not found");
  return data.public as PublicMenu;
}

export async function placeGuestOrder(input: Record<string, unknown>): Promise<{ order: { number: number; trackToken: string } }> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "guest", ...input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not place order");
  return data;
}

export async function getTrack(code: string, token: string): Promise<{ order: { status: string; lines: { name: string; qty: number }[]; total: number }; code: string } | null> {
  const res = await fetch(`${BASE_URL}/track/${token}`);
  const data = await res.json();
  if (!res.ok) return null;
  return data;
}

export async function reserveTable(code: string, tableId: string, name: string, minutes: number) {
  const res = await fetch(`${BASE_URL}/tables/reserve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantCode: code, tableId, name, minutes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not book");
  return data;
}

export async function claimTable(code: string, tableId: string, token: string) {
  const res = await fetch(`${BASE_URL}/tables/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantCode: code, tableId, token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not claim");
  return data;
}

export async function releaseTable(code: string, tableId: string, token?: string) {
  const res = await fetch(`${BASE_URL}/tables/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantCode: code, tableId, token }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not release");
  return data;
}
