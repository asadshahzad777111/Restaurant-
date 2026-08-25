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
| `GET` | `/api/print/bridge` | `{ connected, lastSeen, printerName, queued }` for the POS green/red lamp |
| `GET` | `/api/print/bridge/live` | SSE stream of the same payload. Pushes on Staff heartbeat so the lamp flips green immediately; rechecks every ~1s so it goes red ~8s after the phone drops. |
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

## Web / iPhone Print to Android

On **laptop website and iPhone Safari**, POS / Orders / Kitchen / Printer always show an **Android printer: connected** or **not connected — open Staff APK** bar.

Charge or Print **always** opens a chooser (not a silent browser print):
- **Print to Android** / **Queue for Android** — always enqueues the 58mm bill for this kitchen. If Staff APK is online it prints within ~1.5s. If the phone is off, the job waits (up to 30 minutes) and prints as soon as the APK heartbeats again. The laptop cannot talk to Bluetooth itself — the phone is the bridge.
- **Print here (browser)** — fallback.

The POS header and print dialog use a **live green / red lamp** (SSE + 1s poll fallback). No page refresh. Native Staff APK with a saved printer still prints Bluetooth directly (no chooser). Super HQ never opens in the Staff APK.

## Auto-print

Guest **pickup** (takeaway) and **delivery** orders enqueue a customer bill on create (name, phone, location if entered, items, totals). Dining/table stays pay-at-counter; staff **Charge & print** still prints (local or Android). Isolated by `tenantId`.
