# ORDO OS — UI/UX Master Plan

> Goal: make ORDO **fully unique, professional, and animation-rich** — every surface
> (marketing, guest ordering, scanner, staff dashboard, POS, kitchen, billing) should feel
> premium, calm, and local. Research-based; phased; measurable.

## 1. Design system (foundation)

Already in place (`globals.css`): ember accent (#c45c26), Jakarta + Instrument Serif pair,
guest-dark + staff-light + marketing-cream themes, AsFix staff chrome, motion helpers
(`lib/motion.ts`). Polish to add:

- Custom scrollbar (thin, ember thumb on dark/cream).
- `scroll-behavior: smooth` (reduced-motion safe) + anchor scroll-margin.
- Hover/active micro-interactions on every interactive element (0.18s ease, translateY/scale).
- Consistent focus rings; selection already ember.
- Global keyframes library: `ordo-rise`, `ordo-fade`, `ordo-sheet`, `ordo-scanline`,
  `ordo-pulse`, `ordo-shimmer` — reused everywhere.

## 2. Surface-by-surface plan

### 2.1 Marketing home (`/`)
- Hero with staggered entrance, product shot + floating receipt card, chips.
- **Add:** live count-up demo stats strip, marquee ticker of kitchen workflows, tabbed role
  tour (exists), plans with featured card, FAQ, contact → all kept.
- **Unique touch:** a live "ticket rail" animation in the hero that mimics the kitchen board.

### 2.2 Guest ordering (`/order?tenant=CODE`)
- Already premium: fly-to-cart dots, sheet transitions, deal rail, category chips.
- **Add:** sticky cart bar with total shimmer on change; empty-state illustration;
  checkout step validation with shake on error; "86" badges pulse.

### 2.3 Scanner (`/scan`) — **THIS WAVE**
- Redesign as a **professional scan terminal**:
  - Animated laser scanline + 4 corner brackets in the viewfinder.
  - Status pill (idle / scanning / opening / unsupported / error) with smooth swaps.
  - **Options:** front/back camera toggle, paste field, restaurant code chips
    (**recent kitchens** from localStorage), one-tap **DEMO** kitchen, "how it works" hint.
  - Entrance animations; camera frame shimmer while decoding.

### 2.4 Staff dashboard (`/home`)
- Greeting header (Salam, {username}) + live clock + today's date.
- Stat cards with **count-up animation** (revenue PKR, open tickets, completed/void).
- Quick-action tile grid (POS, Kitchen, Orders, Tables, Sales, Day close) with icons,
  hover lift, permission-aware.
- Low-stock alert card stays prominent (pulse border when 0-stock items exist).

### 2.5 POS (`/pos`)
- Menu tiles: hover scale + image zoom, 86 overlay chip; cart column with item enter
  animation; fee lines appear with fade; charge button success pulse + print flow.

### 2.6 Kitchen (`/kitchen`) + Orders (`/orders`)
- Lane/ticket hover lift; placed tickets pulse border (done in wave 1); new-order count
  pulse (done); sound panel styled as a toaster with slide-in.

### 2.7 Billing: Sales / Day close / Track
- Sales: animated bars for byPayment/byChannel; count-up totals.
- Day close: confirm sheet with summary animation.
- Track: status stepper with animated progress line per status event.

### 2.8 Login / Guest splash
- Brand mark entrance, field focus glow, mode switch with layout animation.

## 3. Implementation phases

| Phase | Scope | Status |
|---|---|---|
| P0 | Isolation, alerts, 58mm, guards, audit script | ✅ shipped |
| P1 | Scanner terminal upgrade + staff home dashboard + global polish + marketing ticker + theme switch | ✅ shipped |
| P2 | POS/Kitchen/Orders micro-interactions + Sales bars + track stepper pulse | ✅ shipped |
| P3 | Guest checkout shake/pop + empty state + login brand entrance | ✅ shipped |
| P4 | Marketing hero live ticket-rail + plan price count-ups + ticker | ✅ shipped |

## A-Z page inventory

| Route | Screen | Animations / polish |
|---|---|---|
| `/` | Marketing home | hero entrance, ticker marquee, round theme switch, scroll-reveal sections, plan cards |
| `/guest` | Guest splash | display headings, code entry |
| `/scan` | Scanner | laser scanline, corner brackets, camera toggle, recent chips, status pills |
| `/order` | Guest ordering | fly-to-cart, sheet spring, deal rail, category chips, cart bar total |
| `/track/[token]` | Guest tracking | timeline stepper (pulsing now-step), star hover scale, ready modal |
| `/login` | Staff/Super login | glass card, focus glow, mode switch |
| `/home` | Staff home | Salam greeting + clock, count-up stats, quick tiles hover |
| `/pos` | POS | menu tiles lift + image zoom, low-stock pulse |
| `/kitchen` | Kitchen board | lane counts (placed pulses), ticket lift, placed breathing ring |
| `/orders` | Orders/billing | new-row entrance + highlight, card lift |
| `/tables` | Floor map | ticket lift, status colors |
| `/menu` | Menu admin | tile lift |
| `/settings` | Settings | form focus glow |
| `/sales` | Sales & Profit | animated payment bars, count-up totals, stat lift |
| `/day-close` | Shift close | stat cards, print summary |
| `/staff` | Staff list | table rows |
| `/control` | Super HQ | slate back-office, tabular stats |
| `/lab` | Dev index | localhost only |

## 4. Research references

- [DoorDash — Restaurant website designs that inspire online orders](https://merchants.doordash.com/en-us/blog/restaurant-website-templates#1)
- [POS UX Benchmarking 2026: Square, Toast, Lightspeed](https://interface-design.co.uk/blog/pos-software-ux-benchmarking-2026-the-coherence-gap/#lightspeed-pos)
- [getsear POS_UI_RESEARCH](https://github.com/AIVIIZN/getsear/blob/main/POS_UI_RESEARCH.md)
- [QR Code Digital Menu Card reference](https://github.com/pranjal0715/Digital_Menu_card)
- [15 Best Restaurant Website Examples — WP Minds](https://wpminds.com/restaurant-website/)

## 6. Typography system (audited + polished)

- **UI font:** Plus Jakarta Sans 400–700 (`next/font`, `display:swap`) — simple, modern, readable on phone. Used everywhere.
- **Display font:** Instrument Serif — kept **only for front-end personality** (marketing, guest order, track, scan headings). Back-end (staff/HQ) is 100% sans now.
- **Numbers everywhere use `font-variant-numeric: tabular-nums`** — staff tables/cards, HQ stats/tables, guest prices/cart totals — digits align like a proper ledger.
- **Mobile-safe:** all inputs inherit 16px (no iOS auto-zoom), `-webkit-text-size-adjust: 100%` stops landscape inflation, `-webkit-tap-highlight-color: transparent` kills grey tap flash.
- **Login:** focus glow + transition on fields; Restaurant/Super modes already split by host.
- **Verified login matrix:** Super (`control.asfins.com` + `/login?owner=1`) → HQ; Restaurant Admin/staff (`ordo.asfins.com`) → own kitchen only; staff Google login per kitchen email. All session-guarded.

## 7. Guardrails

- `prefers-reduced-motion` respected everywhere (use `usePrefersReducedMotion`).
- No new dependencies; framer-motion + CSS keyframes only.
- Staff pages stay keyboard-accessible; buttons keep labels.
- Tenant isolation and print layouts must not regress (run
  `node scripts/audit-tenant-isolation.mjs` + build before merge).
