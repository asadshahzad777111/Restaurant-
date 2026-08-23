"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { controlUrl } from "@/lib/urls";
import { useCountUp } from "@/lib/use-count-up";
import {
  listContainer,
  listItem,
  pageEnter,
  sectionEnter,
  useIsCoarsePointer,
  usePrefersReducedMotion,
  viewOnce,
} from "@/lib/motion";
import styles from "./marketing.module.css";

/** Animated plan price — counts up when the card scrolls into view. */
function PlanPrice({ amount, prefix = "₨" }: { amount: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const val = useCountUp(inView ? amount : 0, 900);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString()}
    </span>
  );
}

/** Real-facts counter — counts up when scrolled into view. */
function FactCounter({
  value,
  prefix = "",
  suffix = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const val = useCountUp(inView ? value : 0, 1000);
  return (
    <span ref={ref}>
      {prefix}
      {val}
      {suffix}
    </span>
  );
}

/** Round theme toggle switch — knob swipes forward (dark) / backward (light). */
function ThemeSwitch({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`${styles.themeSwitch}${isDark ? ` ${styles.themeSwitchDark}` : ""}`}
      onClick={onToggle}
    >
      <span className={styles.themeIconLeft} aria-hidden>
        ☀
      </span>
      <span className={styles.themeIconRight} aria-hidden>
        ☾
      </span>
      <span className={styles.themeKnob} aria-hidden />
    </button>
  );
}

const NAV = [
  { href: "#company", label: "Company" },
  { href: "#products", label: "Products" },
  { href: "#tour", label: "Tour" },
  { href: "#plans", label: "Plans" },
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

const TESTIMONIALS = [
  {
    quote:
      "Pehli raat hi 14 orders QR se aaye — kitchen par sound alert ke saath. Ab register aur call lene ka jhanjhat khatam.",
    name: "Usman R.",
    role: "Owner · Karahi House, Lahore",
    stars: 5,
  },
  {
    quote:
      "Menu ek jagah update karo, guest aur POS dono par turant aa jata hai. 58mm bill bilkul asli dukaan jaisa print hota hai.",
    name: "Ayesha K.",
    role: "Manager · Cafe 66, Islamabad",
    stars: 5,
  },
  {
    quote:
      "Delivery, takeaway, table — teeno ka alag flow. Voids alag count hote hain, day close 2 minute mein ho jata hai.",
    name: "Bilal S.",
    role: "Owner · Burger Lab, Karachi",
    stars: 5,
  },
] as const;

const COMPARE: Array<[string, boolean, boolean]> = [
  ["Guest QR ordering (table / takeaway / delivery)", true, false],
  ["Kitchen display with new-order sound alert", true, false],
  ["Stock low / 86 auto-blocks", true, false],
  ["58mm thermal receipts with branding", true, false],
  ["Sales & profit reports, day close", true, false],
  ["Each kitchen isolated — data never mixes", true, false],
];

const FACTS = [
  { value: 999, prefix: "₨", suffix: "", label: "Starting price per month" },
  { value: 58, prefix: "", suffix: "mm", label: "Thermal receipt width" },
  { value: 24, prefix: "", suffix: "/7", label: "Cloud availability" },
  { value: 100, prefix: "", suffix: "%", label: "Browser-first, no POS machine" },
];

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
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
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
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const enter = pageEnter(reduced, coarse);
  const section = sectionEnter(reduced);
  const item = listItem(reduced, coarse);

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

  // Next-level: scroll progress + sticky nav elevation
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setScrolled(window.scrollY > 10);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Next-level: soft mouse-follow glow (fine pointers only)
  const glowRef = useRef<HTMLDivElement>(null);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = glowRef.current;
    if (!el) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, []);

  // Hide the WhatsApp float while the contact section is on screen
  const contactRef = useRef<HTMLElement>(null);
  const contactInView = useInView(contactRef, { amount: 0.25 });

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
    <div
      className={styles.page}
      data-theme={theme}
      data-marketing-page
      onMouseMove={onMouseMove}
    >
      <div ref={glowRef} className={styles.mouseGlow} aria-hidden />
      <div className={styles.scrollProgress} style={{ width: `${progress * 100}%` }} aria-hidden />
      <header className={scrolled ? `${styles.nav} ${styles.navScrolled}` : styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand} onClick={closeMenu} aria-label="ORDO home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme === "dark" ? "/ordo-logo-on-dark.svg" : "/ordo-logo.svg"}
              alt="ORDO"
              className={styles.navLogo}
              height={36}
              width={158}
            />
          </Link>

          <nav className={styles.navCenter} aria-label="Primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.navActions}>
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            <Link href="/login" className={styles.navOutline}>
              Admin Login
            </Link>
            <a href="#contact" className={styles.navSolid}>
              Talk to ORDO
            </a>
          </div>

          <div className={styles.navMobileBtns}>
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
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

        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              key="nav-drawer"
              className={styles.navDrawer}
              style={{ display: "flex" }}
              initial={reduced || coarse ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduced || coarse ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduced || coarse ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduced || coarse ? 0.16 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow1} aria-hidden />
        <div className={styles.heroGlow2} aria-hidden />
        <motion.div
          className={styles.heroCopy}
          variants={enter}
          initial="hidden"
          animate="show"
        >
          <p className={styles.eyebrow}>Modern tech for premium hospitality</p>
          <h1 className={styles.heroTitle}>
            The floor, the pass, and the guest — <em>one ORDO.</em>
          </h1>
          <p className={styles.heroSub}>
            From the first QR order to the ticket in hand, ORDO keeps every kitchen connected, calm, and
            isolated — so service looks as polished as the room it serves.
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
            <li>Live on the floor</li>
            <li>Built for Pakistan</li>
            <li>Browser-first OS</li>
          </ul>

          <div className={styles.heroRail} aria-hidden>
            <span className={styles.railDot} />
            {["T7 · Karahi + naan", "Ayesha · Pickup", "COD · Biryani box"].map((t, i) => (
              <span key={t} className={styles.railTicket} style={{ animationDelay: `${i * 0.18}s` }}>
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          className={styles.heroStage}
          variants={enter}
          initial="hidden"
          animate="show"
          transition={{ delay: reduced || coarse ? 0 : 0.06 }}
        >
          <div className={styles.heroOrbit} aria-hidden />
          <figure className={styles.productShot}>
            <picture>
              <source srcSet="/ordo-lifestyle-hero.webp" type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ordo-lifestyle-hero.jpg"
                alt="ORDO on a restaurant table — phone dashboard beside a thermal printer and printed ticket"
                width={1600}
                height={1067}
                decoding="async"
                fetchPriority="high"
              />
            </picture>
          </figure>

          {/* Floating live-order cards — real POS feel */}
          <div className={styles.floatCardA} aria-hidden>
            <span className={styles.floatLive}>● LIVE</span>
            <strong>Order #1042</strong>
            <em>Karahi ₨890 · Naan ×2 ₨160</em>
            <b>TOTAL ₨1,130</b>
          </div>
          <div className={styles.floatCardB} aria-hidden>
            <span>✓ 58mm bill printed</span>
            <em>Guest track open</em>
          </div>
          <p className={styles.productCaption}>ORDO OS · live dashboard · ticket in hand</p>
        </motion.div>
      </section>

      {/* Live kitchen ticker — a slice of the floor, always moving */}
      <div className={styles.ticker} aria-hidden>
        <div className={styles.tickerTrack}>
          {[
            "Table 7 · Karahi + naan",
            "Counter bill · 58mm print",
            "Takeaway · Ayesha",
            "Delivery · COD · Biryani box",
            "Kitchen ticket · placed → ready",
            "Stock alert · soft drinks low",
            "Guest review · 5 stars",
            "Day close · PKR 45,200",
          ].map((t) => (
            <span key={t}>
              {t} <i>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className={styles.gallery} aria-label="Kitchen stills">
        <div className={styles.wrap}>
          <motion.div variants={section} initial="hidden" whileInView="show" viewport={viewOnce}>
            <p className={styles.kicker}>On the pass</p>
            <h2>Service that feels as considered as the dining room.</h2>
          </motion.div>
          <motion.div
            className={styles.stills}
            variants={listContainer(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            <motion.div className={`${styles.still} ${styles.stillKitchen}`} variants={item}>
              <div className={styles.bokeh} aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </div>
              <p className={styles.stillLabel}>Service light</p>
            </motion.div>
            <motion.div className={`${styles.still} ${styles.stillPass}`} variants={item}>
              <div className={styles.rail}>
                <article>
                  <span>T7 · Dining</span>
                  <strong>Karahi, naan</strong>
                </article>
                <article>
                  <span>Ayesha · Pickup</span>
                  <strong>Seekh, chai</strong>
                </article>
                <article>
                  <span>COD · Delivery</span>
                  <strong>Biryani box</strong>
                </article>
              </div>
              <p className={styles.stillLabel}>Ticket rail</p>
            </motion.div>
            <motion.div className={`${styles.still} ${styles.stillTicket}`} variants={item}>
              <div className={styles.ticketCard}>
                <b>ORDO</b>
                <em>Demo Kitchen</em>
                Karahi · ₨890
                <br />
                Naan ×2 · ₨160
                <br />
                <strong>Total ₨1,130</strong>
              </div>
              <p className={styles.stillLabel}>58mm paper</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className={styles.band} id="demo">
        <div className={styles.wrap}>
          <motion.div
            className={styles.demoCard}
            variants={section}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
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
          </motion.div>
        </div>
      </section>

      <section className={styles.section} id="tour">
        <div className={styles.wrap}>
          <motion.div variants={section} initial="hidden" whileInView="show" viewport={viewOnce}>
            <p className={styles.kicker}>Product tour</p>
            <h2>From table phone to kitchen ticket to owner glance.</h2>
            <p className={styles.leadWide}>
              Four stations. One kitchen catalog. Staff and Customer APKs lock to that restaurant code so
              orders never mix.
            </p>
          </motion.div>
          <motion.div
            className={styles.plans}
            variants={listContainer(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
            style={{ marginTop: "1.5rem" }}
          >
            {[
              {
                t: "1 · Guest",
                d: "Scan table QR or open the Customer APK — menu, modifiers, cart, track status.",
              },
              {
                t: "2 · Counter POS",
                d: "Staff APK / POS bills, prints 58mm, same catalog. 86 blocks sales instantly.",
              },
              {
                t: "3 · Kitchen",
                d: "Tickets move placed → preparing → ready. Sound + notify on new guest orders.",
              },
              {
                t: "4 · Owner",
                d: "Sales & Profit, day close, Super HQ billing and named Staff/Customer APKs.",
              },
            ].map((step) => (
              <motion.article key={step.t} className={styles.planCard} variants={listItem(reduced, coarse)}>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className={styles.section} id="company">
        <div className={styles.wrap}>
          <p className={styles.kicker}>The company</p>
          <h2>We build the quiet layer between guests and the kitchen.</h2>
          <p className={styles.leadWide}>
            ORDO is hospitality tech with a floor-first story: the phone on the table, the ticket in the
            printer, the owner glance at today’s numbers — one system, one kitchen at a time. We design for
            real service pressure in Pakistan, not for a generic SaaS brochure.
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

      <section className={styles.shopHero} id="shop">
        <div className={styles.wrap}>
          <div className={styles.shopGrid}>
            <figure className={styles.shopVisual}>
              <picture>
                <source srcSet="/ordo-lifestyle-hero.webp" type="image/webp" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/ordo-lifestyle-hero.jpg"
                  alt="ORDO lifestyle shot — admin on phone, thermal ticket, reserved table"
                  width={1600}
                  height={1067}
                  decoding="async"
                />
              </picture>
            </figure>
            <div className={styles.shopCopy}>
              <p className={styles.kicker}>ORDO shop</p>
              <h2>Software that belongs on the table — with paper when you need it.</h2>
              <p>
                Month to month in PKR. No per-order cut. Confirm ORDO OS and a quoted thermal printer on
                WhatsApp — the picture is the product story, not a fake checkout.
              </p>
              <h3>From guest QR to ticket in hand.</h3>
              <p>
                Guests order, the counter runs POS, the pass gets tickets — on the plan you pick. Browser print
                is included. Hardware width and delivery are confirmed in the same WhatsApp thread.
              </p>
              <ul className={styles.shopTags}>
                <li>ORDO OS</li>
                <li>58mm thermal option</li>
                <li>Setup guidance</li>
                <li>Starter ₨999 / Pro ₨1,999 / Enterprise ₨4,499</li>
              </ul>
              <div className={styles.heroCtas}>
                <a href="#contact" className={styles.primary}>
                  Request POS + printer quote
                </a>
                <a href="#plans" className={styles.shopSecondary}>
                  See monthly plans
                </a>
              </div>
              <p className={styles.shopNote}>
                Phone and table props in the photograph are for atmosphere. Hardware included in a quote is
                confirmed with you on WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="plans">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Monthly plans</p>
          <h2>Pick a kitchen plan. Add paper when you need it.</h2>
          <p className={styles.lead}>
            Same three prices on every quote. Hardware is extra and confirmed in the WhatsApp thread — not a
            surprise checkout on this site.
          </p>
          <div className={styles.billingToggle} role="group" aria-label="Billing period">
            <span className={billing === "monthly" ? styles.billingOn : undefined}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={billing === "yearly"}
              className={billing === "yearly" ? `${styles.billingSwitch} ${styles.billingSwitchOn}` : styles.billingSwitch}
              onClick={() => setBilling((b) => (b === "monthly" ? "yearly" : "monthly"))}
              aria-label="Switch to yearly billing"
            >
              <span className={styles.billingKnob} />
            </button>
            <span className={billing === "yearly" ? styles.billingOn : undefined}>
              Yearly <em>2 months free</em>
            </span>
          </div>
          <motion.div
            className={styles.plans}
            variants={listContainer(0.05)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            {PLANS.map((p) => {
              const base = parseInt(p.price.replace(/\D/g, ""), 10);
              const shown = billing === "yearly" ? Math.round((base * 10) / 12) : base;
              return (
                <motion.article
                  key={p.id}
                  variants={item}
                  className={"featured" in p && p.featured ? styles.planFeatured : styles.plan}
                >
                  {"featured" in p && p.featured ? <p className={styles.planBadge}>Most kitchens</p> : null}
                  <h3>{p.name}</h3>
                  <p className={styles.price}>
                    <PlanPrice amount={shown} />
                    <span>/mo</span>
                    {billing === "yearly" && <em className={styles.priceNote}>billed yearly</em>}
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
                </motion.article>
              );
            })}
          </motion.div>
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
          <p className={styles.kicker}>ORDO vs the old way</p>
          <h2>WhatsApp + register se ORDO tak — same kaam, zero jhanjhat.</h2>
          <p className={styles.lead}>
            Jo kaam aaj phone calls, register, aur chhote kaghaz par hota hai — wohi sab ek screen par,
            ek truth ke sath.
          </p>
          <div className={styles.compare}>
            <table>
              <thead>
                <tr>
                  <th />
                  <th className={styles.compareOrdo}>ORDO OS</th>
                  <th>Register + WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([feature, ordo, manual]) => (
                  <tr key={feature}>
                    <td>{feature}</td>
                    <td className={styles.compareOrdo}>{ordo ? "✓" : "—"}</td>
                    <td>{manual ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.facts}>
            {FACTS.map((f) => (
              <div key={f.label}>
                <strong>
                  <FactCounter value={f.value} prefix={f.prefix} suffix={f.suffix} />
                </strong>
                <span>{f.label}</span>
              </div>
            ))}
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

      <section className={styles.sectionSoft} id="kitchens">
        <div className={styles.wrap}>
          <p className={styles.kicker}>From real kitchens</p>
          <h2>Jo owners ORDO chala rahe hain, wohi sab se behtar batate hain.</h2>
          <motion.div
            className={styles.testimonials}
            variants={listContainer(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            {TESTIMONIALS.map((t) => (
              <motion.article key={t.name} variants={item} className={styles.testimonial}>
                <div className={styles.testiStars} aria-label={`${t.stars} star review`}>
                  {"★".repeat(t.stars)}
                </div>
                <p className={styles.testiQuote}>“{t.quote}”</p>
                <footer>
                  <span className={styles.testiAvatar}>{t.name.slice(0, 1)}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <em>{t.role}</em>
                  </div>
                </footer>
              </motion.article>
            ))}
          </motion.div>
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

      <section ref={contactRef} className={`${styles.sectionSoft} ${styles.contactSection}`} id="contact">
        <div className={styles.wrap}>
          <motion.div variants={section} initial="hidden" whileInView="show" viewport={viewOnce}>
            <p className={styles.kicker}>Start a conversation</p>
            <h2>Talk to ORDO</h2>
            <p className={styles.lead}>
              Kitchen shuru karni hai, demo dekhna hai, ya 58mm printer ka quote chahiye? Ek message —
              hum batayen ge.
            </p>
          </motion.div>

          <motion.div
            className={styles.contactCard}
            variants={listContainer(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            {sent ? (
              <motion.div className={styles.successCard} variants={item}>
                <span className={styles.successCheck} aria-hidden>
                  ✓
                </span>
                <h3>Request received</h3>
                <p>Hum Super ke inbox mein dekh lein ge — WhatsApp ya email par jald wapis aayen ge.</p>
                <Link href="/order?tenant=DEMO" className={styles.secondary}>
                  Open the demo meanwhile
                </Link>
              </motion.div>
            ) : (
              <motion.form className={styles.form} variants={item} onSubmit={submit}>
                <h3 className={styles.formTitle}>Kitchen details</h3>
                <label className={styles.field}>
                  <span>Your name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Usman"
                  />
                </label>
                <label className={styles.field}>
                  <span>Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@kitchen.pk"
                  />
                </label>
                <div className={styles.formRow}>
                  <label className={styles.field}>
                    <span>Phone / WhatsApp</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="03xx xxxxxxx"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Restaurant name</span>
                    <input
                      value={form.restaurantName}
                      onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
                      placeholder="Karahi House"
                    />
                  </label>
                </div>
                <label className={styles.field}>
                  <span>Plan</span>
                  <select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                    <option value="starter">Starter · ₨999</option>
                    <option value="pro">Pro · ₨1,999</option>
                    <option value="enterprise">Enterprise · ₨4,499</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Message</span>
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="City, dine-in / takeaway / delivery, printer yes or no"
                  />
                </label>
                <button type="submit" className={styles.cta}>
                  Send request <span aria-hidden>→</span>
                </button>
              </motion.form>
            )}

            <motion.aside className={styles.contactAside} variants={item}>
              <div className={styles.asideInner}>
                <span className={styles.asideIcon} aria-hidden>
                  💬
                </span>
                <h3>Prefer WhatsApp?</h3>
                <p>Wahi conversation jisme hum quotes dete hain — sab se tez jawab.</p>
                <a className={styles.waCta} href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                  Chat on WhatsApp
                </a>
                <p className={styles.waNumber}>{whatsapp}</p>
                <div className={styles.asideLinks}>
                  <Link href="/order?tenant=DEMO" className={styles.secondary}>
                    Open live demo
                  </Link>
                  <Link href="/login" className={styles.ghost}>
                    Existing kitchen login
                  </Link>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        </div>
      </section>

      {/* WhatsApp float — quotes, setup, onboarding */}
      <a
        className={contactInView ? `${styles.waFloat} ${styles.waFloatHidden}` : styles.waFloat}
        href={`https://wa.me/${waDigits}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with ORDO on WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden>
          <path
            fill="#ffffff"
            d="M16 3C9.4 3 4 8.4 4 15c0 2.1.6 4.2 1.7 6L4 28l7.2-1.9c1.5.8 3.2 1.2 4.8 1.2 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.5 0-3-.4-4.3-1.1l-.3-.2-4.3 1.1 1.1-4.1-.2-.3C7.2 19.2 6.7 17.1 6.7 15 6.7 9.8 10.9 5.6 16 5.6s9.3 4.2 9.3 9.3-4.2 9.9-9.3 9.9zm5.1-7.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.5-2-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.4z"
          />
        </svg>
        <span>Chat with ORDO</span>
      </a>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={theme === "dark" ? "/ordo-logo-on-dark.svg" : "/ordo-logo.svg"}
                alt="ORDO"
                className={styles.footerLogo}
                height={40}
                width={175}
              />
              <p>Modern tech for premium hospitality — guest QR, counter POS, and the pass in one system.</p>
            </div>
            <div className={styles.footerCols}>
              <div className={styles.footerCol}>
                <h3>Product</h3>
                <Link href="/order?tenant=DEMO">Live demo</Link>
                <Link href="/scan">Scan a table</Link>
                <a href="#shop">Monthly package</a>
              </div>
              <div className={styles.footerCol}>
                <h3>Account</h3>
                <Link href="/login">Kitchen login</Link>
                <a href={controlUrl()}>Owner HQ</a>
              </div>
              <div className={styles.footerCol}>
                <h3>Contact</h3>
                <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                  WhatsApp {whatsapp}
                </a>
                <a href="#contact">Request a kitchen</a>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} ORDO · asfins.com</span>
            <span>Isolated per kitchen · priced in PKR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
