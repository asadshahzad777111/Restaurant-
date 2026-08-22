# ORDO — Email (Resend) Setup Plan

> Goal: make every ORDO transactional email **branded, HTML, responsive, and reliable**,
> then wire the Resend API key once and never touch it again.

## 1. Current state (audit)

- `src/lib/email.ts` — solid transport: `sendResendEmail()` (REST, HTML-ready),
  inbound webhook signature verify, `fetchReceivedEmail()` for receiving.
- `src/lib/notify.ts` — three senders: lead, admin welcome, new-order — **all TEXT-only**
  (no branded HTML). That is the gap to close.
- Env gating (`env.ts`): `resendConfigured()` = `RESEND_API_KEY` + from-address present.
  Health endpoint already reports `integrations.resend`.

## 2. What ORDO emails should look like (world-class)

| Email | To | Content |
|---|---|---|
| New order | restaurant Admin(s) | order #, type, subtotal, total (PKR), track link |
| Admin welcome | new kitchen Admin | code, username, login URL, change-password note |
| Lead notification | ORDO inbox | name, email, phone, restaurant, plan, message, WhatsApp |
| (future) Guest receipt | guest email | order summary + track |

All share one **branded layout**: ORDO orange header, dark footer, table-safe HTML,
responsive 480px width, plain-text fallback retained for non-HTML clients.

## 3. Env vars (Resend account)

| Var | Purpose | Required |
|---|---|---|
| `RESEND_API_KEY` | `re_...` from resend.com → API Keys | ✅ |
| `RESEND_FROM` (or `RESEND_DOMAIN` + `EMAIL_FROM`) | verified sender, e.g. `ORDO <noreply@ordo.asfins.com>` | ✅ |
| `RESEND_NOTIFY_TO` | fallback inbox for leads | optional |
| `RESEND_WEBHOOK_SECRET` | Svix secret for inbound email webhook | optional (inbound) |

## 4. User steps (5 min, one-time)

1. [resend.com](https://resend.com) → sign up (free tier: 100/day).
2. **Domains → Add domain** → `asfins.com` (or a subdomain you control) → add the DNS
   records Resend shows (SPF + DKIM) → wait for "Verified".
3. **API Keys → Create** → copy `re_...`.
4. Put the vars in **Vercel → Project → Settings → Environment Variables** (Production +
   Preview) AND in local `.env.local` (gitignored).

## 5. Implementation (this pass)

- Add `src/lib/email-templates.ts` — shared branded layout + 3 templates (order, welcome, lead).
- Update `notify.ts` to pass `html:` alongside existing `text:`.
- Keep text fallback + `resendConfigured()` graceful-skip (no key → no error).
