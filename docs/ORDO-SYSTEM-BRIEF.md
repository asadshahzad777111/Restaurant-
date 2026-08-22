# ORDO OS — System Brief

> Multi-kitchen restaurant operating system. One platform, many restaurants, strict tenant
> isolation. This brief is the canonical architecture reference for the codebase.
> (Reconstructed from `docs/*` + source on 2025 — the original file was missing from the repo.)

---

## 1. Product

ORDO runs a chain of independent restaurants ("kitchens") on one deployment:

- **Guests** scan a table QR / open `/order?tenant=CODE` → browse menu, cart, checkout
  (dine-in / takeaway / delivery), track order live, leave a review.
- **Staff** sign in per kitchen (`/login` with code + username) → POS, Orders, Kitchen board,
  Menu, Stock, Tables, Settings, Day close, Sales & Profit.
- **Super Admin (HQ)** signs in at `control.asfins.com` → create/suspend restaurants, plans,
  billing, per-kitchen branded Staff + Customer APKs, recover Admin credentials, Help mode
  (impersonate a kitchen without its password).

### Host split (never mix roles)

| Host | Serves |
|---|---|
| `ordo.asfins.com` | Restaurant staff UI + guest ordering. `/control` and `/super` are blocked (404). |
| `control.asfins.com` | Super HQ only (`/control`, `/login`). Staff UI only during explicit Help mode (cookie `help-mode=1`). |
| `api.ordo.asfins.com` | `/api/*` only; everything else 404s. |
| `media.ordo.asfins.com` | R2 media + backups. |
| `localhost:3000` | Dev. File-store mode, `/lab` demo index. |

### Actors / roles

- `super` — platform owner. **Never has `tenantId`.** Cannot open restaurant pages without Help mode.
- `tenant_admin` — a kitchen's Admin (role `admin` on the tenant user). Has all permissions for **that tenant only**.
- `staff` — kitchen staff; permission list (`home, pos, orders, kitchen, menu, stock, settings, staff`) enforced per action by API routes.
- Guest — no session; carries `tenant=CODE` in URL / QR, or an unguessable `trackToken`.

---

## 2. Data model & storage

Two interchangeable backends behind `src/lib/db/index.ts` (`useMongo()` decides):

| Layer | File mode (localhost, no `MONGODB_URI`) | Mongo mode (Vercel, `MONGODB_URI` set) |
|---|---|---|
| Platform (super, plans, sessions, leads, tenant registry) | `.data/platform.json` | `platform` collection, one doc `_id:"platform"` |
| Tenant | `.data/tenants/{tenantId}/tenant.json` — one file per kitchen | `tenants` collection — **one document per kitchen**, `_id = tenantId` |
| Media | `.data/media/tenants/{tenantId}/...` served at `/api/media/...` | R2 bucket `tenants/{tenantId}/...` (falls back to file-store) |
| APKs | `.data/apks/...` | R2 (falls back to file-store) |

### Tenant document shape (`TenantState`, `src/lib/tenant-types.ts`)

`id`, `code`, `branding` (name, logoUrl, receiptFooter), `shop` (address, phone, whatsapp,
currency, taxRate, openHours, deliveryFee, packingFee, serviceChargePercent, printLogoOnBill),
`payments`, `specialOffer`, `users[]`, `menu[]`, `stock[]`, `orders[]`, `reviews[]`, `tables[]`,
`guestClients[]`, `dayCloses[]`, `nextOrderNumber`.

**Every tenant read/write is keyed by `tenantId`** (`readTenant`, `writeTenant`, `addOrder`,
`patchOrder`, `updateMenu`, ...). No cross-tenant iteration exists except guest `trackToken`
lookup (`findOrderByTrackToken`) — the token itself is the secret (32-bit random + time).

---

## 3. Core pillars

### 3.1 Multi-tenant isolation

Rules enforced across the stack:

1. **Sessions** (`src/lib/session.ts`): `loginTenant(code, …)` resolves the kitchen via the
   platform registry and binds the session to `tenantId`. `loginSuper` creates a session with
   **no** `tenantId`. `requireTenantSession()` rejects `super`; `requireSuper()` rejects
   impersonating sessions.
2. **Staff APIs** (`/api/admin`, `/api/orders*`, `/api/sales`, `/api/day-close`, `/api/backup`,
   `/api/export`, `/api/media`, `/api/upload`, `/api/admin/apks`): always
   `requireTenantSession(req)` then operate on `session.tenantId` — never on a client-supplied
   tenant id.
3. **Guest APIs** (`POST /api/orders` channel=guest, `/api/guest/payment-proof`): the client
   sends `tenant=CODE`; the server resolves `findTenantMetaByCode(code)` → `meta.id`. A raw
   `tenantId` is never accepted from guests. Suspended kitchens reject ordering (403).
4. **Public menu** (`getPublicMenu`): strips `costPrice`, users, orders, reviews, stock.
   Staff payload (`readTenantStaffView`): strips password hashes, reviews, slices orders.
5. **Platform/HQ APIs** (`/api/super/*`, `/api/leads` GET): `requireSuper` only.
6. **Middleware** (`src/middleware.ts`): host split + security headers; restaurant host returns
   404 for `/control` and `/super`; control host only serves HQ (+ Help-mode staff UI).
7. **Client guards** (`AppShell`): Super without Help is redirected to `/control`; HQ page
   refuses non-super sessions; Customer APK is locked to its baked kitchen code.

Verification checklist (see §5) proves Kitchen A cannot read/write Kitchen B rows.

### 3.2 Order flow & kitchen alert

```
Guest QR → /order?tenant=CODE[&table=N|&mode=…]
  → GET /api/state?tenant=CODE           (public menu, payments, offer)
  → POST /api/orders {channel:"guest", tenantCode, serviceType, lines, payment…}
      server: code → meta.id → assertOrderRules → validate items/stock
      → computeFees(shop, serviceType, lines) → addOrder(tenantId) → status "placed"
  → /track/{trackToken}                  (live status page)

Staff side:
  StaffAlerts (mounted in AppShell on every staff page):
    - polls GET /api/orders?poll=1 every 3s (+ on window focus / visibility return)
    - mergeOrders() into the store → /kitchen board + /orders list re-render
    - detects fresh "placed" orders → persistent alert panel + continuous beep
      (WebAudio, loops until acknowledged) + native APK notification
    - "Stop alert" = acknowledge; beep also stops once every alerted order is
      accepted (status leaves "placed") — kitchen "Mark accepted" counts.
  /kitchen: lanes placed → accepted → preparing → ready; print 58mm kitchen ticket.
  /orders: advance status, mark paid, complete/void, WhatsApp status messages, print bill.
```

### 3.3 POS & 58mm thermal print

- **POS** (`/pos`): counter sales; cart → `POST /api/orders {channel:"pos"}` (tenant session
  required) → prints 58mm customer bill automatically.
- **Receipt layout** (`src/lib/print.ts`) — AsFix-style 58mm slip:
  - Paper 58mm; printable content ~48mm / ~32 monospace columns.
  - Header: centered logo (≤42% width, tick-on-print via `shop.printLogoOnBill`), uppercase
    shop name, address, phone.
  - Meta: Bill #, date, time, type (dining/takeaway/delivery/counter + table), payment method,
    guest name/phone.
  - Items: name on its own line, `qty x rate` left, line total right; modifiers/notes indented.
  - Totals: subtotal, packing, delivery, service, GST/Tax, **TOTAL** with currency (PKR).
  - Footer: dashed rule, "Thank you / Visit again", `branding.receiptFooter` (English/Urdu),
    phone; `✓ PAID` tick when payment is paid/verified.
  - Kitchen ticket: no prices, larger qty × item lines, table + guest.
- **Output paths**: (1) native Bluetooth ESC/POS via Capacitor `AsfixThermalPrint` in the Staff
  APK (saved printer in Settings); (2) opt-in local bridge `http://127.0.0.1:9100/print`
  (32-column plain text); (3) browser HTML print dialog sized to 58mm.
- **Money**: PKR integers (`Rs 1,234`); fees computed server-side
  (`computeFees`: delivery only for delivery, packing for pickup/delivery, service charge % of
  subtotal, GST on the taxable base, rounded to the rupee).

### 3.4 Super HQ vs restaurant guard

- HQ (`/control`) is served only on the control host; restaurant host 404s it.
- `requireSuper` on every HQ API; Super sessions carry no `tenantId`, so they cannot pass
  `requireTenantSession` — HQ stays HQ.
- Help mode creates a **separate** `tenant_admin` session flagged `impersonating:true`
  (Super's token is parked in `OWNER_TOKEN_KEY`); AppShell shows a yellow banner with
  "Back to ORDO HQ". `requireSuper` rejects impersonating sessions.
- Staff pages render only after `/api/state` returns a tenant session; a Super token returns
  `{session}` with no tenant payload and the shell bounces to `/control`.

---

## 4. Security notes

- Passwords: scrypt (`src/lib/password.ts`). `superKnownPassword` is a Super-only recoverable
  copy — never returned on staff/public APIs.
- Track tokens: unguessable, treated as bearer secrets for the guest track page.
- Uploads: kind + size + content-type validated; R2 keys prefixed `tenants/{tenantId}/…`.
- Local file media path is sanitized against `..` traversal.
- CORS: only app/control origins on the API host.

## 5. Isolation verification checklist

1. Login as Admin of Kitchen A and Kitchen B in two browsers.
2. Create an order in B (guest QR `/order?tenant=B`). A's `/kitchen`, `/orders`, `/sales`,
   `/day-close`, `/settings` must not show it; A's POS must not print it.
3. `GET /api/state?tenant=B` must not include A's menu/orders/users.
4. With A's session token, `GET /api/super/tenants` and `/api/leads` → 403.
5. With Super token, `GET /api/orders`, `/api/admin` → 403 (Tenant session required).
6. Suspended kitchen: staff login blocked; guest ordering blocked; menu browse allowed.
7. Staff without `orders`/`kitchen` permission cannot PATCH orders (403).
8. `track/{token}` from B's order does not expose A data.
9. `/control` and `/super` on `ordo.asfins.com` → 404; `/api/*` on the API host only.

## 6. Known limits (accepted)

- Mongo tenant writes are read-modify-replace on the whole tenant doc; two truly concurrent
  orders on the *same* kitchen could race `nextOrderNumber`. File mode serializes via one file.
- Poll-based kitchen alerts (3 s) rather than WebSocket/SSE — fine for a POS LAN.
- WebAudio beep requires one "Enable order sound" tap per device (browser autoplay policy).
