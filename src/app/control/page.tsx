"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, OWNER_TOKEN_KEY, useStore } from "@/lib/store";
import { setHelpModeCookieClient } from "@/lib/help-mode";
import { apiUrl } from "@/lib/urls";
import type { Lead, Plan, PlanId, PlatformTenantMeta } from "@/lib/types";
import styles from "./hq.module.css";

type Tab = "dashboard" | "restaurants" | "plans" | "leads" | "settings";

const NAV: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Home" },
  { id: "restaurants", label: "Your restaurants" },
  { id: "plans", label: "Pricing plans" },
  { id: "leads", label: "Messages" },
  { id: "settings", label: "Settings" },
];

export default function ControlPage() {
  const router = useRouter();
  const { setToken, logout, enterHelp } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [token, setLocalToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<PlatformTenantMeta[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    planId: "starter",
    adminUsername: "admin",
    adminPassword: "admin123",
    adminEmail: "",
  });

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const t = token || localStorage.getItem(TOKEN_KEY);
      const headers = new Headers(init?.headers);
      if (t) headers.set("Authorization", `Bearer ${t}`);
      if (init?.body) headers.set("Content-Type", "application/json");
      return fetch(apiUrl(path), { ...init, headers });
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
    }
    if (leadRes.ok) {
      const d = await leadRes.json();
      setLeads(d.leads || []);
    }
  }, [router, setToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRestaurant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "create", ...form }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add restaurant");
      return;
    }
    setForm({
      code: "",
      name: "",
      planId: "starter",
      adminUsername: "admin",
      adminPassword: "admin123",
      adminEmail: "",
    });
    await load();
    setTab("restaurants");
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
                Manage restaurants here. Staff and guests use ordo.asfins.com — this panel never becomes
                their Admin login.
              </p>
              <div className={styles.how}>
                <strong>How it works</strong>
                <ol>
                  <li>Add a restaurant and its Admin (code, plan, username, password).</li>
                  <li>They sign in at ordo.asfins.com/login with that code — they cannot open HQ.</li>
                  <li>Guests order with /order?tenant=CODE or table QR for that kitchen only.</li>
                  <li>
                    <em>Help this restaurant</em> is the only way into their panel. Yellow banner + Back to
                    ORDO HQ. Plans and messages stay on this page.
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
                  <strong>{tenants.filter((t) => t.status === "suspended").length}</strong>
                  <span>Paused</span>
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
                Each Admin belongs to one kitchen. Pause blocks their staff login. Billing is the monthly
                package you assign — not a restaurant Settings screen.
              </p>
              <form className={styles.create} onSubmit={createRestaurant}>
                <h2>Add restaurant + Admin</h2>
                <div className={styles.grid}>
                  <input
                    required
                    placeholder="Code (e.g. LAHORE1)"
                    value={form.code}
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
                  <input
                    placeholder="Admin username"
                    value={form.adminUsername}
                    onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                  />
                  <input
                    placeholder="Admin password"
                    value={form.adminPassword}
                    onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Admin email (optional)"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.primaryBtn}>
                  Add restaurant
                </button>
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
                        <td>{t.name}</td>
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
                        <td>{t.status === "suspended" ? "Paused" : t.status}</td>
                        <td className={styles.actions}>
                          <button
                            type="button"
                            className={styles.helpBtn}
                            onClick={() => void helpRestaurant(t.id)}
                          >
                            Help this restaurant
                          </button>
                          {t.status === "active" ? (
                            <button type="button" onClick={() => void setStatus(t.id, "suspended")}>
                              Pause
                            </button>
                          ) : (
                            <button type="button" onClick={() => void setStatus(t.id, "active")}>
                              Unpause
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <strong>Pause &amp; billing</strong>
                <p>
                  Pause a restaurant from Your restaurants. Staff login is blocked while paused. Billing is
                  Starter ₨999, Pro ₨1,999, Enterprise ₨4,499 per month, assigned per kitchen.
                </p>
                <strong>Android apps</strong>
                <p>
                  Staff and guest APKs are not published yet. Download and upload stay hidden until a real
                  file exists — we will not offer a 404. Later APKs will login with that restaurant’s code,
                  never open /super, and never mix kitchens.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
