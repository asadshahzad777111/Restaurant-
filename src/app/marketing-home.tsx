"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { controlUrl } from "@/lib/urls";
import styles from "./marketing.module.css";

const NAV = [
  { href: "#company", label: "Company" },
  { href: "#products", label: "Products" },
  { href: "#os", label: "ORDO OS" },
  { href: "#shop", label: "Shop" },
  { href: "#insights", label: "Insights" },
  { href: "#about", label: "About" },
] as const;

const TABS = [
  {
    id: "owner",
    label: "Owner",
    kicker: "Owner command workspace",
    title: "See the floor without living in the kitchen",
    body: "Orders, staff permissions, and today’s picture sit in one restaurant login. Super Admin can open a kitchen to help — with a badge — without mixing Tenant A into Tenant B.",
    rows: [
      ["Orders", "Live view"],
      ["Tables", "Active"],
      ["Stock", "This kitchen only"],
      ["Daily picture", "Visible"],
    ],
    board: [
      ["Counter and QR orders", "One combined operations queue", "LIVE"],
      ["Kitchen progress", "Pending, ready, and service handoff", "SYNCED"],
      ["Guest tracking", "Ticket link stays with that order", "OPEN"],
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    kicker: "Department view",
    title: "Tickets that move with the pass",
    body: "Kitchen display updates as staff advance status. Dining, takeaway, and delivery stay labelled so the pass is not shouting across stations.",
    rows: [
      ["Dining", "Table on the ticket"],
      ["Takeaway", "Name on the rail"],
      ["Delivery", "Address on the run"],
      ["Handoff", "Ready when the pass is"],
    ],
    board: [
      ["Table order", "Items routed to the right station", "PREPARING"],
      ["Counter takeaway", "Source and items stay visible", "READY"],
      ["Service handoff", "Waiter or pickup shelf sees completed work", "CONNECTED"],
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    kicker: "Live stock ledger",
    title: "Stock that belongs to one restaurant only",
    body: "Ingredients, thresholds, and alerts live on that kitchen’s Settings. Another restaurant on ORDO never sees this ledger.",
    rows: [
      ["Low stock", "Owner alert"],
      ["Menu", "Same catalog as POS"],
      ["Isolation", "No shared lists"],
      ["Usage", "Tied to completed tickets"],
    ],
    board: [
      ["Ingredient stock", "Opening, added, consumed, closing", "HEALTHY"],
      ["Low-stock attention", "Threshold-based owner notification", "ACTION"],
      ["Recipes and usage", "Completed orders update movement", "LINKED"],
    ],
  },
  {
    id: "counter",
    label: "Counter",
    kicker: "Pay rules",
    title: "Payment choices guests already understand",
    body: "Dining is pay at counter. Takeaway is counter or paid in advance (recorded — no fake card SDK). Delivery is COD or paid in advance. POS records cash, card, and wallet.",
    rows: [
      ["Dining", "Pay at counter"],
      ["Takeaway", "Counter or recorded advance"],
      ["Delivery", "COD or recorded advance"],
      ["POS", "Cash, card, wallet marks"],
    ],
    board: [
      ["Cash", "Separated on the ticket", "RECORDED"],
      ["Wallet", "Marked after you take it", "TRACKED"],
      ["Card", "A record, not a fake gateway", "NOTED"],
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
    body: "58mm browser bill: shop name, items, qty, rates, totals, and footer. Thermal hardware is a quoted add-on — not a fake Windows driver.",
  },
] as const;

const FLOW = [
  { step: "01", title: "Order", body: "Guest menu, table QR, or counter POS enters one kitchen queue." },
  { step: "02", title: "Prepare", body: "Kitchen work is routed and tracked through preparation." },
  { step: "03", title: "Handoff", body: "Ready for the pass, pickup shelf, or delivery run." },
  { step: "04", title: "Record", body: "Pay method stays on the ticket. Stock alerts stay on that tenant." },
  { step: "05", title: "Understand", body: "Guest tracking stays live. Completed tickets can take a review." },
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
] as const;

const PRINCIPLES = [
  {
    n: "01",
    title: "Practical before complicated",
    body: "Technology should reduce operational weight, not add another layer of confusion. Phones and laptops you already own are enough.",
  },
  {
    n: "02",
    title: "Isolated by default",
    body: "Every kitchen is its own tenant. Menu, stock, orders, logo, and reviews never cross. Help from Super still shows a badge.",
  },
  {
    n: "03",
    title: "Built with local reality",
    body: "PKR on the page, mixed dining / takeaway / delivery, WhatsApp for quotes, and an honest internet requirement — no offline magic.",
  },
] as const;

const OUTCOMES = [
  {
    kicker: "Control",
    title: "See what is happening now.",
    body: "Owners follow active orders, preparation, stock attention, and the daily picture from the same operating workspace.",
  },
  {
    kicker: "Clarity",
    title: "Keep every team on the same truth.",
    body: "Owner, chef, and counter views use the same order data while showing each role only the work it needs.",
  },
  {
    kicker: "Continuity",
    title: "Carry work into the business record.",
    body: "A completed ticket can update tracking, reviews, and stock alerts without a second list that drifts from the floor.",
  },
] as const;

export function MarketingHome() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("owner");
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [whatsapp, setWhatsapp] = useState("+923039227000");
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
    const saved = window.localStorage.getItem("ordo-marketing-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    void fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => {
        if (d.contactWhatsapp) setWhatsapp(d.contactWhatsapp);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 1100) setMenuOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const active = TABS.find((t) => t.id === tab)!;
  const waDigits = whatsapp.replace(/\D/g, "");

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      window.localStorage.setItem("ordo-marketing-theme", next);
      return next;
    });
  }

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

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className={styles.page} data-theme={theme}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand} onClick={closeMenu}>
            <span className={styles.navMark} aria-hidden>
              O
            </span>
            ORDO
          </Link>

          <nav className={styles.navCenter} aria-label="Primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              title={theme === "light" ? "Dark" : "Light"}
            >
              {theme === "light" ? "☽" : "☀"}
            </button>
            <Link href="/login" className={styles.navOutline}>
              Admin Login
            </Link>
            <a href="#contact" className={styles.navSolid}>
              Talk to ORDO
            </a>
          </div>

          <div className={styles.navMobileBtns}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? "☽" : "☀"}
            </button>
            <button
              type="button"
              className={menuOpen ? `${styles.navBurger} ${styles.navBurgerOpen}` : styles.navBurger}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className={styles.navDrawer}>
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <Link href="/login" className={styles.navOutline} onClick={closeMenu}>
              Admin Login
            </Link>
            <a href="#contact" className={styles.navSolid} onClick={closeMenu}>
              Talk to ORDO
            </a>
          </div>
        ) : null}
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>A restaurant technology company</p>
          <h1 className={styles.heroTitle}>
            Digital systems built for <em>real kitchens.</em>
          </h1>
          <p className={styles.heroSub}>
            ORDO creates connected products that turn guest orders, the pass, and the counter into one
            operating system — isolated per restaurant, priced in PKR, ready to try without an account.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/order?tenant=DEMO" className={styles.primary}>
              Open live demo
            </Link>
            <Link href="/scan" className={styles.secondary}>
              Scan a table
            </Link>
            <a href="#shop" className={styles.ghost}>
              From ₨999 / month
            </a>
          </div>
          <ul className={styles.chips}>
            <li>Flagship product live</li>
            <li>Built for Pakistan</li>
            <li>Browser-first systems</li>
          </ul>
        </div>

        <div className={styles.heroPreview} aria-label="ORDO live workspace preview">
          <div className={styles.laptop}>
            <div className={styles.laptopChrome}>
              <span className={styles.dots} aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <strong>ORDO OS</strong>
              <em>System connected</em>
            </div>
            <div className={styles.workspace}>
              <div className={styles.wsHead}>
                <div>
                  <span>Operations overview</span>
                  <strong>LIVE WORKSPACE</strong>
                </div>
                <b className={styles.liveDot}>LIVE</b>
              </div>
              <div className={styles.wsPills}>
                <article>
                  <span>Orders</span>
                  <strong>Live flow</strong>
                </article>
                <article>
                  <span>Kitchen</span>
                  <strong>Connected</strong>
                </article>
                <article>
                  <span>Accounts</span>
                  <strong>Synced</strong>
                </article>
              </div>
              <div className={styles.wsSplit}>
                <div className={styles.wsTickets}>
                  <article>
                    <span>Dining · T7</span>
                    <strong>Karahi + naan</strong>
                    <small>Preparing</small>
                  </article>
                  <article>
                    <span>Takeaway · Ayesha</span>
                    <strong>Seekh + chai</strong>
                    <small>Ready</small>
                  </article>
                </div>
                <div className={styles.wsRows}>
                  <div>
                    <span>Customer order</span>
                    <p>Menu and counter channels</p>
                    <em>Received</em>
                  </div>
                  <div>
                    <span>Kitchen production</span>
                    <p>Station-aware ticket rail</p>
                    <em>In sync</em>
                  </div>
                  <div>
                    <span>Stock movement</span>
                    <p>This kitchen’s ledger only</p>
                    <em>Tracked</em>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.band} id="demo">
        <div className={styles.wrap}>
          <div className={styles.demoCard}>
            <div>
              <p className={styles.kicker}>Live Demo Kitchen</p>
              <h2>Try the guest path. No account needed.</h2>
              <p>
                Open Demo Kitchen as a guest: dining, pickup, delivery, and table QR scan. Staff tools stay
                behind Admin Login. This is a real isolated tenant — not a video.
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
            <ul className={styles.demoStats}>
              <li>
                <strong>DEMO</strong>
                <span>Restaurant code</span>
              </li>
              <li>
                <strong>/scan</strong>
                <span>QR or paste</span>
              </li>
              <li>
                <strong>PKR</strong>
                <span>On the page</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section} id="company">
        <div className={styles.wrap}>
          <p className={styles.kicker}>The company</p>
          <h2>We build the layer that makes kitchen work make sense.</h2>
          <p className={styles.leadWide}>
            ORDO is bigger than a billing screen. We design practical digital systems around the way kitchens
            actually operate: people, tickets, payments, stock, and decisions — connected inside one restaurant,
            never scattered across someone else’s.
          </p>
          <div className={styles.principles}>
            {PRINCIPLES.map((item) => (
              <article key={item.n}>
                <span>{item.n}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="products">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Product portfolio</p>
          <h2>One company. Products with a clear purpose.</h2>
          <p className={styles.lead}>
            ORDO OS is our live flagship. The company can grow without turning ORDO itself into the name of a
            single button on a till.
          </p>
          <article className={styles.flagship}>
            <div>
              <p className={styles.kicker}>Live flagship product</p>
              <h3>ORDO OS</h3>
              <p>
                A connected restaurant operating system that follows work from the first guest order to the
                ticket on the pass — isolated per kitchen.
              </p>
              <ul>
                <li>Customer ordering and counter checkout</li>
                <li>Kitchen, waiter, and delivery workflows</li>
                <li>Inventory alerts and menu sync</li>
                <li>Guest tracking, reviews, and Super Admin for groups</li>
              </ul>
              <div className={styles.heroCtas}>
                <a href="#os" className={styles.primary}>
                  View ORDO OS
                </a>
                <a href="#shop" className={styles.secondary}>
                  Plans
                </a>
              </div>
            </div>
            <div className={styles.modules}>
              {MODULES.map((m) => (
                <article key={m.title}>
                  <h3>{m.title}</h3>
                  <p>{m.body}</p>
                </article>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className={styles.section} id="os">
        <div className={styles.wrap}>
          <p className={styles.kicker}>ORDO OS</p>
          <h2>Same data. Different work.</h2>
          <p className={styles.lead}>
            Owner, kitchen, inventory, and counter see one queue. Guests never see cost price or another
            restaurant’s logo.
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
              <div className={styles.roleStats}>
                {active.rows.map((row) => (
                  <div key={row[0]}>
                    <span>{row[0]}</span>
                    <strong>{row[1]}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.roleBoard}>
              {active.board.map((row) => (
                <div key={row[0]}>
                  <div>
                    <strong>{row[0]}</strong>
                    <p>{row[1]}</p>
                  </div>
                  <em>{row[2]}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="shop">
        <div className={styles.wrap}>
          <p className={styles.kicker}>ORDO shop</p>
          <h2>Software and a 58mm thermal printer, on a monthly package.</h2>
          <p className={styles.lead}>
            Launch pricing for Pakistan kitchens. Month to month. No per-order cut. Confirm ORDO OS plus a
            compact POS-58 printer on WhatsApp — no fake checkout on this page.
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

          <div className={styles.printBox} id="print">
            <div className={styles.printVisual}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/thermal-printer.svg"
                alt="Compact 58mm thermal receipt printer for ORDO POS"
                width={480}
                height={420}
              />
              <p>POS-58 · 58mm thermal</p>
            </div>
            <div>
              <p className={styles.kicker}>ORDO + printer package</p>
              <h3>POS software and a 58mm thermal printer, with a monthly plan.</h3>
              <p>
                Sell the counter and the paper together: ORDO OS (guest QR, POS, kitchen tickets) plus a
                compact 58mm thermal receipt printer. Browser print is included on every plan. Hardware is
                confirmed on WhatsApp — model, paper width, and delivery — with Starter ₨999, Pro ₨1,999, or
                Enterprise ₨4,499 per month.
              </p>
              <ul className={styles.printIncluded}>
                <li>ORDO OS on the plan you pick — isolated per kitchen.</li>
                <li>58mm thermal receipt layout: name, items, qty, rates, totals, footer.</li>
                <li>Quoted compact ESC/POS printer (POS-58 class) when you want paper at the counter.</li>
                <li>Setup guidance for the printer and the software workflow.</li>
              </ul>
              <p className={styles.printNote}>
                Any phone in product pictures demonstrates ORDO OS. It is not included in a printer package
                unless we agree separately.
              </p>
              <a href="#contact" className={styles.planCta} style={{ display: "inline-flex", width: "auto" }}>
                Request POS + printer quote
              </a>
            </div>
          </div>
          <div className={styles.printSteps}>
            <article>
              <span>01</span>
              <h3>Details</h3>
              <p>Name, city, paper width, and whether you already own a printer.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Quote</h3>
              <p>WhatsApp confirms monthly plan + hardware, if any.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Confirmation</h3>
              <p>Confirm software, delivery, and onboarding before anything ships.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <p className={styles.kicker}>Connected operations</p>
          <h2>One order becomes one continuous kitchen record.</h2>
          <p className={styles.lead}>
            ORDO OS is not only a POS interface. Each operational stage updates the next part of the workflow.
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
        </div>
      </section>

      <section className={styles.sectionSoft}>
        <div className={styles.wrap}>
          <p className={styles.kicker}>Why the system matters</p>
          <h2>Designed around outcomes, not a list of buttons.</h2>
          <div className={styles.outcomes}>
            {OUTCOMES.map((item) => (
              <article key={item.kicker}>
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="pakistan">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Built for Pakistan</p>
          <h2>Technology shaped by the way local kitchens actually work.</h2>
          <p className={styles.leadWide}>
            ORDO OS is designed around practical devices, live internet, PKR, and mixed counter, cash, wallet,
            kitchen, and delivery workflows common in local food businesses.
          </p>
          <ul className={styles.localList}>
            <li>
              <strong>Use familiar devices</strong>
              Run compatible workflows from phones, tablets, and computers without proprietary POS hardware.
            </li>
            <li>
              <strong>Lightweight web operation</strong>
              A browser-first interface designed to stay practical on everyday networks and screens.
            </li>
            <li>
              <strong>Local payment reality</strong>
              Keep cash, wallet, or card records separated on the ticket — recorded after you take the money.
            </li>
            <li>
              <strong>Isolation you can explain</strong>
              Super Admin can create many kitchens. Each still keeps its own menu, stock, and logo.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionSoft} id="insights">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Insights</p>
          <h2>Understand the product, the thinking, and the company.</h2>
          <p className={styles.lead}>
            Clear first-party answers help kitchens — and search — understand exactly what ORDO builds.
          </p>
          <div className={styles.explore}>
            <a href="#os">
              <span>ORDO OS</span>
              <strong>Connected order, kitchen, inventory, and counter capabilities.</strong>
              <em>Explore product</em>
            </a>
            <a href="#about">
              <span>About ORDO</span>
              <strong>Company principles, isolation, and how Super Admin stays out of the guest path.</strong>
              <em>Company profile</em>
            </a>
            <a href="#contact">
              <span>Talk to the team</span>
              <strong>Discuss workflow, onboarding, and the right ORDO OS setup.</strong>
              <em>Contact ORDO</em>
            </a>
          </div>
          <h3 className={styles.faqHeading}>Frequently asked questions</h3>
          <div className={styles.faqs}>
            {FAQS.map((item) => (
              <details key={item.q} className={styles.faq}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} id="about">
        <div className={styles.wrap}>
          <p className={styles.kicker}>About</p>
          <h2>ORDO is the brand. ORDO OS is the live kitchen product.</h2>
          <p className={styles.leadWide}>
            We are a product company for restaurants that already run mixed dining, takeaway, and delivery. The
            public site is a demo of the guest path. Staff login is for kitchens you already operate. Super Admin
            is unlisted — it creates isolated restaurants; it is not a third public app.
          </p>
          <div className={styles.aboutGrid}>
            <article>
              <span>Brand</span>
              <h3>ORDO</h3>
              <p>Master product brand for connected kitchen systems.</p>
            </article>
            <article>
              <span>Flagship</span>
              <h3>ORDO OS</h3>
              <p>Restaurant management OS. Live today, isolated per tenant.</p>
            </article>
            <article>
              <span>Access</span>
              <h3>Admin Login</h3>
              <p>Staff login is on this site. Platform HQ is on control.asfins.com, not in this nav.</p>
            </article>
            <article>
              <span>Promise</span>
              <h3>Isolation</h3>
              <p>Tenant A never prints Tenant B’s name. That is the product, not a slogan.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="contact">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Start a conversation</p>
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
                <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
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
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerRow}>
            <strong>ORDO</strong>
            <span>Restaurant OS · isolated tenants</span>
            <nav>
              <Link href="/order?tenant=DEMO">Demo</Link>
              <Link href="/scan">Scan</Link>
              <Link href="/login">Admin</Link>
              <a href={controlUrl()} className={styles.footerQuiet}>
                HQ
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
