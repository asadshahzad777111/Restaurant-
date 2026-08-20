"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, OWNER_TOKEN_KEY, useStore } from "@/lib/store";
import { apiUrl } from "@/lib/urls";
import type { Lead, Plan, PlatformTenantMeta } from "@/lib/types";
import styles from "./hq.module.css";

type Tab = "dashboard" | "restaurants" | "plans" | "leads";

const NAV: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Home" },
  { id: "restaurants", label: "Your restaurants" },
  { id: "plans", label: "Pricing plans" },
  { id: "leads", label: "Messages" },
];

export default function ControlPage() {
  const router = useRouter();
  const { setToken, logout } = useStore();
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
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      router.replace("/login?owner=1");
      return;
    }
    setLocalToken(t);
    const auth = await fetch(apiUrl("/api/auth"), { headers: { Authorization: `Bearer ${t}` } });
    if (!auth.ok) {
      router.replace("/login?owner=1");
      return;
    }
    const session = await auth.json();
    if (session.session?.role !== "super") {
      router.replace("/home");
      return;
    }
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
  }, [router]);

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
    setForm({ code: "", name: "", planId: "starter", adminUsername: "admin", adminPassword: "admin123" });
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

  async function helpRestaurant(id: string) {
    const ownerTok = localStorage.getItem(TOKEN_KEY);
    if (ownerTok) localStorage.setItem(OWNER_TOKEN_KEY, ownerTok);
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "impersonate", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not open restaurant");
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    router.push("/home");
  }

  function goTab(id: Tab) {
    setTab(id);
    setMenuOpen(false);
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
          <p className={styles.role}>Platform owner</p>
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
                <span>Your platform control — not a restaurant</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.body}>
          {tab === "dashboard" && (
            <section>
              <h1>Home</h1>
              <p className={styles.lead}>
                Manage restaurants here. Staff and guests use a different site — this panel is only for you.
              </p>
              <div className={styles.how}>
                <strong>How it works</strong>
                <ol>
                  <li>Add a restaurant below (or in Your restaurants).</li>
                  <li>They sign in at the restaurant site with their code.</li>
                  <li>Guests order with /order?tenant=CODE.</li>
                  <li>
                    Need to help them? Use <em>Help this restaurant</em> — no password needed.
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
                Each restaurant is separate. Help opens their panel without their password.
              </p>
              <form className={styles.create} onSubmit={createRestaurant}>
                <h2>Add restaurant</h2>
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
                        {p.name}
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
                      <th>Plan</th>
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
                        <td>{t.planId}</td>
                        <td>{t.status}</td>
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
                              Activate
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
              <p className={styles.lead}>Plans you assign when adding a restaurant.</p>
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
              <p className={styles.lead}>Contact requests from the marketing site.</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id}>
                          <td>{l.name}</td>
                          <td>{l.email}</td>
                          <td>{l.restaurantName || "—"}</td>
                          <td>{l.planId || "—"}</td>
                          <td>{l.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
