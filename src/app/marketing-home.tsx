"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./marketing.module.css";

const TABS = [
  {
    id: "owner",
    label: "Owner",
    kicker: "Live workspace",
    title: "See the floor without living in the kitchen",
    body: "Orders, staff permissions, and today’s picture sit in one restaurant login. Super Admin can Open a kitchen to help — with a badge — without mixing Tenant A into Tenant B.",
    rows: [
      ["Orders", "Live queue"],
      ["Staff", "Roles gated"],
      ["Stock", "This kitchen only"],
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    kicker: "Ticket rail",
    title: "Tickets that move with the pass",
    body: "Kitchen display updates as staff advance status. Dining, takeaway, and delivery stay labelled so the pass is not shouting across stations.",
    rows: [
      ["Dining", "Table on the ticket"],
      ["Takeaway", "Name on the rail"],
      ["Delivery", "Address stays with the run"],
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    kicker: "Stock ledger",
    title: "Stock that belongs to one restaurant only",
    body: "Ingredients, thresholds, and alerts live on that kitchen’s Settings. Another restaurant on ORDO never sees this ledger.",
    rows: [
      ["Low stock", "Owner alert"],
      ["Menu", "Same catalog as POS"],
      ["Isolation", "No shared lists"],
    ],
  },
  {
    id: "finance",
    label: "Counter",
    kicker: "Pay rules",
    title: "Payment choices guests already understand",
    body: "Dining is pay at counter. Takeaway is counter or paid in advance (recorded — no fake card SDK). Delivery is COD or paid in advance. POS records cash, card, and wallet.",
    rows: [
      ["Dining", "Pay at counter"],
      ["Takeaway", "Counter or recorded advance"],
      ["Delivery", "COD or recorded advance"],
    ],
  },
] as const;

const MODULES = [
  {
    title: "Guest order",
    body: "Public menu, cart, and checkout for dining, takeaway, and delivery. Guests track the ticket, then leave a review after staff mark it complete.",
  },
  {
    title: "QR / scanner",
    body: "Table QR opens the right kitchen and table. Camera scan on Chromium + HTTPS; paste or restaurant code always works.",
  },
  {
    title: "Staff POS",
    body: "Counter sale on phone, tablet, or laptop. Same catalog as the public menu — no second list that drifts.",
  },
  {
    title: "Kitchen display",
    body: "One queue for guest and counter tickets. Status moves from placed to ready without a separate app install.",
  },
  {
    title: "Menu sync",
    body: "Staff add, hide, or price an item in Menu. Guests see that catalog. Cost fields stay off the public page.",
  },
  {
    title: "Receipts",
    body: "58mm browser bill: shop name, items, qty, rates, totals, and footer. Tick animation after a successful print. Thermal hardware is a quoted add-on — not a fake Windows driver.",
  },
] as const;

const FLOW = [
  { step: "01", title: "Order", body: "Guest QR, guest code, or counter POS enters one kitchen queue." },
  { step: "02", title: "Prepare", body: "Kitchen tickets show source, table or address, and items." },
  { step: "03", title: "Handoff", body: "Ready for the pass, pickup shelf, or delivery run." },
  { step: "04", title: "Record", body: "Pay method stays on the ticket. Stock alerts stay on that tenant." },
  { step: "05", title: "Review", body: "Guest tracking link stays live. Completed tickets can take a review." },
] as const;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "₨999",
    blurb: "One kitchen. Start here.",
    features: [
      "Guest dining, takeaway, delivery",
      "QR / scan + restaurant code",
      "Counter POS + kitchen tickets",
      "Menu in sync with POS",
      "Browser receipts",
      "Up to 5 staff",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₨1,999",
    blurb: "Roles, stock, reviews.",
    featured: true,
    features: [
      "Everything in Starter",
      "Staff roles & permissions",
      "Stock alerts",
      "Guest tracking + reviews",
      "Receipt branding",
      "Up to 15 staff",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "₨4,499",
    blurb: "Several kitchens. Printer quote.",
    features: [
      "Everything in Pro",
      "Super Admin create / suspend",
      "Open a kitchen to help",
      "Thermal printer package on request",
      "Priority onboarding",
      "Up to 40 staff",
    ],
  },
] as const;

const FAQS = [
  {
    q: "What is ORDO?",
    a: "ORDO is a restaurant operating system: guest ordering, counter POS, kitchen tickets, menu, stock, and Super Admin for many kitchens. Counter checkout is one part — not the whole product.",
  },
  {
    q: "Is this only a POS?",
    a: "No. Guests order from /guest or /scan. Staff run POS, kitchen, menu, and settings. Super Admin creates isolated restaurants. POS is the counter, not the company.",
  },
  {
    q: "Do two restaurants share a menu?",
    a: "No. Each kitchen is a tenant. Menu, stock, orders, logo, and reviews never cross. Tenant A’s receipt never prints Tenant B’s name.",
  },
  {
    q: "How do guests order?",
    a: "Scan a table QR, enter a restaurant code on /guest, or open /order?tenant=CODE. Dining needs a table and pays at the counter. Takeaway and delivery use the pay rules that kitchen already runs.",
  },
  {
    q: "Do you charge per order?",
    a: "No per-order fee on these plans. Monthly PKR, no annual lock-in. Hardware printers are quoted separately if you want thermal paper.",
  },
  {
    q: "Do I need a special POS machine?",
    a: "No proprietary terminal. Browser-first on phones, tablets, and laptops you already have. Live ordering needs internet.",
  },
  {
    q: "Does it work offline?",
    a: "No. ORDO is a live system. An active connection is required for orders and sync — same honesty as other cloud restaurant OS tools.",
  },
  {
    q: "Is JazzCash or a card gateway included?",
    a: "Not in this release. Paid in advance is a recorded status, not a fake checkout SDK. Counter POS can mark cash, card, or wallet after you take the money in the real world.",
  },
  {
    q: "Where do I get the Android APKs?",
    a: "Only from Super → Apps after you are a restaurant on ORDO. Staff APK (POS, billing, kitchen, staff) and Customer APK (dining, pickup, delivery, QR scan) are not on this public demo page, so random visitors cannot install them.",
  },
] as const;

export function MarketingHome() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("owner");
  const [menuOpen, setMenuOpen] = useState(false);
  const [whatsapp, setWhatsapp] = useState("+923001234567");
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    planId: "starter",
    message: "",
  });

  useEffect(() => {
    void fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => {
        if (d.contactWhatsapp) setWhatsapp(d.contactWhatsapp);
      })
      .catch(() => undefined);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;
  const waDigits = whatsapp.replace(/\D/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "contact" }),
    });
    if (res.ok) {
      setSent(true);
      setForm({ name: "", email: "", phone: "", restaurantName: "", planId: "starter", message: "" });
    }
  }

  function pickPlan(id: string) {
    setForm((f) => ({ ...f, planId: id }));
    setMenuOpen(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          ORDO
        </Link>
        <button
          type="button"
          className={styles.navBurger}
          aria-expanded={menuOpen}
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          Menu
        </button>
        <nav className={menuOpen ? styles.navLinksOpen : styles.navLinks}>
          <a href="#product" onClick={() => setMenuOpen(false)}>
            Product
          </a>
          <a href="#flow" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#plans" onClick={() => setMenuOpen(false)}>
            Plans
          </a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>
            FAQ
          </a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>
          <Link href="/guest" onClick={() => setMenuOpen(false)}>
            Guest order
          </Link>
          <Link href="/login" className={styles.navCta} onClick={() => setMenuOpen(false)}>
            Staff login
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Restaurant OS · Pakistan</p>
          <h1 className={styles.heroTitle}>One kitchen. One truth. From the QR to the ticket rail.</h1>
          <p className={styles.heroSub}>
            ORDO is a connected restaurant OS — guest order, counter, kitchen, menu, stock — isolated per
            restaurant. Prices stay on this page. The Demo Kitchen is a real tenant, not a video.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/order?tenant=DEMO" className={styles.primary}>
              Open live demo
            </Link>
            <Link href="/scan" className={styles.secondary}>
              Scan / enter code
            </Link>
            <a href="#plans" className={styles.ghost}>
              From ₨999 / month
            </a>
          </div>
          <ul className={styles.chips}>
            <li>Browser-first</li>
            <li>No per-order fee</li>
            <li>No lock-in</li>
            <li>PKR, on the page</li>
          </ul>
        </div>
        <div className={styles.heroVisual} aria-hidden>
          <div className={styles.workspace}>
            <div className={styles.workspaceHead}>
              <span>Demo Kitchen</span>
              <em>LIVE</em>
            </div>
            <div className={styles.workspaceGrid}>
              <article>
                <span>Guest</span>
                <strong>Dining · T7</strong>
                <small>Pay at counter</small>
              </article>
              <article>
                <span>Kitchen</span>
                <strong>Preparing</strong>
                <small>Same ticket</small>
              </article>
              <article>
                <span>POS</span>
                <strong>Cash recorded</strong>
                <small>This tenant only</small>
              </article>
              <article>
                <span>Track</span>
                <strong>Guest link</strong>
                <small>Then review</small>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.demoBand} id="demo">
        <div className={styles.demoCard}>
          <div>
            <p className={styles.kicker}>ordo.asfins.com</p>
            <h2>Live demo. No account needed.</h2>
            <p>
              Open Demo Kitchen as a guest: dining, pickup, delivery, cash on delivery, and table QR scan. Staff tools
              stay behind login. Android APKs are not here — Super hands those to restaurants only.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/order?tenant=DEMO" className={styles.primary}>
                Open live demo
              </Link>
              <Link href="/scan" className={styles.secondary}>
                Try table scanner
              </Link>
            </div>
          </div>
          <div>
            <p className={styles.kicker}>Browser preview</p>
            <p>Same guest path the Customer APK opens. Camera scan needs Chrome/Edge on HTTPS; paste always works.</p>
          </div>
        </div>
      </section>

      <section className={styles.section} id="apps">
        <p className={styles.kicker}>Two apps · Super only</p>
        <h2>How the APKs look — download is not on this page</h2>
        <p className={styles.lead}>
          Public visitors see a preview. Real install files live in Super → Apps, never on this demo home.
        </p>
        <div className={styles.phones}>
          <article className={styles.phone}>
            <span>Staff APK</span>
            <h3>Floor: POS, billing, kitchen, staff</h3>
            <ul>
              <li>Login with restaurant code</li>
              <li>POS + orders + kitchen tickets</li>
              <li>Menu, stock, staff roles</li>
              <li>Not the Super control panel</li>
            </ul>
            <p className={styles.phoneNote}>Install: Super login only.</p>
          </article>
          <article className={styles.phone}>
            <span>Customer APK</span>
            <h3>Dining, pickup, delivery, QR</h3>
            <ul>
              <li>Scan table QR for dine-in</li>
              <li>Pickup or pay at counter</li>
              <li>Delivery + cash on delivery</li>
              <li>Track ticket, then review</li>
            </ul>
            <p className={styles.phoneNote}>Install: Super login only.</p>
          </article>
        </div>
      </section>

      <section className={styles.principles}>
        <h2 className={styles.srOnly}>Why ORDO</h2>
        <div className={styles.principleGrid}>
          <article>
            <span>01</span>
            <h3>Practical before complicated</h3>
            <p>Phones and laptops you already own. No proprietary POS box required.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Connected by design</h3>
            <p>Guest, counter, and kitchen share one order. Menu is one catalog.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Honest about what ships</h3>
            <p>Live demo, real pay rules, real isolation. No fake gateways. Printer hardware is quoted, not pretended.</p>
          </article>
        </div>
      </section>

      <section className={styles.section} id="product">
        <p className={styles.kicker}>Product</p>
        <h2>What the public kitchen actually runs</h2>
        <p className={styles.lead}>
          Built from the restaurant brief: guest website, staff counter, kitchen tickets, menu sync, and
          receipts — not a billing screen with extra labels.
        </p>
        <div className={styles.modules}>
          {MODULES.map((m) => (
            <article key={m.title}>
              <h3>{m.title}</h3>
              <p>{m.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <p className={styles.kicker}>Roles</p>
        <h2>Same data. Different work.</h2>
        <p className={styles.lead}>
          Owner, chef, and counter see one queue. Guests never see cost price or another restaurant’s logo.
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
        <div className={styles.roleSplit}>
          <div className={styles.tabPanel}>
            <p className={styles.roleKicker}>{active.kicker}</p>
            <h3>{active.title}</h3>
            <p>{active.body}</p>
          </div>
          <div className={styles.roleBoard}>
            {active.rows.map((row) => (
              <div key={row[0]}>
                <span>{row[0]}</span>
                <strong>{row[1]}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="flow">
        <p className={styles.kicker}>How work moves</p>
        <h2>One order becomes one record</h2>
        <p className={styles.lead}>
          Not a pile of apps. Each stage updates the next — guest ticket, kitchen, handoff, pay mark, review.
        </p>
        <ol className={styles.timeline}>
          {FLOW.map((f) => (
            <li key={f.step}>
              <em>{f.step}</em>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.sectionAlt} id="pakistan">
        <p className={styles.kicker}>Built for local kitchens</p>
        <h2>PKR, mixed service, everyday devices</h2>
        <p className={styles.lead}>
          Dining, takeaway, and delivery on the same tenant. Cash, card, and wallet as records at the counter.
          English UI, Pakistan pricing, WhatsApp for onboarding.
        </p>
        <ul className={styles.localList}>
          <li>Use the phone or laptop already on the counter.</li>
          <li>Guest QR on the table; code entry if the camera is blocked.</li>
          <li>Super Admin for groups — each kitchen still isolated.</li>
          <li>Internet required for live orders. We do not claim offline magic.</li>
        </ul>
      </section>

      <section className={styles.section} id="plans">
        <p className={styles.kicker}>Plans</p>
        <h2>Start low. Grow when the floor is busy.</h2>
        <p className={styles.lead}>
          Launch pricing for Pakistan kitchens. Month to month. No per-order cut. Printer paper is extra only if
          you want a thermal kit.
        </p>
        <div className={styles.plans}>
          {PLANS.map((p) => (
            <article key={p.id} className={"featured" in p && p.featured ? styles.planFeatured : styles.plan}>
              {"featured" in p && p.featured ? <p className={styles.planBadge}>Most kitchens</p> : null}
              <h3>{p.name}</h3>
              <p className={styles.price}>
                {p.price}
                <span>/mo</span>
              </p>
              <p>{p.blurb}</p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a href="#contact" className={styles.planCta} onClick={() => pickPlan(p.id)}>
                Request {p.name}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionAlt} id="print">
        <p className={styles.kicker}>Printer package</p>
        <h2>Software first. Hardware only if you ask.</h2>
        <p className={styles.lead}>
          Browser receipt print is included — 58mm layout with that restaurant’s name, items, qty, rates,
          totals, and footer. Compact thermal hardware (ESC/POS) is a quoted add-on: we confirm model, paper
          width, and delivery on WhatsApp. No fake Windows kernel driver.
        </p>
        <div className={styles.printSteps}>
          <article>
            <span>01</span>
            <h3>Details</h3>
            <p>City, paper width, and whether you already own a printer.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Quote</h3>
            <p>Software plan + hardware, if any, confirmed on WhatsApp.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Setup</h3>
            <p>Onboarding for guest QR, staff logins, and the first ticket.</p>
          </article>
        </div>
      </section>

      <section className={styles.section} id="faq">
        <p className={styles.kicker}>Questions</p>
        <h2>Clear answers</h2>
        <div className={styles.faqs}>
        {FAQS.map((item) => (
          <details key={item.q} className={styles.faq}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
        </div>
      </section>

      <section className={styles.sectionAlt} id="contact">
        <p className={styles.kicker}>Start</p>
        <h2>Talk to ORDO</h2>
        <p className={styles.lead}>
          Requests land in Super → Leads. Try Demo Kitchen first if you only want to click the guest path.
        </p>
        <div className={styles.contactGrid}>
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
                placeholder="Phone / WhatsApp"
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
                <option value="starter">Starter · ₨999</option>
                <option value="pro">Pro · ₨1,999</option>
                <option value="enterprise">Enterprise · ₨4,499</option>
              </select>
              <textarea
                placeholder="City, dine-in / takeaway / delivery, printer yes or no"
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <button type="submit" className={styles.primary}>
                Send request
              </button>
            </form>
          )}
          <aside className={styles.contactAside}>
            <p>Prefer WhatsApp? Same conversation we use for quotes.</p>
            <a className={styles.wa} href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
              WhatsApp {whatsapp}
            </a>
            <Link href="/order?tenant=DEMO" className={styles.secondary}>
              Skip the form — open demo
            </Link>
            <Link href="/login" className={styles.ghost}>
              Existing kitchen login
            </Link>
          </aside>
        </div>
      </section>

      <footer className={styles.footer}>
        <strong>ORDO</strong>
        <span>Restaurant OS · isolated tenants</span>
        <Link href="/guest">Guest</Link>
        <Link href="/scan">Scan</Link>
        <Link href="/login">Staff</Link>
      </footer>
    </div>
  );
}
