"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TOKEN_KEY, useStore } from "@/lib/store";
import { apiUrl } from "@/lib/urls";
import type { Lead, Plan, PlatformTenantMeta } from "@/lib/types";
import styles from "./super.module.css";

type Tab = "dashboard" | "restaurants" | "plans" | "leads";

export default function SuperPage() {
  const router = useRouter();
  const { setToken, logout } = useStore();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [token, setLocalToken] = useState<string | null>(null);
  const [tenants, setTenants] = useState<PlatformTenantMeta[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState("");
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
      router.replace("/login");
      return;
    }
    setLocalToken(t);
    const auth = await fetch(apiUrl("/api/auth"), { headers: { Authorization: `Bearer ${t}` } });
    if (!auth.ok) {
      router.replace("/login");
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
      setError(data.error || "Create failed");
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

  async function openTenant(id: string) {
    const res = await api("/api/super/tenants", {
      method: "POST",
      body: JSON.stringify({ action: "impersonate", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Open failed");
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    router.push("/home");
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.side}>
        <Link href="/" className={styles.brand}>
          ORDO
        </Link>
        <p className={styles.role}>Super Admin</p>
        {(
          [
            ["dashboard", "Dashboard"],
            ["restaurants", "Restaurants"],
            ["plans", "Plans"],
            ["leads", "Leads"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? styles.navActive : styles.nav}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={styles.logout}
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </aside>
      <main className={styles.main}>
        {tab === "dashboard" && (
          <section>
            <h1>Dashboard</h1>
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
                <span>Leads</span>
              </div>
            </div>
          </section>
        )}

        {tab === "restaurants" && (
          <section>
            <h1>Restaurants</h1>
            <form className={styles.create} onSubmit={createRestaurant}>
              <h2>Create restaurant</h2>
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
              <button type="submit">Create</button>
            </form>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <code>{t.code}</code>
                    </td>
                    <td>{t.name}</td>
                    <td>{t.planId}</td>
                    <td>{t.status}</td>
                    <td className={styles.actions}>
                      <button type="button" onClick={() => void openTenant(t.id)}>
                        Open
                      </button>
                      {t.status === "active" ? (
                        <button type="button" onClick={() => void setStatus(t.id, "suspended")}>
                          Suspend
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
          </section>
        )}

        {tab === "plans" && (
          <section>
            <h1>Plans</h1>
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
                  <p className={styles.muted}>Max staff: {p.maxStaff}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "leads" && (
          <section>
            <h1>Leads</h1>
            {leads.length === 0 ? (
              <p className={styles.muted}>No leads yet. Marketing contact form writes here.</p>
            ) : (
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
            )}
          </section>
        )}
      </main>
    </div>
  );
}
