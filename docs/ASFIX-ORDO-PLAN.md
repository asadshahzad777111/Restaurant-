# AsFix → ORDO application plan

Model: **AsFix & Gear look/flow** on the **existing ORDO Next.js multi-tenant stack**  
(`ordo.asfins.com` + `control.asfins.com`).  
**Not** a rewrite to Vite `frontend/` + Express `backend/` — that would break live tenants, R2, Super HQ, and APKs already shipping.

---

## Architecture map (AsFix concept → ORDO)

| AsFix | ORDO (keep) |
|---|---|
| React+Vite frontend | Next.js App Router `src/app/*` |
| Express API | Next.js `src/app/api/*` + Mongo/file |
| `mobile/asfix-pos` → `/pos` | `mobile/ordo-pos` → `/login?app=staff` → POS |
| `mobile/asfix-web` → order site | `mobile/ordo-guest` → `/guest?app=customer` |
| Super + Admin | `control.asfins.com` Super · kitchen Admin on app host |
| One catalog | `tenant.menu[]` shared by POS + guest |
| Thermal | `src/lib/print.ts` 58mm HTML (+ optional local bridge) |

---

## Look & roles (copy AsFix intent)

1. **Sales & Profit (Profit Profile)** — new `/sales` owner report: fonts/cards like polished Admin sales (gross, payment mix, top items, channel, optional margin).
2. **Day close** — same visual language; printable summary + history table (no raw JSON).
3. **Staff shell background** — one `--asfix-bg` / gradient for Admin+POS+Kitchen (not mixed WP gray). Super HQ stays distinct WordPress-like on `/control` by design.
4. **Login glass** — frosted auth panel like AsFix `/account`.
5. **Roles** — Super (create kitchens) · Admin · Counter/Kitchen station presets · `requireAuth` + permission checks · never log passwords.
6. **POS** — Counter = bill/print · Kitchen = tickets/ready · same catalog API.
7. **Customer** — guest order → same orders · `placed → … → ready`.
8. **APK** — Capacitor WebView pattern (already); Super uploads per-restaurant binaries.

---

## Apply now (this pass)

| # | Deliverable |
|---|---|
| 1 | Plan doc (this file) |
| 2 | `--asfix-*` tokens on staff shell |
| 3 | Glass login |
| 4 | `/sales` Profit Profile + Sidebar link |
| 5 | Day-close polish (cards + history table + print) |
| 6 | Optional `costPrice` on menu → estimated profit |
| 7 | Counter / Kitchen station presets on Staff page |
| 8 | Settings: print logo on bill toggle + wire print |

## Later (not this pass)

- Full ESC/POS native bridge beyond HTML/9100 text  
- Heavy charts library  
- Vite/Express split  
- Password hashing migration (already flagged in world-pro Phase 3)

---

## Deploy rule

When user says deploy / live / push / “kr do” → commit + push **`main`**.
