/** Client for the AsFix-style print bridge. Token = staff bearer; jobs never cross tenants. */

export interface PrintApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

const TOKEN_KEY = "restaurant_pos_token_v2";

function defaultToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let config: PrintApiConfig = {
  baseUrl: "/api",
  getToken: defaultToken,
  fetchImpl: typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined,
};

export function configurePrintApi(next: Partial<PrintApiConfig>) {
  config = { ...config, ...next };
}

function authHeaders(): Record<string, string> {
  const t = config.getToken?.() || defaultToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const f = config.fetchImpl || fetch;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
  for (const [k, v] of Object.entries(options.headers || {})) headers[k] = String(v);
  const res = await f(`${config.baseUrl}${path}`, { ...options, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  return data as T;
}

export type PrintBridgeStatus = {
  connected: boolean;
  lastSeen: number | null;
  printerName: string | null;
};

export type BridgePrintJob = {
  id: string;
  kind: "bill" | "kitchen";
  text: string;
  html?: string;
  orderId?: string | null;
  orderRef?: string | null;
  status: string;
};

export const printApi = {
  createPrintJob: (b: {
    kind?: "bill" | "kitchen";
    text?: string;
    html?: string;
    orderId?: string;
    orderRef?: string;
    target?: string;
  }) => request<{ job: BridgePrintJob }>("/print/jobs", { method: "POST", body: JSON.stringify(b) }),
  getPending: () => request<{ jobs: BridgePrintJob[]; bridge?: PrintBridgeStatus }>("/print/jobs"),
  getBridge: () => request<PrintBridgeStatus>("/print/bridge"),
  heartbeat: (b: { lastSeen?: number; printerName?: string; name?: string; station?: string }) =>
    request<PrintBridgeStatus>("/print/bridge", {
      method: "POST",
      body: JSON.stringify({
        lastSeen: b.lastSeen ?? Date.now(),
        printerName: b.printerName || b.name,
      }),
    }),
  ack: (id: string, b: { status: "printing" | "done" | "failed"; error?: string; station?: string }) =>
    request(`/print/jobs/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify(b) }),
  /** @deprecated use getBridge */
  getStations: async () => {
    const b = await printApi.getBridge();
    return { stations: { android: { online: b.connected, lastSeen: b.lastSeen, name: b.printerName } } };
  },
  /** @deprecated use ack */
  claim: (id: string, b: { station?: string; name?: string }) =>
    printApi.ack(id, { status: "printing", station: b.station }),
  /** @deprecated use ack */
  complete: (id: string, b: { station?: string; status?: string; error?: string }) =>
    printApi.ack(id, { status: b.status === "failed" ? "failed" : "done", error: b.error, station: b.station }),
};
