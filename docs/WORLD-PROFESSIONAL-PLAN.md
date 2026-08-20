# ORDO World-Professional Product Plan

Master roadmap for a complete multi-tenant restaurant OS (Pakistan-first).  
**No dedicated FBR page.** FBR stays an **optional Super one-click** feature flag; kitchens only see an opt-in switch when Super enables it.

---

## 1. Product vision

ORDO = hospitality OS: guest QR → counter POS → kitchen tickets → owner picture.  
Every restaurant is **isolated** (own data, own branding, own Staff APK, own Customer APK).  
Super HQ owns platform billing, APK binaries, feature flags, and Help mode.

---

## 2. Architecture (keep)

| Layer | Role |
|---|---|
| `ordo.asfins.com` | Marketing + restaurants (Admin/staff/guest) |
| `control.asfins.com` | Super HQ only |
| `api.ordo.asfins.com` | API host |
| `media.ordo.asfins.com` | R2 media |
| Mongo | Tenant documents + platform |
| R2 | Logos, menu photos, backups, APKs (preferred live) |

---

## 3. APK plan (per restaurant — no mix-up)

### Rule
Each kitchen gets **two branded APKs**:

| APK | Audience | Opens | Filename pattern |
|---|---|---|---|
| **Staff** | Owner/cashier/kitchen | `/login?app=staff&tenant=CODE` | `ORDO-{CODE}-Staff.apk` |
| **Customer** | Diners | `/guest?app=customer&tenant=CODE` | `ORDO-{CODE}-Customer.apk` |

- Display title in Super: `{Restaurant Name} · Staff` / `{Restaurant Name} · Customer`
- APK **must never** open `/super` or `/control`
- Tenant code is **baked into deep link** so guests/staff of Kitchen A cannot land on Kitchen B by accident
- Global template slots optional (`ORDO-Staff.apk` / `ORDO-Customer.apk`) for rebuilds; **production distribution is always per-tenant**

### iPhone / iOS (no APK)
iPhone customers and staff use the **same** locked URLs via Safari → Share → **Add to Home Screen**.  
Plan + Admin Settings “Install on iPhone”: **`docs/IOS-PWA-SAFE-PLAN.md`**. Alerts companion: `docs/WORLD-PRO-APK-ALERTS-PLAN.md`.

### Super Apps tab
- List restaurants → expand → Staff + Customer upload/download/replace
- Show: available, size, updatedAt, loads URL, display name
- Only Super can upload/download

### Build note (ops)
Capacitor shells in `mobile/ordo-pos` and `mobile/ordo-guest` are WebViews.  
Per-restaurant APK = rebuild (or config) with start URL including `tenant=CODE` + app shell.  
Super stores the finished binary under that tenant’s folder.

### Billing / cost
- APK hosting is **platform cost** (your Super plan)
- You may charge kitchens for branded APK packaging as an **add-on** (tracked in Super billing notes / renewals)
- Customer APK is free to diners; restaurant pays you (monthly OS ± APK fee)

---

## 4. FBR (optional only — no page)

- **No** `/fbr` route, no FBR marketing page, no FBR nav item
- Super Settings: **one-click** “Allow FBR option for kitchens” (`platform.features.fbrOptional`)
- When ON: each kitchen Settings shows optional “Enable FBR fields (experimental)” — off by default
- When OFF: kitchens never see FBR UI
- Future fiscal sync stays behind this flag only

---

## 5. Feature matrix (what “complete” means)

### A. Marketing frontend
| Item | Status target |
|---|---|
| Brand, story, lifestyle, plans, contact | Live |
| Product tour / screens | Add |
| Trust + isolation copy | Add |
| Roman Urdu toggle (optional) | Later |

### B. Guest
| Item | Status target |
|---|---|
| Menu, cart, track, review | Live |
| Modifiers on guest | Add |
| WhatsApp status notify | Later |
| Per-tenant Customer APK | Add (Super) |

### C. Admin / staff
| Item | Status target |
|---|---|
| POS, kitchen, orders, menu, staff, settings | Live |
| Tables **editor** | Add |
| Day-close / payment mix | Improve |
| Stock block 86 | Later |
| Password hashing | Add soon |
| Per-tenant Staff APK | Add (Super) |

### D. Super HQ
| Item | Status target |
|---|---|
| Tenants, plans, leads, Help | Live |
| **Apps** tab (per-tenant APKs) | Add |
| **Billing** (renew, past_due, notes) | Add |
| FBR optional one-click | Add |
| APK global templates | Keep as templates |

### E. Backend
| Item | Status target |
|---|---|
| Auth, orders, media, R2, Resend | Live |
| Tenant-scoped APK storage | Add |
| Feature flags on platform | Add |
| Hash passwords | Priority follow-up |
| Real JazzCash/etc. | Later (honest pay modes stay) |

---

## 6. Motion / UI (storefront only)

- Keep calm Framer Motion tokens (`src/lib/motion.ts`)
- Marketing + guest: enter / stagger / sheet — max 2–3 motions per viewport
- Staff / Super: almost static (speed > flair)
- Reduced-motion respected

---

## 7. Implementation phases (this rollout)

### Phase 1 — Super control plane (now)
1. Platform `features.fbrOptional` + Super one-click (no FBR page)
2. Per-tenant Staff + Customer APK upload/download in Super **Apps**
3. Super billing: renew +30d, set past_due/active/suspended, billing note
4. Deep-link helpers: Staff/Customer URLs include `tenant=CODE`

### Phase 2 — Kitchen completeness (now / next)
5. Tables editor (CRUD via existing `tables` admin API)
6. Guest cart modifiers (match POS pricing)
7. Settings: show FBR opt-in **only if** Super flag on

### Phase 3 — Hardening (follow-up)
8. Password hashing (bcrypt)
9. Product tour section on marketing
10. Day-close payment mix + Z-style summary
11. Scheduled backups + restore UI
12. WhatsApp order-status to guest

### Phase 4 — Scale (later)
13. Self-serve PK payments
14. Multi-branch enterprise true caps
15. ESC/POS bridge optional
16. FBR API sync **only if** flag on

---

## 8. Isolation rules (never break)

1. Tenant A never reads Tenant B data  
2. Staff APK never opens Super HQ  
3. Customer APK never opens Admin  
4. Help mode = temporary second session, audited in Super  
5. APK filenames and deep links always include restaurant **code**

---

## 9. Done when

- Super can enable/disable FBR option in one click; no FBR page exists  
- Super can upload/download **named** Staff + Customer APKs per restaurant  
- Billing renew / past_due works from Super  
- Tables editable; guest modifiers work  
- Marketing/guest motion stays calm; staff stays fast  
