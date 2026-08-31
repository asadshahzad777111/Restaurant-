# Food Delivery Platform — Schema + Order State Machine (Phase 1 foundation)

> Deliverable per the build prompt, point 11: start with the database schema and the
> order state machine — everything else depends on them. This document is the design
> truth; the code that implements it lives in `src/lib/order-machine.ts` (state
> machine) and `src/lib/order-events.ts` (real-time event bus).

---

## 1. Architecture (4 surfaces, one backend)

```
┌─────────────┐  ┌──────────────────┐  ┌────────────┐  ┌──────────────┐
│ Customer    │  │ Restaurant       │  │ Rider app  │  │ Admin panel  │
│ web / app   │  │ dashboard        │  │ (RN)       │  │ (ops, pricing│
└──────┬──────┘  └────────┬─────────┘  └─────┬──────┘  │ payouts)     │
       │                  │                  │         └──────┬───────┘
       └──────────────────┴──────────────────┴────────────────┘
                              │
                     Shared backend (Next.js API routes today;
                     NestJS + PostgreSQL + Redis in Phase 2/3)
```

Phase 1 = **Customer web + Restaurant dashboard + basic order flow**. The repo
already ships guest ordering (`/order`, `/scan`, `/track`), POS, kitchen, menu,
stock, day-close, sales — so Phase 1 is largely present; this doc formalizes the
data contracts and the state machine so Phase 2 (riders, real-time dispatch) and
Phase 3 (admin analytics, promos, payouts) extend cleanly.

---

## 2. Order state machine (canonical)

```
PLACED ──→ ACCEPTED ──→ PREPARING ──→ READY_FOR_PICKUP ──→ RIDER_ASSIGNED
                                                              │
              ┌───────────────────────────────────────────────┤
              ▼                                               ▼
   RIDER_ARRIVED_RESTAURANT ──→ PICKED_UP ──→ OUT_FOR_DELIVERY ──→ ARRIVED_CUSTOMER
                                                                      │
                                                                      ▼
                                                                  DELIVERED

CANCELLED / REFUNDED / FAILED  (exit from ANY active state)
```

### 2a. Restaurant-side subset (implemented today, `OrderStatus`)

| From            | Allowed to                                  |
|-----------------|---------------------------------------------|
| `placed`        | `accepted`, `cancelled`                    |
| `accepted`      | `preparing`, `cancelled`                   |
| `preparing`     | `ready`, `cancelled`                       |
| `ready`         | `out_for_delivery`, `completed`, `cancelled` |
| `out_for_delivery` | `completed`, `cancelled`                |
| `completed`     | *(terminal)*                               |
| `cancelled`     | *(terminal)*                               |

Rules enforced in `src/lib/order-machine.ts`:
- **Validated transitions** — illegal jumps are rejected (HTTP 400) before the
  store is touched.
- **Idempotent** — same-state patches are no-ops (webhook/retry safe).
- **Audit trail** — every change appends `{status, at, note: "… by <actor>"}` to
  `order.statusHistory` (timestamp + actor, per prompt point 10).
- **Real-time** — every change emits an event through `order-events.ts`
  (isolated service; transport swaps to Redis Streams/WebSocket in Phase 2).

### 2b. Phase 2 rider states (implemented foundation)

`rider_assigned → rider_arrived_restaurant → picked_up → arrived_customer → delivered`

Implemented in `order-machine.ts`:
- `RIDER_STATES` + `RIDER_TRANSITIONS` — validated rider lifecycle (illegal jumps
  rejected, idempotent, `cancelled` exit allowed until pickup).
- `RIDER_FLOW` — maps each rider state to the shared order's `OrderStatus`
  (`rider_assigned…arrived_customer → out_for_delivery`, `delivered → completed`)
  so the restaurant/customer surfaces keep working unchanged.
- Rider app (React Native) and dispatch live in `rider-types.ts` + `dispatch.ts`
  — see section 3b.

### 2c. Rider dispatch (implemented, pure + testable)

`src/lib/dispatch.ts` — the prompt's "smart part", simple version first:
- `haversineKm` — great-circle distance (deterministic).
- `rankAvailableRiders` — online only, not carrying an active order, within
  `maxRadiusKm`, sorted by distance then load (prompt: rank by distance + load).
- `createOffer` / `decideOffer` — offer with accept/reject window (18s default,
  prompt: 15–20s); decline/expiry falls to the next rider.
- `dispatchOrder` — one pass over candidates, first accepted offer wins;
  `noRiderInRange` flag for ops visibility.

`src/lib/rider-types.ts` — shared contracts: `Rider`, `RiderLocation`,
`DispatchOffer`, `DISPATCH_DEFAULTS`. Verified by a 19-case test suite (all
passing): distance sanity, ranking filters, nearest-first, offer lifecycle
(accept/decline/expire/idempotent), rider state machine rules, and the
`RIDER_FLOW` → `OrderStatus` mapping.

### 2d. Rider API + dispatch wiring (implemented, live)

| endpoint | method | purpose |
|----------|--------|---------|
| `/api/riders` | POST | upsert rider (register) + presence ping (online toggle, lat/lng every 3–5s) |
| `/api/riders` | GET | list this tenant's riders (admin dispatch view) |
| `/api/dispatch` | POST | offer the nearest available rider for a **ready** delivery order (persisted `offered` offer with accept window; order stays ready) |
| `/api/riders/offers` | POST | rider accept/decline: accept → rider busy + `ready → out_for_delivery` + event; decline → next ranked rider gets a fresh offer (fall-to-next, prompt section 3) |

Riders + offers persist per-tenant (`TenantState.riders`, `TenantState.dispatchOffers`,
file + Mongo) with the same isolation as users/staff. Shop `lat`/`lng` (optional on
`TenantShop`) is the dispatch origin. Verified end-to-end: dispatch → nearest rider
offered → decline → **next** rider offered (declined riders excluded) → accept →
order `out_for_delivery`, rider busy; idempotent re-dispatch returns the outstanding
offer.

---

## 3. Database schema (PostgreSQL, Phase 2 target — matches prompt point 11)

Today the repo persists per-tenant JSON (file store / MongoDB). The canonical
relational schema below is the Phase 2 target and the contract the API layer
already approximates.

### users
| column     | type        | notes                              |
|------------|-------------|------------------------------------|
| id         | uuid PK     |                                    |
| role       | enum        | `customer` \| `restaurant_owner` \| `restaurant_staff` \| `rider` \| `admin` \| `super` |
| phone/email| text        | unique-ish, login identity         |
| password_hash | text    | bcrypt/argon2                      |
| restaurant_id | uuid FK | null for customers/riders         |
| created_at | timestamptz |                                   |

### restaurants
| column       | type        | notes                          |
|--------------|-------------|--------------------------------|
| id           | uuid PK     |                                |
| name         | text        |                                |
| code         | text UNIQUE | short QR/join code (today: tenant.code) |
| address      | jsonb       | formatted + lat/lng            |
| open_hours   | jsonb       |                                |
| commission_pct | numeric  | admin pricing rule             |
| status       | enum        | active \| suspended \| past_due |
| plan_id      | text        | starter/pro/enterprise         |

### menu_items
| column      | type    | notes                                  |
|-------------|---------|----------------------------------------|
| id          | uuid PK |                                        |
| restaurant_id | uuid FK | index                              |
| name, price, cost_price, category | | |
| available   | bool    | 86 toggle mid-shift                   |
| modifiers   | jsonb   | variant groups + price deltas          |
| stock_qty, stock_low | numeric | optional ingredient stock (existing `stock`) |

### orders
| column         | type     | notes                                  |
|----------------|----------|----------------------------------------|
| id             | uuid PK  |                                        |
| restaurant_id  | uuid FK  |                                        |
| customer_id    | uuid FK  | nullable (walk-in POS)                 |
| rider_id       | uuid FK  | nullable until assigned (Phase 2)      |
| channel        | enum     | guest \| pos                           |
| service_type   | enum     | table \| pickup \| delivery \| counter |
| status         | enum     | order state machine (2a/2b)            |
| payment_method | enum     | cash \| card \| wallet \| bank \| jazzcash \| easypaisa \| cod \| paid_in_advance \| pay_at_counter |
| payment_status | enum     | unpaid \| paid \| cod_pending \| proof_submitted \| verified |
| subtotal, delivery_fee, packing_fee, service_charge, tax, discount, total | numeric | |
| delivery_address | jsonb | formatted + lat/lng + instructions   |
| status_history | jsonb    | audit trail `[{status, at, actor, note}]` |
| created_at, updated_at | timestamptz | |

### order_items
| column      | type   | notes                          |
|-------------|--------|--------------------------------|
| id          | uuid PK|                                |
| order_id    | uuid FK|                                |
| menu_item_id| uuid FK|                                |
| name_snapshot | text | immutable at order time        |
| qty, unit_price | numeric |                              |
| modifiers_snapshot | jsonb |                            |
| line_note   | text   |                                |

### payments
| column      | type    | notes                                  |
|-------------|---------|----------------------------------------|
| id          | uuid PK |                                        |
| order_id    | uuid FK | one-to-many (partial + final)          |
| method, rail| enum    | jazzcash \| easypaisa \| bank \| card  |
| amount      | numeric |                                        |
| status      | enum    | initiated \| proof_submitted \| verified \| failed \| refunded |
| gateway_ref | text    | idempotency key / provider tx id        |
| created_at  | timestamptz |                                   |

### payouts (Phase 3)
| column       | type   | notes                        |
|--------------|--------|------------------------------|
| id           | uuid PK|                              |
| restaurant_id| uuid FK|                              |
| period_from, period_to | date |                  |
| gross, commission, net | numeric |                   |
| status       | enum   | pending \| paid \| disputed  |

### reviews
| column       | type   | notes                              |
|--------------|--------|------------------------------------|
| id           | uuid PK|                                    |
| order_id     | uuid FK|                                    |
| food_rating  | smallint | 1–5 (goes to restaurant) — `review.rating` today |
| delivery_rating | smallint | 1–5 (goes to rider) — `review.deliveryRating`, never conflated with food |
| comment      | text   |                                    |

> Implemented (Phase 1): track page collects food + delivery stars separately
> (delivery only for delivery orders); the reviews API stores both; item star
> ratings aggregate from the food rating only.

### promo_codes (Phase 3)
| column     | type   | notes                                   |
|------------|--------|-----------------------------------------|
| id         | uuid PK|                                         |
| code       | text UNIQUE | rate-limit + fraud-check from day one |
| type, value, max_uses, per_user, valid_from, valid_to | | |

---

## 4. Real-time contract (isolated service)

`src/lib/order-events.ts` is the only emit point. Event types:

| event                 | payload extras            | consumed by                          |
|-----------------------|---------------------------|--------------------------------------|
| `order.created`       | tenantId, orderId, number | restaurant queue, auto-print, alerts |
| `order.status_changed`| from, to, actor           | customer track, kitchen lanes        |
| `order.cancelled`     | from, to, actor           | customer, stock restore              |
| `order.payment_changed`| paymentStatus            | admin, day-close, rider COD ledger   |

Phase 2 transport: Redis Streams → WebSocket channels
`customer:<orderId>`, `restaurant:<tenantId>`, `rider:<riderId>`.

### 4a. SSE consumers (Phase 1, live today)

Server-Sent Events endpoints consume the event bus and push to browsers the
moment events fire — no polling. Both keep their old polling as a fallback.

| endpoint | auth | pushes | consumed by |
|----------|------|--------|-------------|
| `GET /api/track/[token]/stream` | track token (public) | `order.status_changed`, `order.cancelled` | customer track page |
| `GET /api/orders/stream` | staff Bearer | all tenant events (`order.created` etc.) | StaffAlerts → /orders + /kitchen live refresh |

The `/orders` API also accepts `?poll=1` (3s staff polling) as a graceful
fallback when the stream drops. Transport swaps to Redis/WebSocket in Phase 2
without touching route handlers — they only call `emitOrderEvent()`.

---

## 5. COD reconciliation (must be first-class, prompt point 10)

- `payment_method = cod` → `payment_status = cod_pending` (never "unpaid").
- **Implemented:** `POST /api/riders/collect {orderId}` — rider collects cash on
  delivery → `cod_pending → paid`, records `codCollectedAt` + `codCollectedBy`
  (rider id + name), emits `order.payment_changed`, and releases the rider
  (clears `activeOrderId`). Idempotent (already-paid → no-op).
- **Implemented:** day-close (`GET/POST /api/day-close`) now returns
  `codCollectedTotal` vs `codPendingTotal` alongside `byPayment` — admin sees
  exactly how much rider cash has been banked vs still outstanding. Day-close
  page renders a "COD reconciliation" block (Collected vs Pending).
- POS/counter cash sales are **paid at the till** (`payment_status = paid` at
  creation) — no manual "Mark paid" needed (implemented in `api/orders/route.ts`).

Verified end-to-end: COD order → dispatch → rider accepted → rider collect →
`paymentStatus=paid`, `codCollectedBy=rider_near`, rider released; day-close
showed collected + pending = total COD (3680 + 14720 = 18400).

---

## 5b. Admin analytics (Phase 3, implemented)

`src/lib/analytics.ts` (isolated, pure — 10-test suite passing) + `GET /api/analytics`:

| metric | source | notes |
|--------|--------|-------|
| order volume by day | orders (cancelled excluded) | zero-filled last N days |
| avg fulfillment minutes | statusHistory placed → completed | null when no usable pairs |
| cancellation rate | cancelled / all | 0–1 |
| rider utilization | riders online vs busy | busy/online % |
| avg delivery order value | delivery orders, non-cancelled | gross / count |

Sales & Profit page renders an "Operations analytics" card (stat grid + volume
bars). City-level heatmaps are Phase 4 (needs geocoded customer addresses).

---

## 5c. Promo / coupon engine (Phase 3, implemented)

`src/lib/promo.ts` (isolated, pure — 18-test suite passing) + `GET/POST /api/promos`
+ `DELETE /api/promos/[id]` + guest `POST /api/promos` validation (tenantCode):

- **Types:** `flat` (PKR off) or `percent` (1–100, optional maxDiscount cap).
- **Rules:** minSubtotal, validFrom/To, enabled toggle.
- **Fraud/limits (prompt point 10):** `maxUses` (global) + `perUser` limits are
  enforced from a persisted redemption ledger (`promoUsage`) — every apply
  appends a row, so limits cannot be bypassed by retries. `suspiciousUsagePattern`
  flags customers whose orders are all discounted >90%.
- **Checkout:** guest orders accept `promoCode`; discount folds into
  `computeFees`, order stores `promoCode`, and the redemption is recorded with
  the real orderId.

Verified end-to-end: admin created `SAVE500` (flat 500, min 1500, maxUses 5,
perUser 1) → guest validated (no auth, tenantCode) → checkout applied −500 →
second use by the same phone rejected with `PER_USER_LIMIT` (HTTP 400).

---

## 5d. Payouts (Phase 3, implemented — commission transparency)

`src/lib/payout.ts` (isolated, pure — 10-test suite passing) + `GET /api/payouts`:

| line item | source |
|-----------|--------|
| gross sales | non-cancelled orders in window |
| platform commission | `shop.commissionPct` (default 10%) × gross |
| rider COD banked | COD orders already marked paid (rider cash-in) |
| **net payout** | gross − commission − COD banked |

Sales & Profit page renders a "Payout" card: gross, commission %, rider COD
banked, and net payout — the transparency that reduces vendor churn (prompt
section 5). Commission is editable per kitchen in `TenantShop.commissionPct`
(admin/settings pricing rule, prompt section 7).

---

## 6. Assumptions flagged (confirm before Phase 2 goes deep)

| assumption | default | note |
|------------|---------|------|
| Payment gateway | JazzCash + EasyPaisa + COD first; cards via HBL/Bank Alfalah/PayPro | Stripe lacks full PK support; COD dominant |
| Maps & routing | Google Maps (Directions + Distance Matrix); OSRM self-host as cheaper alt | confirm PK coverage + pricing |
| Notifications | FCM push + WhatsApp Business API + SMS fallback | WhatsApp highest open rate in PK |
| Rider platform | React Native (background GPS + push) | Phase 2 |
| Real-time | Redis Streams + Socket.io | Phase 2; event contract already isolated |
| Multi-city | single-region first, shard by city later | keep `city_id` on restaurants/orders |
