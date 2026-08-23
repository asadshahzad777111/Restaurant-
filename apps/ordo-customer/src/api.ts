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

export async function placeGuestOrder(input: unknown): Promise<{ order: { number: number } }> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "guest", ...input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not place order");
  return data;
}
