"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/urls";
import styles from "./marketing.module.css";

const TABS = [
  {
    id: "owner",
    label: "Owner",
    title: "See the floor without living in the kitchen",
    body: "Live orders, staff permissions, and a profit strip on Home — so owners stay in control across every shift.",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    title: "Tickets that move with the ticket rail",
    body: "Kitchen display updates as staff advance status. No shouting across the pass — just clear, timed tickets.",
  },
  {
    id: "inventory",
    label: "Inventory",
    title: "Stock that belongs to one restaurant only",
    body: "Each tenant’s ingredients stay isolated. Low-stock alerts stay on that restaurant’s Settings — never mixed.",
  },
  {
    id: "finance",
    label: "Finance",
    title: "Payment choices guests already understand",
    body: "Table, pickup, and delivery each expose the right pay options. Counter POS supports cash, card, and wallet.",
  },
] as const;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "₨2,500",
    blurb: "One branch · QR + kitchen",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₨6,000",
    blurb: "Deals, reviews, staff roles",
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₨15,000",
    blurb: "Groups · printers · support",
  },
] as const;

export function MarketingHome() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("owner");
  const [whatsapp, setWhatsapp] = useState("+923001234567");
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    planId: "pro",
    message: "",
  });

  useEffect(() => {
    void fetch(apiUrl("/api/leads"))
      .then((r) => r.json())
      .then((d) => {
        if (d.contactWhatsapp) setWhatsapp(d.contactWhatsapp);
      })
      .catch(() => undefined);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(apiUrl("/api/leads"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "contact" }),
    });
    if (res.ok) {
      setSent(true);
      setForm({ name: "", email: "", phone: "", restaurantName: "", planId: "pro", message: "" });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          ORDO
        </Link>
        <nav className={styles.navLinks}>
          <a href="#product">Product</a>
          <a href="#plans">Plans</a>
          <a href="#contact">Contact</a>
          <Link href="/lab">Lab</Link>
          <Link href="/login" className={styles.navCta}>
            Staff login
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroInner}>
          <p className={styles.heroBrand}>ORDO</p>
          <h1 className={styles.heroTitle}>Restaurant OS for every outlet — isolated by design.</h1>
          <p className={styles.heroSub}>
            Each kitchen gets its own login, menu, stock, staff, and guest QR — never mixed across restaurants.
          </p>
          <div className={styles.heroCtas}>
            <a href="#plans" className={styles.primary}>
              See plans
            </a>
            <Link href="/order?tenant=DEMO" className={styles.secondary}>
              Try guest demo
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden>
          <div className={styles.heroPanel}>
            <span>Live tickets</span>
            <strong>#1042 · Table 7</strong>
            <em>Preparing</em>
          </div>
        </div>
      </section>

      <section className={styles.section} id="product">
        <h2>Built like a restaurant, not a spreadsheet</h2>
        <p className={styles.lead}>
          WordPress-simple admin for restaurant owners. Staff app for the floor. Guest app for the table.
        </p>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className={styles.tabPanel}>
          <h3>{active.title}</h3>
          <p>{active.body}</p>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <h2>Multi-tenant by default</h2>
        <p className={styles.lead}>
          Tenant A’s logo prints on Tenant A’s receipts. Tenant B’s stock never appears in Tenant A’s Settings.
          Platform owner can open a restaurant to help — with a clear support badge, no restaurant password.
        </p>
        <ol className={styles.flow}>
          <li>Create restaurant + admin from owner control</li>
          <li>Brand menu, stock, staff, QR</li>
          <li>Guests order · staff run · reviews land</li>
        </ol>
      </section>

      <section className={styles.section} id="plans">
        <h2>Plans for Pakistan kitchens</h2>
        <p className={styles.lead}>Monthly PKR pricing. Upgrade when the team grows.</p>
        <div className={styles.plans}>
          {PLANS.map((p) => (
            <article key={p.id} className={"featured" in p && p.featured ? styles.planFeatured : styles.plan}>
              <h3>{p.name}</h3>
              <p className={styles.price}>
                {p.price}
                <span>/mo</span>
              </p>
              <p>{p.blurb}</p>
              <a
                href="#contact"
                className={styles.planCta}
                onClick={() => setForm((f) => ({ ...f, planId: p.id }))}
              >
                Request {p.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <h2>Printer package</h2>
        <p className={styles.lead}>
          Thermal ESC/POS wiring is on the roadmap. Today: browser receipt print with the restaurant’s own logo —
          never another tenant’s.
        </p>
      </section>

      <section className={styles.section} id="faq">
        <h2>FAQ</h2>
        <details className={styles.faq}>
          <summary>Can two restaurants share a menu?</summary>
          <p>No. Each restaurant is an isolated tenant with its own menu, stock, orders, and branding.</p>
        </details>
        <details className={styles.faq}>
          <summary>How do guests order?</summary>
          <p>Scan a table QR or open `/order?tenant=CODE` for pickup and delivery with the right payment choices.</p>
        </details>
        <details className={styles.faq}>
          <summary>Who runs the platform?</summary>
          <p>
            The platform owner uses a private control host (not on the restaurant site) to create restaurants and
            open them for support — without needing the restaurant password.
          </p>
        </details>
      </section>

      <section className={styles.sectionAlt} id="contact">
        <h2>Talk to ORDO</h2>
        <p className={styles.lead}>Plans and contact requests land in owner control → Leads.</p>
        {sent ? (
          <p className={styles.success}>Thanks — we received your request.</p>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <input
              required
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              placeholder="Restaurant name"
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
            />
            <select
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <textarea
              placeholder="Message"
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
            <button type="submit" className={styles.primary}>
              Send request
            </button>
          </form>
        )}
        <a
          className={styles.wa}
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp {whatsapp}
        </a>
      </section>

      <footer className={styles.footer}>
        <strong>ORDO</strong>
        <span>Multi-tenant restaurant OS</span>
        <Link href="/login">Staff login</Link>
      </footer>
    </div>
  );
}
