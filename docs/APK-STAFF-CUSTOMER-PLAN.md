# Staff + Customer APK — what goes in each

Two Android shells. Super creates a restaurant → Admin gets **that kitchen’s** apps. Kitchens never mix.

| App | Who | Home-screen name | Opens |
|---|---|---|---|
| **Staff** | Admin, cashier, kitchen | `{Restaurant} Staff` | POS, orders, kitchen, thermal print |
| **Customer** | Diners | `{Restaurant} Order` | That kitchen’s menu only |

Phone **icon/label** needs a rebuild (`scripts/build-tenant-apks.cjs`) + Super → Apps upload.  
**Inside** the app, restaurant name + logo follow **Settings** live (no rebuild).

---

## Staff APK (admin / POS / kitchen)

Same login for every role. Permissions decide the screens.

| In the app | Notes |
|---|---|
| Hello + restaurant name + person name on top | First open: welcome sheet |
| Home hub | POS, Kitchen, Orders, Tables, Day close, Sales |
| POS / billing | Counter tickets |
| Kitchen display | Tickets + order beep |
| Bluetooth thermal print | Staff APK only (not Chrome) |
| Admin: Your apps | Download Customer APK → WhatsApp to guests |
| Admin: Settings | Name, logo, hours, payments, staff logins |
| Never Super HQ | `/control` stays off this app |

---

## Customer APK (guests)

| In the app | Notes |
|---|---|
| Restaurant name + logo on top | Locked to `tenant=CODE` |
| First-open welcome | “Welcome to {Restaurant}” |
| Menu, cart, COD / JazzCash / EasyPaisa | Same as website guest |
| Order-ready track | No kitchen beep, no POS, no print |

---

## New restaurant (Super)

1. Super → Your restaurants → Add restaurant + Admin  
2. Super → Apps → upload **Staff** + **Customer** APKs for that code  
3. Admin logs in → Settings → Your apps → send **Customer** to diners, **Staff** to team  

In-app name is the restaurant display name from step 1 (editable in Settings).
