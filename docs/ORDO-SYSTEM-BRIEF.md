# ORDO OS — System Brief (A to Z)

**Share this file or the PDF** (`docs/ORDO-SYSTEM-BRIEF.pdf`) with anyone you want to consult.

- Product brand: **ORDO**
- Live kitchen software: **ORDO OS**
- Prepared for: restaurant owners, partners, developers, consultants
- Live guest/staff site: https://ordo.asfins.com
- Owner HQ (Super only): https://control.asfins.com
- Platform WhatsApp: +92 303 9227000

---

## 1. What ORDO is (one paragraph)

ORDO is a **multi-kitchen restaurant operating system**: guest QR ordering, counter POS, kitchen tickets, menu, stock, billing, and Android apps. It is **not only a POS**. Every restaurant is an isolated “tenant” (own menu, orders, staff, logo). The platform owner (Super) creates kitchens; each kitchen’s Admin runs that kitchen only. Guests never see Super HQ. Staff apps never open Super HQ.

---

## 2. Three websites (never mix)

| Site | URL | Who uses it | What it is |
|---|---|---|---|
| Restaurant site | https://ordo.asfins.com | Guests + kitchen staff | Marketing, guest order, staff login, POS |
| Super HQ | https://control.asfins.com | Platform owner only | Create restaurants, billing, upload APKs |
| API | https://api.ordo.asfins.com | System | Backend `/api` |
| Media | https://media.ordo.asfins.com | System | Logos, photos, APK files |

**Rule:** Staff/Customer APKs never open Super HQ. Guests never open Admin. Kitchen A data never appears in Kitchen B.

---

## 3. Three kinds of people

1. **Super (platform owner)** — create/suspend restaurants, plans, leads, upload Staff + Customer APKs.
2. **Restaurant Admin / Staff** — POS, kitchen, menu, settings for **one** kitchen code.
3. **Customer / Guest** — menu, cart, order, track — **that kitchen only**.

Each restaurant has a **code** (example: `DEMO`). Login and APKs lock to that code.

---

## 4. What is written on the public website (ordo.asfins.com)

**Top navigation:** Company · Products · Tour · Plans · ORDO OS · Shop · Insights · About  
**Buttons:** Try guest demo · Admin Login · Dark/Light theme

### Live Demo Kitchen
- “Try the guest path. No account needed.”
- Dining, pickup, delivery, table QR
- Restaurant code **DEMO**
- Links: `/order?tenant=DEMO` · `/scan`

### Product tour (four stations)
1. **Guest** — table QR or Customer APK: menu, modifiers, cart, track status  
2. **Counter POS** — Staff APK / POS bills, 58mm print, same catalog  
3. **Kitchen** — tickets placed → preparing → ready; sound on new guest orders  
4. **Owner** — Sales & Profit, day close, Super HQ billing and named APKs  

### Company
“We build the quiet layer between guests and the kitchen.”

**Principles on the page:**
1. Practical before complicated — phones and laptops you already own  
2. Isolated by default — menus, stock, orders never cross kitchens  
3. Built with local reality — PKR, mixed dining/takeaway/delivery, WhatsApp, internet required  

### Products / ORDO OS modules (as written)
- Guest order — public menu, cart, checkout, track, review  
- QR / scanner — table QR opens the right kitchen and table  
- Staff POS — counter sale; same catalog as the public menu  
- Kitchen display — one queue for guest and counter tickets  
- Menu sync — staff add/hide/price; guests see that catalog  
- Receipts — 58mm browser bill; thermal hardware is a quoted add-on  

### Connected operations
Order → Prepare → Handoff → Record → Understand

### Outcomes
Control · Clarity · Continuity

### Built for Pakistan (as written)
- Use familiar devices (phone, tablet, computer)  
- Lightweight web / browser-first  
- Local payment reality (cash, wallet, card **recorded after you take the money**)  
- Isolation you can explain (many kitchens, each keeps its own menu, stock, logo)  

### FAQs (as written on the site)
- **What is ORDO?** Restaurant OS: guest ordering, POS, kitchen, menu, stock, Super Admin for many kitchens. POS is one part, not the whole product.  
- **Is this only a POS?** No. Guests order from /guest or /scan. Staff run POS, kitchen, menu, settings. Super creates isolated restaurants.  
- **Do two restaurants share a menu?** No.  
- **How do guests order?** Table QR, restaurant code on /guest, or `/order?tenant=CODE`.  
- **Per-order fee?** No. Monthly PKR. Printers quoted separately.  
- **Special POS machine?** No. Browser-first. Internet required.  
- **Offline?** No. Live system.  
- **JazzCash / card gateway included?** Marketing FAQ: paid-in-advance is a recorded status, not a fake card SDK. (Live kitchens can also enable Bank / JazzCash / EasyPaisa + screenshot proof in Admin Settings.)  

### About
ORDO is the brand. ORDO OS is the live kitchen product. Staff login is on ordo.asfins.com. Platform HQ is on control.asfins.com, not in the public nav.

### Contact form
Name, email, phone, restaurant name, plan, message → Super HQ → Messages.  
WhatsApp: **+92 303 9227000**

---

## 5. Plans (prices written on the site)

| Plan | Price / month | Staff | What the page lists |
|---|---|---|---|
| Starter | ₨999 | up to 5 | Guest dining/takeaway/delivery, QR, POS + kitchen, menu sync, browser receipts |
| Pro | ₨1,999 | up to 15 | Everything in Starter + roles, stock alerts, tracking + reviews, receipt branding |
| Enterprise | ₨4,499 | up to 40 | Everything in Pro + Super create/suspend, help into a kitchen, thermal printer package on request, priority onboarding |

No per-order fee. Hardware printer quoted separately.

---

## 6. Guest / Customer path

| Page | URL | What it does |
|---|---|---|
| Guest entry | https://ordo.asfins.com/guest | Restaurant code, Open menu, Gmail, scan QR, paste link |
| Customer app | `/guest?app=customer&tenant=CODE` | Welcome to {Restaurant} — that kitchen only |
| Order | `/order?tenant=CODE` | Menu, cart, dine-in / pickup / delivery |
| Table | `/order?tenant=CODE&table=3` | Table on the ticket |
| Scanner | `/scan` | Camera or paste QR |
| Track | `/track/{token}` | Status + review after complete |

**Guest payments (in the live app):** pay at counter, COD, Bank / JazzCash / EasyPaisa + screenshot (Admin turns these on). Special offer popup. Place order.

**Customer APK phone name:** `{Restaurant} Order`  
**Customer never sees:** POS, kitchen, thermal print, Super, another kitchen’s menu.

---

## 7. Staff / Admin path (kitchen)

**Login:** https://ordo.asfins.com/login  
Restaurant code + username + password (Gmail optional).

**Staff APK:** `/login?app=staff&tenant=CODE`  
**Phone name:** `{Restaurant} Staff`  
**Top of app:** Hello, {username} + restaurant name.

| Screen | Path | Job |
|---|---|---|
| Home | `/home` | Hub: POS, Kitchen, Orders, Tables, Thermal, Customer app |
| POS | `/pos` | Counter billing, same menu |
| Orders | `/orders` | Tickets, print, complete |
| Kitchen | `/kitchen` | Tickets, status, order beep |
| Tables | `/tables` | Floor / dine-in |
| Menu | `/menu` | Items, prices, photos, hide |
| Staff | `/staff` | Users, roles, permissions |
| Day close | `/day-close` | Shift close |
| Sales & Profit | `/sales` | Numbers |
| Settings | `/settings` | Name, logo, hours, fees, payments, offers, Your apps, Bluetooth thermal, iPhone install, password |

**Same Staff APK, different permissions:** Admin (Owner) · Cashier · Kitchen.

**Staff APK extras:** Bluetooth thermal print, new-order beep until Stop, stock-low alert, first-open Hello.

---

## 8. Super HQ (control.asfins.com) — not in public nav

| Tab | What it does |
|---|---|
| Home | How it works: add restaurant, passwords, they login on ordo.asfins.com, guests use `/order?tenant=CODE`, upload APKs |
| Your restaurants | Add restaurant + Admin (code, name, plan, username, password, email). Pause, renew, past due, Passwords & Gmail, Open Admin (Help, no password) |
| Apps | Upload **Staff .apk** and **Customer .apk** per kitchen (Play Store: .aab) |
| Pricing plans | Starter / Pro / Enterprise |
| Messages | Leads from the public contact form |
| Settings | Platform Super settings |

Help mode: Super opens a kitchen with a yellow “Help mode · Super” banner. That is not the kitchen’s Admin login.

---

## 9. Two Android apps

| App | Who | Opens | Thermal printer |
|---|---|---|---|
| Staff | Admin, cashier, kitchen | `/login?app=staff&tenant=CODE` | Yes (Bluetooth) |
| Customer | Diners | `/guest?app=customer&tenant=CODE` | No |

Admin downloads from **Settings → Your apps** (own kitchen only). Super uploads under **Apps**.  
iPhone: web / Add to Home Screen (not an IPA WhatsApp sideload).

**New restaurant:**
1. Super → Your restaurants → Add restaurant + Admin  
2. Super → Apps → upload Staff + Customer APKs for that code  
3. Admin → Settings → Your apps → send Customer APK to guests, Staff APK to team  

In-app name/logo follow **Settings** immediately. Phone home-screen name (`Lahore Grill Staff`) needs a branded APK upload.

---

## 10. Kitchens on the live site today

| Code | Name | Role |
|---|---|---|
| DEMO | Demo Restaurant | Public demo kitchen |
| ISO2 | Iso Kitchen Two | Second test kitchen (proves isolation — not “your” brand) |

A real client kitchen is created in Super with its **own code** (example: `LAHORE1`).

**Demo staff login (also printed on the login page):** code `DEMO` · `admin` / `admin123`  
Change passwords in production (Settings).

---

## 11. Order flow (A to Z)

1. Guest opens QR / code / Customer APK  
2. Cart → Place order (dine-in / pickup / delivery + payment)  
3. Ticket appears on that kitchen’s Orders + Kitchen  
4. Staff hear alert until Stop  
5. Ready → guest track page  
6. Complete → review + stock  
7. Print from POS/Orders → Bluetooth thermal in Staff APK, otherwise browser 58mm  

---

## 12. Isolation (say this when you brief someone)

- Each kitchen: own menu, stock, orders, logo, staff, reviews  
- APKs bake `tenant=CODE`  
- Admin API never serves another kitchen’s APK  
- Tenant A’s receipt never prints Tenant B’s name  

---

## 13. Technology (for a developer)

Next.js + TypeScript · Vercel · MongoDB Atlas · Cloudflare R2 · Resend · WhatsApp leads.

---

## 14. One-sentence pitch

ORDO is a multi-kitchen restaurant OS: public guest ordering plus staff POS/kitchen/print. Super HQ creates isolated kitchens and branded APKs. Staff APK = billing, kitchen, thermal. Customer APK = that kitchen’s orders only. Data never mixes.

---

© ORDO · ordo.asfins.com · control.asfins.com · +92 303 9227000
