"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, OWNER_TOKEN_KEY, useStore } from "@/lib/store";
import { setHelpModeCookieClient } from "@/lib/help-mode";
import { apiUrl } from "@/lib/urls";
import type { Lead, Plan, PlanId, PlatformFeatures, PlatformTenantMeta, TenantStatus } from "@/lib/types";
import styles from "./hq.module.css";

type Tab = "dashboard" | "restaurants" | "apps" | "plans" | "leads" | "settings";

type ApkRow = {
  id: "staff" | "customer";
  title: string;
  filename: string;
  aabFilename?: string;
  available: boolean;
  aabAvailable?: boolean;
  sizeBytes: number;
  aabSizeBytes?: number;
  updatedAt: string | null;
  aabUpdatedAt?: string | null;
  loadsUrl: string;
  loadsPath: string;
  note: string;
};

const NAV: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Home" },
  { id: "restaurants", label: "Your restaurants" },
  { id: "apps", label: "Apps" },
  { id: "plans", label: "Pricing plans" },
  { id: "leads", label: "Messages" },
  { id: "settings", label: "Settings" },
];

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}


function CredsRow({
  user,
  onSave,
}: {
  user: {
    id: string;
    username: string;
    password: string;
    passwordKnown?: boolean;
    email: string;
    role: string;
    roleLabel: string;
    active: boolean;
  };
  onSave: (userId: string, email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const known = user.passwordKnown !== false && Boolean(user.password);
  return (
    <tr>
      <td>
        <code>{user.username}</code>
        {!user.active ? " · off" : ""}
      </td>
      <td>
        {user.roleLabel} ({user.role})
      </td>
      <td>
        <div className={styles.credCurrent}>
          {known ? (
            <>
              Visible to Super: <code>{user.password}</code>
            </>
          ) : (
            <span className={styles.muted}>
              Not recoverable (hashed before Super copy). Set a new password below — it stays
              visible here after Save.
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder="New password (optional)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%" }}
          autoComplete="off"
        />
      </td>
      <td>
        <input
          type="email"
          placeholder="gmail@"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%" }}
          autoComplete="off"
        />
      </td>
      <td>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onSave(user.id, email, password).finally(() => {
              setBusy(false);
              setPassword("");
            });
          }}
        >
          Save
        </button>
      </td>
    </tr>
  );
}

export default function ControlPage() {
  const router = useRouter();
  const { setToken, logout, enterHelp } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [token, setLocalToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<PlatformTenantMeta[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [features, setFeatures] = useState<PlatformFeatures>({ fbrOptional: false });
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [apkTenantId, setApkTenantId] = useState("");
  const [apkRows, setApkRows] = useState<ApkRow[]>([]);
  const [apkBusy, setApkBusy] = useState(false);
  const [apkMessage, setApkMessage] = useState("");
  const [billingBusy, setBillingBusy] = useState("");
  const [credsTenantId, setCredsTenantId] = useState<string | null>(null);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsUsers, setCredsUsers] = useState<
    Array<{
      id: string;
      username: string;
      password: string;
      passwordKnown?: boolean;
      email: string;
      role: string;
      roleLabel: string;
      active: boolean;
    }>
  >([]);
  const [credsGuests, setCredsGuests] = useState<
    Array<{ id: string; email: string; name: string; createdAt: string }>
  >([]);
  const emptyForm = {
    code: "",
    name: "",
    planId: "starter",
    adminUsername: "admin",
    adminPassword: "admin123",
    adminEmail: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const t = token || localStorage.getItem(TOKEN_KEY);
      const headers = new Headers(init?.headers);
      if (t) headers.set("Authorization", `Bearer ${t}`);
      if (init?.body && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(apiUrl(path), { ...init, headers });
    },
    [token],
  );

  const loadApks = useCallback(
    async (tenantId: string, authToken?: string) => {
      if (!tenantId) {
        setApkRows([]);
        return;
      }
      const t = authToken || token || localStorage.getItem(TOKEN_KEY);
      const res = await fetch(apiUrl(`/api/super/apks?tenantId=${encodeURIComponent(tenantId)}`), {
        headers: t ? { Authorization: `Bearer ${t}` } : undefined,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { apps?: ApkRow[] };
      setApkRows((data.apps || []).filter((a) => a.id === "staff"));
    },
    [token],
  );

  const load = useCallback(async () => {
    let t = localStorage.getItem(TOKEN_KEY);
    const owner = localStorage.getItem(OWNER_TOKEN_KEY);
    if (!t && owner) {
      localStorage.setItem(TOKEN_KEY, owner);
      localStorage.removeItem(OWNER_TOKEN_KEY);
      t = owner;
      setHelpModeCookieClient(false);
    }
    if (!t) {
      router.replace("/login?owner=1");
      return;
    }
    setLocalToken(t);
    const auth = await fetch(apiUrl("/api/auth"), { headers: { Authorization: `Bearer ${t}` } });
    if (!auth.ok) {
      if (owner && owner !== t) {
        localStorage.setItem(TOKEN_KEY, owner);
        localStorage.removeItem(OWNER_TOKEN_KEY);
        setHelpModeCookieClient(false);
        setToken(owner);
        router.replace("/control");
        return;
      }
      router.replace("/login?owner=1");
      return;
    }
    const data = await auth.json();
    // Super stays on HQ. A leftover Admin/help token must restore owner — never /home.
    if (data.session?.role !== "super") {
      if (owner) {
        localStorage.setItem(TOKEN_KEY, owner);
        localStorage.removeItem(OWNER_TOKEN_KEY);
        setHelpModeCookieClient(false);
        setToken(owner);
        router.replace("/control");
        return;
      }
      router.replace("/login?owner=1");
      return;
    }
    setHelpModeCookieClient(false);
    const [tenRes, leadRes] = await Promise.all([
      fetch(apiUrl("/api/super/tenants"), { headers: { Authorization: `Bearer ${t}` } }),
      fetch(apiUrl("/api/leads"), { headers: { Authorization: `Bearer ${t}` } }),
    ]);
    if (tenRes.ok) {
      const d = await tenRes.json();
      setTenants(d.tenants);
      setPlans(d.plans);
      setFeatures(d.features || { fbrOptional: false });
      const firstId = d.tenants?.[0]?.id || "";
      setApkTenantId((prev) => prev || firstId);
      if (firstId || apkTenantId) {
        await loadApks(apkTenantId || firstId, t);
      }
    }
    if (leadRes.ok) {
      const d = await leadRes.json();
      setLeads(d.leads || []);
    }
  }, [router, setToken, loadApks, apkTenantId]);

  useEffect(() => {
    void load();
    // Initial auth load only — avoid re-loop when apkTenantId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (apkTenantId) void loadApks(apkTenantId);
  }, [apkTenantId, loadApks]);

  function startEdit(t: PlatformTenantMeta) {
    setEditingId(t.id);
    setForm({
      code: t.code,
      name: t.name,
      planId: t.planId,
      adminUsername: "admin",
      adminPassword: "",
      adminEmail: t.adminEmail || "",
    });
    setError("");
    setTab("restaurants");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (editingId) {
      const res = await api("/api/super/tenants", {
        method: "POST",
        body: JSON.stringify({
          action: "update",
          id: editingId,
          name: form.name,
          planId: form.planId,
          adminEmail: form.adminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save restaurant");
        return;
      }
      cancelEdit();
      await load();
      return;
    }
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "create", ...form }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add restaurant");
      return;
    }
    setForm(emptyForm);
    await load();
    setTab("restaurants");
    if (data.tenant?.id) {
      void openCredentials(data.tenant.id);
    }
  }

  async function setStatus(id: string, status: string) {
    await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "status", id, status }),
    });
    await load();
  }

  async function setPlan(id: string, planId: PlanId) {
    await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "plan", id, planId }),
    });
    await load();
  }

  async function renewRestaurant(id: string) {
    setBillingBusy(id);
    try {
      const res = await api("/api/super/tenants", {
        method: "POST",
        body: JSON.stringify({ action: "renew", id, days: 30 }),
      });
      if (!res.ok) {
        window.alert("Renew failed");
        return;
      }
      await load();
    } finally {
      setBillingBusy("");
    }
  }

  async function billingStatus(id: string, status: TenantStatus) {
    setBillingBusy(id);
    try {
      const res = await api("/api/super/tenants", {
        method: "POST",
        body: JSON.stringify({ action: "billing", id, status }),
      });
      if (!res.ok) {
        window.alert("Billing update failed");
        return;
      }
      await load();
    } finally {
      setBillingBusy("");
    }
  }

  async function saveBillingNote(id: string, note: string) {
    setBillingBusy(id);
    try {
      await api("/api/super/tenants", {
        method: "POST",
        body: JSON.stringify({ action: "billing", id, billingNote: note }),
      });
      await load();
    } finally {
      setBillingBusy("");
    }
  }

  async function helpRestaurant(id: string) {
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "impersonate", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not open restaurant");
      return;
    }
    enterHelp(data.token);
    setToken(data.token);
    router.push("/home");
  }

  async function openCredentials(id: string) {
    setCredsTenantId(id);
    setCredsLoading(true);
    setCredsUsers([]);
    setCredsGuests([]);
    try {
      const res = await api("/api/super/tenants", {
        method: "POST",
        body: JSON.stringify({ action: "credentials", id }),
      });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error || "Could not load credentials");
        setCredsTenantId(null);
        return;
      }
      setCredsUsers(data.users || []);
      setCredsGuests(data.guestClients || []);
      window.setTimeout(() => {
        document.getElementById("super-creds-panel")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    } finally {
      setCredsLoading(false);
    }
  }

  async function saveUserCreds(userId: string, email: string, password: string) {
    if (!credsTenantId) return;
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({
        action: "setUserCreds",
        id: credsTenantId,
        userId,
        email,
        ...(password ? { password, mustChangePassword: true } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error || "Save failed");
      return;
    }
    setCredsUsers(data.users || []);
  }

  async function readApiError(res: Response, fallback: string) {
    const text = await res.text().catch(() => "");
    try {
      const data = JSON.parse(text) as { error?: string; hint?: string };
      if (data.error) return data.hint ? `${data.error} — ${data.hint}` : data.error;
    } catch {
      /* non-JSON (e.g. Vercel 413 HTML) */
    }
    if (res.status === 413) {
      return "Upload too large for Vercel (~4.5MB request limit). Use a smaller APK.";
    }
    if (text.trim()) return text.trim().slice(0, 280);
    return `${fallback} (HTTP ${res.status})`;
  }

  async function uploadApk(slot: "staff" | "customer", file: File) {
    if (slot !== "staff") return;
    if (!apkTenantId) {
      window.alert("Select a restaurant first");
      return;
    }
    setApkBusy(true);
    setApkMessage("");
    try {
      const fd = new FormData();
      fd.set("id", slot);
      fd.set("tenantId", apkTenantId);
      fd.set("file", file);
      const res = await api("/api/super/apks", { method: "POST", body: fd });
      if (!res.ok) {
        window.alert(await readApiError(res, "Upload failed"));
        return;
      }
      const kind = file.name.toLowerCase().endsWith(".aab") ? "Play Store AAB" : "APK";
      setApkMessage(`Staff ${kind} uploaded for this restaurant.`);
      await loadApks(apkTenantId);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setApkBusy(false);
    }
  }

  async function removeApk(slot: "staff" | "customer", format?: "apk" | "aab") {
    if (!apkTenantId) return;
    const label = format === "aab" ? "Play Store AAB" : format === "apk" ? "APK" : "APK + AAB";
    if (!window.confirm(`Remove ${slot} ${label} for this restaurant?`)) return;
    setApkBusy(true);
    try {
      const q = format ? `&format=${format}` : "";
      const res = await api(`/api/super/apks/${slot}?tenantId=${encodeURIComponent(apkTenantId)}${q}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        window.alert(await readApiError(res, "Could not remove file"));
        return;
      }
      await loadApks(apkTenantId);
    } finally {
      setApkBusy(false);
    }
  }

  async function downloadApk(slot: "staff" | "customer", filename: string, format: "apk" | "aab" = "apk") {
    if (!apkTenantId) return;
    setApkBusy(true);
    try {
      const res = await api(
        `/api/super/apks/${slot}?tenantId=${encodeURIComponent(apkTenantId)}&format=${format}`,
      );
      if (!res.ok) {
        window.alert(await readApiError(res, "Download failed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setApkBusy(false);
    }
  }

  async function saveFbrOptional(next: boolean) {
    setFeatures({ fbrOptional: next });
    await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "features", fbrOptional: next }),
    });
  }

  function goTab(id: Tab) {
    setTab(id);
    setMenuOpen(false);
  }

  function planPrice(planId: string) {
    const p = plans.find((x) => x.id === planId);
    return p ? `₨${p.pricePkr.toLocaleString()}/mo` : planId;
  }

  function renewLabel(iso: string) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return "—";
    }
  }

  function statusLabel(s: string) {
    if (s === "suspended") return "Paused";
    if (s === "past_due") return "Past due";
    return s;
  }

  const selectedTenant = tenants.find((t) => t.id === apkTenantId) || null;

  return (
    <div className={styles.layout}>
      {menuOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`${styles.side} ${menuOpen ? styles.sideOpen : ""}`}>
        <div className={styles.sideTop}>
          <Link href="/control" className={styles.brand}>
            ORDO HQ
          </Link>
          <p className={styles.role}>Platform owner · Super</p>
        </div>
        <div className={styles.navWrap}>
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={tab === n.id ? styles.navActive : styles.nav}
              onClick={() => goTab(n.id)}
            >
              {n.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.logout}
          onClick={async () => {
            await logout();
            localStorage.removeItem(OWNER_TOKEN_KEY);
            router.push("/login?owner=1");
          }}
        >
          Log out
        </button>
      </aside>

      <div className={styles.main}>
        <header className={styles.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <button type="button" className={styles.menuBtn} onClick={() => setMenuOpen(true)}>
              Menu
            </button>
            <div>
              <strong>ORDO HQ</strong>
              <div>
                <span>You are Super — not a restaurant Admin</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {tab === "dashboard" && (
            <section>
              <h1>Home</h1>
              <p className={styles.lead}>
                Manage restaurants, billing, and per-kitchen Staff APKs here. Staff and guests
                use ordo.asfins.com — this panel never becomes their Admin login.
              </p>
              <div className={styles.how}>
                <strong>How it works</strong>
                <ol>
                  <li>Add a restaurant and its Admin (code, plan, username, password).</li>
                  <li>
                    Open <strong>Passwords &amp; Gmail</strong> on any restaurant row to see Admin
                    username, password, and email anytime — Super-only.
                  </li>
                  <li>They sign in at ordo.asfins.com/login with that code — they cannot open HQ.</li>
                  <li>Guests order with /order?tenant=CODE or table QR for that kitchen only.</li>
                  <li>
                    Upload a named Staff APK under Apps — locked to that restaurant code so kitchens
                    never mix. Guests order on the web, table QR, or scanner.
                  </li>
                  <li>
                    <em>Open Admin (no password)</em> is Help mode into their panel. Yellow banner +
                    Back to ORDO HQ.
                  </li>
                </ol>
              </div>
              <div className={styles.stats}>
                <div>
                  <strong>{tenants.length}</strong>
                  <span>Restaurants</span>
                </div>
                <div>
                  <strong>{tenants.filter((t) => t.status === "active").length}</strong>
                  <span>Active</span>
                </div>
                <div>
                  <strong>
                    {tenants.filter((t) => t.status === "suspended" || t.status === "past_due").length}
                  </strong>
                  <span>Paused / past due</span>
                </div>
                <div>
                  <strong>{leads.length}</strong>
                  <span>Messages</span>
                </div>
              </div>
            </section>
          )}

          {tab === "restaurants" && (
            <section>
              <h1>Your restaurants</h1>
              <p className={styles.lead}>
                Each Admin belongs to one kitchen. Pause blocks their staff login. Billing renewals and
                past-due flags live here — not inside restaurant Settings.
              </p>
              <div className={styles.credsBanner}>
                <strong>Passwords &amp; Gmail</strong>
                <p>
                  Click <em>Passwords &amp; Gmail</em> on any restaurant to see Admin (and staff)
                  username, password, and Gmail. Only Super sees this.{" "}
                  <em>Open Admin (no password)</em> still works for Help without needing the kitchen
                  password.
                </p>
              </div>
              <form className={styles.create} onSubmit={createRestaurant}>
                <h2>{editingId ? "Edit restaurant" : "Add restaurant + Admin"}</h2>
                <div className={styles.grid}>
                  <input
                    required
                    placeholder="Code (e.g. LAHORE1)"
                    value={form.code}
                    readOnly={!!editingId}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Display name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <select
                    value={form.planId}
                    onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · ₨{p.pricePkr.toLocaleString()}/mo
                      </option>
                    ))}
                  </select>
                  {!editingId && (
                    <input
                      placeholder="Admin username"
                      value={form.adminUsername}
                      onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                    />
                  )}
                  {!editingId && (
                    <input
                      placeholder="Admin password"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Admin email (optional)"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.primaryBtn}>
                  {editingId ? "Save restaurant" : "Add restaurant"}
                </button>
                {editingId && (
                  <button type="button" className={styles.helpBtn} onClick={cancelEdit}>
                    Cancel edit
                  </button>
                )}
              </form>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Admin email</th>
                      <th>Plan / billing</th>
                      <th>Renews</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <code>{t.code}</code>
                          {t.code === "DEMO" && <span className={styles.demoTag}>Demo</span>}
                        </td>
                        <td>
                          {t.name}
                          {t.billingNote ? (
                            <div className={styles.muted}>{t.billingNote}</div>
                          ) : null}
                        </td>
                        <td>{t.adminEmail || "—"}</td>
                        <td>
                          <select
                            value={t.planId}
                            onChange={(e) => void setPlan(t.id, e.target.value as PlanId)}
                          >
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} · ₨{p.pricePkr.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          <div className={styles.muted}>{planPrice(t.planId)}</div>
                        </td>
                        <td>{renewLabel(t.renewsAt)}</td>
                        <td>{statusLabel(t.status)}</td>
                        <td className={styles.actions}>
                          <button type="button" onClick={() => startEdit(t)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className={styles.helpBtn}
                            onClick={() => void helpRestaurant(t.id)}
                          >
                            Open Admin (no password)
                          </button>
                          <button
                            type="button"
                            className={styles.credsBtn}
                            onClick={() => void openCredentials(t.id)}
                          >
                            Passwords & Gmail
                          </button>
                          <button
                            type="button"
                            disabled={billingBusy === t.id}
                            onClick={() => void renewRestaurant(t.id)}
                          >
                            Renew +30d
                          </button>
                          {t.status !== "past_due" && (
                            <button
                              type="button"
                              disabled={billingBusy === t.id}
                              onClick={() => void billingStatus(t.id, "past_due")}
                            >
                              Mark past due
                            </button>
                          )}
                          {t.status === "past_due" && (
                            <button
                              type="button"
                              disabled={billingBusy === t.id}
                              onClick={() => void billingStatus(t.id, "active")}
                            >
                              Clear past due
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={billingBusy === t.id}
                            onClick={() => {
                              const note = window.prompt("Billing note (APK fee, custom deal…)", t.billingNote || "");
                              if (note === null) return;
                              void saveBillingNote(t.id, note.trim());
                            }}
                          >
                            Note
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApkTenantId(t.id);
                              setTab("apps");
                            }}
                          >
                            Apps
                          </button>
                          {t.status === "active" || t.status === "past_due" ? (
                            <button type="button" onClick={() => void setStatus(t.id, "suspended")}>
                              Pause
                            </button>
                          ) : (
                            <button type="button" onClick={() => void setStatus(t.id, "active")}>
                              Unpause
                            </button>
                          )}
                          <button
                            type="button"
                            style={{ background: "#c0392b", color: "#fff", fontWeight: 700 }}
                            onClick={() => {
                              if (window.confirm(`Deactivate ${t.name || t.code}? This finishes it immediately — login is blocked.`)) {
                                void setStatus(t.id, "suspended");
                              }
                            }}
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {credsTenantId && (
                <div id="super-creds-panel" className={styles.credsPanel}>
                  <h2>
                    Passwords & Gmail ·{" "}
                    {tenants.find((x) => x.id === credsTenantId)?.name || "Restaurant"}
                    {" · "}
                    <code>{tenants.find((x) => x.id === credsTenantId)?.code}</code>
                  </h2>
                  <p className={styles.muted}>
                    Super-only. Login passwords are hashed; Super keeps a recoverable copy when you
                    create or reset here — refresh keeps them visible. Username + Gmail always show.
                    If an older kitchen shows &quot;Not recoverable&quot;, set a new password once.
                    Use <em>Open Admin (no password)</em> for Help mode without needing the password.
                  </p>
                  {credsLoading ? (
                    <p className={styles.muted}>Loading…</p>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Password</th>
                            <th>Gmail</th>
                            <th>Save</th>
                          </tr>
                        </thead>
                        <tbody>
                          {credsUsers.map((u) => (
                            <CredsRow
                              key={`${u.id}:${u.password}:${u.email}`}
                              user={u}
                              onSave={saveUserCreds}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {credsGuests.length > 0 && (
                    <>
                      <h2 style={{ marginTop: "1rem" }}>Guest Gmail clients</h2>
                      <ul className={styles.muted}>
                        {credsGuests.map((g) => (
                          <li key={g.id}>
                            {g.name} · {g.email}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.helpBtn}
                    style={{ marginTop: "0.75rem" }}
                    onClick={() => setCredsTenantId(null)}
                  >
                    Close
                  </button>
                </div>
              )}
            </section>
          )}

          {tab === "apps" && (
            <section>
              <h1>Apps · per restaurant</h1>
              <p className={styles.lead}>
                Every kitchen can have its own Staff Android app (unique package id, baked tenant
                code). Guests order on the web, table QR, or scanner.{" "}
                <strong>.apk</strong> = sideload for the team. <strong>.aab</strong> = Google Play
                Console. Build:{" "}
                <code>
                  node scripts/build-tenant-apks.cjs --code=CODE --name=&quot;Kitchen&quot; --release
                </code>{" "}
                (see docs/PLAY-STORE.md).
              </p>
              <div className={styles.create}>
                <h2>Restaurant</h2>
                <select
                  value={apkTenantId}
                  onChange={(e) => setApkTenantId(e.target.value)}
                  style={{ maxWidth: "28rem" }}
                >
                  {tenants.length === 0 && <option value="">No restaurants yet</option>}
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {t.code}
                    </option>
                  ))}
                </select>
                {selectedTenant && (
                  <p className={styles.muted} style={{ marginTop: "0.75rem" }}>
                    Staff opens{" "}
                    <code>/login?app=staff&amp;tenant={selectedTenant.code}</code>
                    . Guests open{" "}
                    <code>/order?tenant={selectedTenant.code}</code>
                    {" "}or a table QR.
                    <br />
                    Play package:{" "}
                    <code>
                      com.ordo.staff.
                      {selectedTenant.code.toLowerCase().replace(/[^a-z0-9]/g, "")}
                    </code>
                  </p>
                )}
                {apkMessage && <p className={styles.muted}>{apkMessage}</p>}
              </div>

              {selectedTenant && (
                <div className={styles.planGrid}>
                  {apkRows
                    .filter((app) => app.id === "staff")
                    .map((app) => (
                    <article key={app.id}>
                      <h3>{app.title}</h3>
                      <p className={styles.muted}>{app.note}</p>
                      <p className={styles.muted}>
                        Loads: <code>{app.loadsPath}</code>
                      </p>

                      <h4 style={{ marginBottom: "0.35rem" }}>Sideload APK</h4>
                      <p className={styles.muted}>{app.filename}</p>
                      <p>
                        {app.available ? (
                          <>
                            Ready · {formatBytes(app.sizeBytes)}
                            {app.updatedAt ? ` · ${new Date(app.updatedAt).toLocaleString()}` : ""}
                          </>
                        ) : (
                          <span className={styles.muted}>Not uploaded</span>
                        )}
                      </p>
                      <div className={styles.actions} style={{ marginTop: "0.5rem" }}>
                        <label className={styles.helpBtn} style={{ cursor: apkBusy ? "wait" : "pointer" }}>
                          {apkBusy ? "Working…" : "Upload .apk"}
                          <input
                            type="file"
                            accept=".apk,application/vnd.android.package-archive"
                            hidden
                            disabled={apkBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void uploadApk(app.id, file);
                            }}
                          />
                        </label>
                        {app.available && (
                          <>
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              disabled={apkBusy}
                              onClick={() => void downloadApk(app.id, app.filename, "apk")}
                            >
                              Download APK
                            </button>
                            <button type="button" disabled={apkBusy} onClick={() => void removeApk(app.id, "apk")}>
                              Remove APK
                            </button>
                          </>
                        )}
                      </div>

                      <h4 style={{ margin: "1rem 0 0.35rem" }}>Google Play AAB</h4>
                      <p className={styles.muted}>{app.aabFilename || app.filename.replace(/\.apk$/i, ".aab")}</p>
                      <p>
                        {app.aabAvailable ? (
                          <>
                            Ready · {formatBytes(app.aabSizeBytes || 0)}
                            {app.aabUpdatedAt ? ` · ${new Date(app.aabUpdatedAt).toLocaleString()}` : ""}
                          </>
                        ) : (
                          <span className={styles.muted}>Not uploaded — build with --release</span>
                        )}
                      </p>
                      <div className={styles.actions} style={{ marginTop: "0.5rem" }}>
                        <label className={styles.helpBtn} style={{ cursor: apkBusy ? "wait" : "pointer" }}>
                          {apkBusy ? "Working…" : "Upload .aab"}
                          <input
                            type="file"
                            accept=".aab,application/octet-stream"
                            hidden
                            disabled={apkBusy}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) void uploadApk(app.id, file);
                            }}
                          />
                        </label>
                        {app.aabAvailable && (
                          <>
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              disabled={apkBusy}
                              onClick={() =>
                                void downloadApk(
                                  app.id,
                                  app.aabFilename || app.filename.replace(/\.apk$/i, ".aab"),
                                  "aab",
                                )
                              }
                            >
                              Download AAB
                            </button>
                            <button type="button" disabled={apkBusy} onClick={() => void removeApk(app.id, "aab")}>
                              Remove AAB
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "plans" && (
            <section>
              <h1>Pricing plans</h1>
              <p className={styles.lead}>
                Monthly packages you assign per restaurant. Editing this list does not open a kitchen.
              </p>
              <div className={styles.planGrid}>
                {plans.map((p) => (
                  <article key={p.id}>
                    <h3>{p.name}</h3>
                    <p className={styles.price}>₨{p.pricePkr.toLocaleString()}/mo</p>
                    <p>{p.description}</p>
                    <ul>
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <p className={styles.muted}>Up to {p.maxStaff} staff</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === "leads" && (
            <section>
              <h1>Messages</h1>
              <p className={styles.lead}>
                Contact form requests and inbound email (Resend webhook). Viewing them stays on HQ —
                restaurant Admins do not see this list.
              </p>
              {leads.length === 0 ? (
                <p className={styles.muted}>No messages yet.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Restaurant</th>
                        <th>Plan</th>
                        <th>Source</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id}>
                          <td>{l.name}</td>
                          <td>{l.email}</td>
                          <td>{l.restaurantName || "—"}</td>
                          <td>{l.planId || "—"}</td>
                          <td>{l.source === "inbound_email" ? "Email in" : l.source}</td>
                          <td className={styles.msgCell}>{l.message || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === "settings" && (
            <section>
              <h1>HQ settings</h1>
              <p className={styles.lead}>
                Platform owner tools. Restaurant logos, menus, and printers live inside that kitchen — use
                Help this restaurant, then Back to ORDO HQ.
              </p>
              <div className={styles.how}>
                <strong>Optional features</strong>
                <p>
                  There is no FBR page on the website. Use one click below to allow kitchens to optionally
                  enable FBR fields inside their own Settings. Off by default for every kitchen.
                </p>
                <button
                  type="button"
                  className={features.fbrOptional ? styles.primaryBtn : styles.helpBtn}
                  onClick={() => void saveFbrOptional(!features.fbrOptional)}
                >
                  {features.fbrOptional
                    ? "FBR option ON — kitchens may opt in"
                    : "FBR option OFF — one click to allow"}
                </button>
              </div>
              <div className={styles.how}>
                <strong>Pause &amp; billing</strong>
                <p>
                  Pause, renew +30 days, mark past due, and billing notes live under Your restaurants.
                  Staff login is blocked while paused. Billing is Starter ₨999, Pro ₨1,999, Enterprise
                  ₨4,499 per month, assigned per kitchen.
                </p>
                <strong>Android apps</strong>
                <p>
                  Upload a finished Staff APK under the Apps tab — named{" "}
                  <code>ORDO-CODE-Staff.apk</code>, label <em>Restaurant Staff</em>. Guests stay on the
                  web menu, table QR, or scanner. Build:{" "}
                  <code>node scripts/build-tenant-apks.cjs --code=CODE --name=&quot;Name&quot;</code>.
                  Download stays hidden until a real file exists. Staff APK never opens /super or /control.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
