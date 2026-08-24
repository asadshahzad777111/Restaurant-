/** Client for the cross-device print bridge: laptop/admin enqueues a job, the
 * mobile Capacitor station polls + prints it. */

export interface PrintApiConfig {
  baseUrl: string;
  getToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

let config: PrintApiConfig = {
  baseUrl: "/api",
  getToken: () => null,
  fetchImpl: typeof fetch !== "undefined" ? fetch.bind(globalThis) : undefined,
};

export function configurePrintApi(next: Partial<PrintApiConfig>) {
  config = { ...config, ...next };
}

function authHeaders(): Record<string, string> {
  const t = config.getToken?.();
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

export const printApi = {
  createPrintJob: (b: { text?: string; data_base64?: string; target?: string; orderId?: string }) =>
    request("/print-jobs", { method: "POST", body: JSON.stringify(b) }),
  getPending: (station?: string) =>
    request(`/print-jobs${station ? `?station=${station}` : ""}`),
  getStations: () => request("/print-jobs/stations"),
  heartbeat: (b: { station: string; name?: string }) =>
    request("/print-jobs/heartbeat", { method: "POST", body: JSON.stringify(b) }),
  claim: (id: string, b: { station: string; name?: string }) =>
    request(`/print-jobs/${encodeURIComponent(id)}/claim`, { method: "POST", body: JSON.stringify(b) }),
  complete: (id: string, b: { station: string; status?: string; error?: string }) =>
    request(`/print-jobs/${encodeURIComponent(id)}/complete`, { method: "POST", body: JSON.stringify(b) }),
};
