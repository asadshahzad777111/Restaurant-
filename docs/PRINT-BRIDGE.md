# AsFix-style print bridge (ORDO)

Laptop / iPhone Safari **never** talk to the Bluetooth printer. The **Staff APK** is the printer host (phone can stay in the pocket). Web enqueues a job; the phone prints 58mm ESC/POS.

**Do not** add apex/www `asfins.com` DNS. Super HQ never opens inside the Staff APK.

## Roles

| Client | Role |
|---|---|
| Staff Android APK (`mobile/ordo-pos`, `/login?app=staff`) | Paired to 58mm printer (Bluetooth/USB). After login, heartbeats + polls jobs and prints. |
| Customer APK | Guests / network orders only. Not a printer host. |
| Laptop website or iPhone Safari | POS / Orders / Kitchen. **Print on Android** when a Staff device is linked. Browser print stays as fallback. |

## Data (per tenant)

Job: `{ id, tenantId, kind: 'bill'\|'kitchen', text (32-col slip), orderId?, createdAt, status: queued\|printing\|done\|failed }`

Bridge: `{ tenantId, lastSeen, printerName }` — Staff APK POST while a printer is selected.

Storage: Mongo `print_jobs` + `print_bridge` when `MONGODB_URI` is set; otherwise `.data/tenants/{tenantId}/print-bridge.json` (same file-store fallback as the rest of the app). Jobs are always filtered by `tenantId`. `requireTenantSession` on every HTTP route.

## HTTP (staff bearer)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/print/bridge` | Heartbeat `{ lastSeen, printerName? }` |
| `GET` | `/api/print/bridge` | `{ connected, lastSeen, printerName }` for POS “Android printer: connected” |
| `GET` | `/api/print/jobs` | Queued jobs for **this** tenant (Staff APK polls every ~1.5s) |
| `POST` | `/api/print/jobs` | Enqueue from web / iPhone |
| `POST` | `/api/print/jobs/[id]` | Ack: `{ status: printing\|done\|failed }` |

Legacy `/api/print-jobs/*` aliases the same store (auth required).

## Staff pairing

1. Install **this kitchen’s Staff APK** (not Customer, not Super).
2. Phone Bluetooth → pair the 58mm printer.
3. Sign in with restaurant code (HQ Super tab is hidden and rejected).
4. **Printer** → list → **Use this**. Header shows **Printer linked**.
5. Keep the APK signed in (screen off / pocket is fine). It heartbeats and prints queued jobs.

## Web / iPhone Print on Android

If Staff lastSeen is recent (~20s), POS Charge, Orders Print, and Kitchen Print offer **Print on Android** (enqueue) plus **Print here (browser)**. Native Staff APK still prints Bluetooth directly and does not enqueue.

## Auto-print

Guest **pickup** (takeaway) and **delivery** orders enqueue a customer bill on create (name, phone, location if entered, items, totals). Dining/table stays pay-at-counter; staff **Charge & print** still prints (local or Android). Isolated by `tenantId`.
