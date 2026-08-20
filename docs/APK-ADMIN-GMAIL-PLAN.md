# APK + Admin/Super flow plan (apply now)

## Goals
1. Super opens any kitchen Admin in one click (Help) — no restaurant password.
2. Super sees each kitchen’s Admin/staff **username, password, Gmail/email** and can reset them.
   - Panel: control.asfins.com → Your restaurants → **Passwords & Gmail**
   - Login hash is scrypt; Super keeps a recoverable copy when creating/resetting (see `docs/SUPER-PASSWORDS.md`).
3. Admin can change own password + Gmail from Settings.
4. Clients (and staff) can **Sign in with Google** when `GOOGLE_CLIENT_ID` is set; account ties to restaurant **code**.
5. Customer APK: distinct motion, notification permission + later popup tips/messages, always-on **scanner → menu**.
6. Pause / past_due billing: banners + soft rules; **scanner → menu still works**; place-order blocked only when fully suspended.
7. Fix camera Permissions-Policy so `/scan` works in APK WebView.

## Isolation (unchanged)
Staff APK never opens Super. Customer APK never opens Admin. Per-tenant APK deep links keep codes separate.
