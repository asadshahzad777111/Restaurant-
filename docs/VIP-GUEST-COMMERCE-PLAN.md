# VIP guest commerce + polish plan

World-professional Customer (web / iOS PWA / Android APK shell) + Admin controls.

## Goals
1. **Payment choice** — COD (optional) + advance pay (Bank / JazzCash / EasyPaisa) with Admin-editable accounts  
2. **Payment proof** — customer uploads screenshot → staff/counter sees it before starting work  
3. **COD toggle** — Admin backend can disable COD entirely  
4. **Special offer popup** — Admin creates offer; guest sees dismissible popup  
5. **Cart UX** — sticky place-order bar (no scroll hunt) + elegant “item flies into bag” animation  
6. **Order ready alert** — popup / browser notify when status becomes ready (works in PWA; APK WebView same)

## Isolation
All tenant-scoped. No cross-kitchen merge.

## Data (per tenant)
```ts
payments: {
  codEnabled: boolean;
  advanceEnabled: boolean;
  methods: {
    bank?: { enabled; title; accountName; accountNumber; bankName; iban? };
    jazzcash?: { enabled; title; accountName; accountNumber };
    easypaisa?: { enabled; title; accountName; accountNumber };
  };
}
specialOffer: {
  enabled: boolean;
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  updatedAt: string;
}
```
Order fields: `paymentMethod: 'cod' | 'bank' | 'jazzcash' | 'easypaisa'`, `paymentProofUrl?`, `paymentStatus: 'unpaid' | 'proof_submitted' | 'verified' | 'cod'`

## UX
| Surface | Behaviour |
|---|---|
| Order menu | Sticky bottom bag: items count + total + Place order |
| Add item | Item thumbnail animates toward bag (slow, professional) |
| Checkout | Pay COD (if on) or Advance → pick method → show Admin numbers → upload screenshot |
| Track / open order | Poll status; when `ready` → modal + optional Notification |
| Admin Settings | Payments card + Special offer card + COD switch |
| Staff Orders | Show payment proof thumb; mark verified |

## Ship
Branch `cursor/vip-guest-commerce-bf2f` → main when green.
