"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { controlUrl } from "@/lib/urls";
import { useCountUp } from "@/lib/use-count-up";
import { useLang } from "@/lib/lang-context";
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
import ProductTour from "@/components/ProductTour";

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
    body: "Orders, staff aur aaj ka picture — ek restaurant login mein. Super bina mix kiye help kar sakta hai.",
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
    body: "Tickets placed se ready — dining, takeaway, delivery sab labelled.",
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
    body: "Ingredients + alerts isi kitchen ke Settings mein — dusra kitchen nahi dekhta.",
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
    body: "Dining = counter pay · Takeaway = counter ya advance · Delivery = COD ya advance.",
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
  { title: "Guest order", body: "QR menu + cart + checkout — dining, takeaway, delivery." },
  { title: "QR / scanner", body: "Table QR ya code — camera ya paste." },
  { title: "Staff POS", body: "Counter sale — wahi catalog jo guest dekhta hai." },
  { title: "Kitchen display", body: "Ek queue, placed se ready." },
  { title: "Menu sync", body: "Staff update, guest turant dekhta hai." },
  { title: "Receipts", body: "58mm bill — shop, items, total. Hardware alag quote." },
] as const;

const FLOW = [
  { step: "01", title: "Order", body: "Guest menu / table QR / counter — ek queue." },
  { step: "02", title: "Prepare", body: "Kitchen kaam preparation mein." },
  { step: "03", title: "Handoff", body: "Ready — pass, pickup shelf, delivery." },
  { step: "04", title: "Record", body: "Payment ticket par · stock alerts isi kitchen." },
  { step: "05", title: "Understand", body: "Guest tracking live · completed = review." },
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
  { q: "What is ORDO?", a: "QR ordering + counter POS + kitchen tickets — ek system." },
  { q: "Is this only a POS?", a: "Nahi — guest ordering, kitchen, menu, stock, aur Super Admin bhi." },
  { q: "Do two restaurants share a menu?", a: "Nahi — har kitchen alag tenant, data kabhi mix nahi." },
  { q: "How do guests order?", a: "Scan QR, /guest se code, ya /order?tenant=CODE." },
  { q: "Do you charge per order?", a: "Nahi — monthly PKR, no per-order fee." },
  { q: "Do I need a special POS machine?", a: "Nahi — browser-first, jo device aapke paas hai." },
  { q: "Does it work offline?", a: "Nahi — live internet chahiye, jaise dusre cloud tools." },
  { q: "Is JazzCash or a card gateway included?", a: "Nahi — advance recorded status hai, counter par cash/card/wallet." },
] as const;

const PRINCIPLES = [
  { n: "01", title: "Practical before complicated", body: "Tech bojh kam kare, zyada nahi." },
  { n: "02", title: "Isolated by default", body: "Har kitchen alag tenant — data kabhi mix nahi." },
  { n: "03", title: "Built with local reality", body: "PKR, dining/takeaway/delivery, WhatsApp." },
] as const;

const OUTCOMES = [
  { kicker: "Control", title: "See what is happening now.", body: "Active orders, prep, stock — ek jagah." },
  { kicker: "Clarity", title: "Keep every team on the same truth.", body: "Owner, chef, counter — ek data." },
  { kicker: "Continuity", title: "Carry work into the business record.", body: "Completed ticket se tracking, reviews, alerts." },
] as const;

export function MarketingHome() {
  const { lang, toggle, t } = useLang();
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
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setScrolled(window.scrollY > 10);
        setShowTop(window.scrollY > 700);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Scroll-spy: highlight the nav link for the section in view
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
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
              <a
                key={item.href}
                href={item.href}
                className={activeSection === item.href ? styles.navLinkActive : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className={styles.navActions}>
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            <button
              type="button"
              className={styles.langBtn}
              onClick={toggle}
              title={lang === "en" ? "اردو / Roman Urdu" : "English"}
            >
              {lang === "en" ? "اردو" : "EN"}
            </button>
            <Link href="/login" className={styles.navOutline}>
              {t("adminLogin")}
            </Link>
            <a href="#contact" className={styles.navSolid}>
              {t("talkOrdo")}
            </a>
          </div>

          <div className={styles.navMobileBtns}>
            <ThemeSwitch theme={theme} onToggle={toggleTheme} />
            <button
              type="button"
              className={styles.langBtn}
              onClick={toggle}
              title={lang === "en" ? "اردو / Roman Urdu" : "English"}
            >
              {lang === "en" ? "اردو" : "EN"}
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
                {t("adminLogin")}
              </Link>
              <a href="#contact" className={styles.navSolid} onClick={closeMenu}>
                {t("talkOrdo")}
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
            {(() => {
              const parts = t("heroTitle").split("—");
              return (
                <>
                  {parts[0]}
                  {parts.length > 1 && <em>—{parts.slice(1).join("—")}</em>}
                </>
              );
            })()}
          </h1>
          <p className={styles.heroSub}>
            {t("heroSub")}
          </p>
          <div className={styles.heroCtas}>
            <Link href="/order?tenant=DEMO" className={styles.primary}>
              {t("openDemo")}
            </Link>
            <Link href="/scan" className={styles.secondary}>
              {t("scanTable")}
            </Link>
            <a href="#shop" className={styles.ghost}>
              {t("fromPrice")}
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

      <section className={styles.gallery} aria-label="How ORDO works">
        <div className={styles.wrap}>
          <motion.div variants={section} initial="hidden" whileInView="show" viewport={viewOnce}>
            <p className={styles.kicker}>{t("galleryKicker")}</p>
            <h2>{t("galleryTitle")}</h2>
            <p className={styles.leadWide}>{t("galleryLead")}</p>
          </motion.div>
          <motion.div
            className={styles.stills}
            variants={listContainer(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            {/* Guest phone */}
            <motion.div className={`${styles.still} ${styles.stillPhone}`} variants={item}>
              <div className={styles.phoneFrame}>
                <div className={styles.phoneHeader}>
                  <span className={styles.phoneLive}>● LIVE</span>
                  <strong className={styles.phoneTitle}>Karahi House</strong>
                </div>
                <div className={styles.phoneMenu}>
                  <div className={styles.phoneItem}>
                    <div>
                      <strong>Karahi</strong>
                      <em>₨890</em>
                    </div>
                    <button className={styles.phoneAdd} aria-hidden>
                      +
                    </button>
                  </div>
                  <div className={styles.phoneItem}>
                    <div>
                      <strong>Naan ×2</strong>
                      <em>₨160</em>
                    </div>
                    <button className={styles.phoneAdd} aria-hidden>
                      +
                    </button>
                  </div>
                </div>
                <div className={styles.phoneCart}>2 items · ₨1,130</div>
              </div>
              <p className={styles.stillLabel}>Guest order</p>
            </motion.div>

            {/* Kitchen display */}
            <motion.div className={`${styles.still} ${styles.stillPass}`} variants={item}>
              <div className={styles.rail}>
                <article>
                  <span>T7 · Dining</span>
                  <strong>Karahi, naan</strong>
                  <em className={styles.railLive} aria-hidden>
                    🔔
                  </em>
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
              <p className={styles.stillLabel}>Kitchen display</p>
            </motion.div>

            {/* 58mm receipt */}
            <motion.div className={`${styles.still} ${styles.stillTicket}`} variants={item}>
              <div className={styles.ticketCard}>
                <div className={styles.ticketShop}>KARAHI HOUSE</div>
                <div className={styles.ticketMeta}>Bill #1042 · 12:30</div>
                <div className={styles.ticketLine}>
                  <span>Karahi</span>
                  <span>₨890</span>
                </div>
                <div className={styles.ticketLine}>
                  <span>Naan ×2</span>
                  <span>₨160</span>
                </div>
                <div className={styles.ticketRule} />
                <div className={styles.ticketTotal}>
                  <span>TOTAL</span>
                  <strong>₨1,130</strong>
                </div>
                <div className={styles.ticketFooter}>Thank you · Visit again</div>
              </div>
              <p className={styles.stillLabel}>58mm receipt</p>
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
              <p className={styles.kicker}>{t("liveDemoKicker")}</p>
              <h2>{t("liveDemoTitle")}</h2>
              <p>{t("liveDemoBody")}</p>
              <div className={styles.heroCtas}>
                <Link href="/order?tenant=DEMO" className={styles.primary}>
                  {t("openDemo")}
                </Link>
                <Link href="/scan" className={styles.secondary}>
                  {t("tryScanner")}
                </Link>
              </div>
            </div>
            <ul className={styles.demoStats}>
              <li>
                <strong>DEMO</strong>
                <span>{t("demoCode")}</span>
              </li>
              <li>
                <strong>/scan</strong>
                <span>{t("demoScan")}</span>
              </li>
              <li>
                <strong>PKR</strong>
                <span>{t("demoPkr")}</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="app">
        <div className={styles.wrap}>
          <motion.div className={styles.appCard} variants={section} initial="hidden" whileInView="show" viewport={viewOnce}>
            <div className={styles.appVis}>
              <span className={styles.appIcon}>📱</span>
              <div className={styles.appMeta}>
                <strong className={styles.appName}>ORDO Staff + Customer apps</strong>
                <span className={styles.appBadge}>Android · v2 · Staff 62 MB · Customer 61 MB</span>
              </div>
            </div>
            <div className={styles.appCopy}>
              <p className={styles.kicker}>Download the app</p>
              <h2>{t("appTitle")}</h2>
              <p>{t("appBody")}</p>
              <div className={styles.heroCtas}>
                <a
                  className={styles.primary}
                  href="https://github.com/asadshahzad777111/Restaurant-/releases/download/ordo-apps-v1/ORDO-Staff.apk"
                  download
                >
                  🧑‍🍳 {t("downloadApk")}
                </a>
                <a
                  className={styles.secondary}
                  href="https://github.com/asadshahzad777111/Restaurant-/releases/download/ordo-apps-v1/ORDO-Customer.apk"
                  download
                >
                  🍽️ Customer app
                </a>
                <Link href="/order?tenant=DEMO" className={styles.secondary}>
                  {t("webDemo")}
                </Link>
              </div>
              <p className={styles.appNote}>
                Install: Android → Settings → Security → allow "Unknown sources" → open the APK.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <ProductTour
        kicker={t("tourKicker")}
        title={t("tourTitle")}
        lead="Four stations. One kitchen catalog. Staff and Customer APKs lock to that restaurant code so orders never mix."
        steps={[
          { title: "Guest", body: t("tourGuest") },
          { title: "Counter POS", body: t("tourPos") },
          { title: "Kitchen", body: t("tourKitchen") },
          { title: "Owner", body: t("tourOwner") },
        ]}
      />

      <section className={styles.section} id="company">
        <div className={styles.wrap}>
          <p className={styles.kicker}>{t("companyKicker")}</p>
          <h2>{t("companyTitle")}</h2>
          <p className={styles.leadWide}>
            Phone, printer, aur aaj ke numbers — ek system, ek kitchen at a time.
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
          <p className={styles.kicker}>{t("productsKicker")}</p>
          <h2>{t("productsTitle")}</h2>
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
          <p className={styles.kicker}>{t("osKicker")}</p>
          <h2>{t("osTitle")}</h2>
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
          <p className={styles.kicker}>{t("plansKicker")}</p>
          <h2>{t("plansTitle")}</h2>
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
                  </p>
                  {billing === "yearly" && <p className={styles.priceNote}>Billed yearly · 2 months free</p>}
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
          <p className={styles.kicker}>{t("flowKicker")}</p>
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
          <p className={styles.kicker}>{t("pakKicker")}</p>
          <h2>{t("pakTitle")}</h2>
          <p className={styles.leadWide}>
            Practical devices, internet, PKR — local workflows ke liye.
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
          <p className={styles.kicker}>{t("insightsKicker")}</p>
          <h2>{t("insightsTitle")}</h2>
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
          <p className={styles.kicker}>{t("aboutKicker")}</p>
          <h2>{t("aboutTitle")}</h2>
          <p className={styles.leadWide}>
            Restaurants ke liye jo dining, takeaway, delivery chalaate hain. Public site guest path ka demo hai.
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
          <motion.div
            className={styles.footerCta}
            variants={section}
            initial="hidden"
            whileInView="show"
            viewport={viewOnce}
          >
            <div>
              <h2>Ready to modernize your kitchen?</h2>
              <p>Guest QR, counter POS, 58mm receipts — ek hi system mein. Demo dekho ya baat karo.</p>
            </div>
            <div className={styles.footerCtaBtns}>
              <Link href="/order?tenant=DEMO" className={styles.primary}>
                Start with the demo
              </Link>
              <a href="#contact" className={styles.secondary}>
                Talk to ORDO
              </a>
            </div>
          </motion.div>

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
              <p>{t("footerTag")}</p>
              <div className={styles.footerSocial}>
                <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.3.1-.4l.4-.4c.1-.2.2-.3.2-.5s0-.3-.1-.5c-.1-.1-.6-1.5-.8-2s-.4-.5-.6-.5h-.5c-.2 0-.5.1-.8.4-.2.2-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1z"
                    />
                  </svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1zm0 2c-3.1 0-3.5 0-4.7.1-1.1.1-1.5.2-1.9.4-.5.2-.8.4-1.2.7-.3.4-.5.7-.7 1.2-.2.4-.3.8-.4 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.5.4 1.9.2.5.4.8.7 1.2.4.3.7.5 1.2.7.4.2.8.3 1.9.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.5-.2 1.9-.4.5-.2.8-.4 1.2-.7.3-.4.5-.7.7-1.2.2-.4.3-.8.4-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.5-.4-1.9-.2-.5-.4-.8-.7-1.2-.3-.3-.7-.5-1.2-.7-.4-.2-.8-.3-1.9-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.5a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6zm0 8.7a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8zm6.7-8.9a1.2 1.2 0 0 0-2.4 0 1.2 1.2 0 0 0 2.4 0z"
                    />
                  </svg>
                </a>
              </div>
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

          <div className={styles.footerWordmark} aria-hidden>
            ORDO
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} ORDO · asfins.com</span>
            <span>{t("footerIsolated")}</span>
          </div>
        </div>
      </footer>

      {/* Back-to-top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`${styles.backTop}${showTop ? ` ${styles.backTopShow}` : ""}`}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}
