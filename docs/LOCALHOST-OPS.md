# Localhost ops pack — where to click

| # | Feature | Where | What changed |
|---|---|---|---|
| 1 | Cancel / void | Staff → **Orders** → Cancel/Void + reason | Status `cancelled` + history note; track shows void. **No refund.** |
| 2 | Fees | **Settings** → Fees | Delivery / packing / service % / GST. Guest checkout + POS + receipts. |
| 3 | 86 | **Menu** → Available · tap 86 | Guest menu hides unavailable; POS greys + blocks. |
| 4 | Low stock | **Home** + **POS** banners | Soft drinks low in demo; warns only, does not block. |
| 5 | Day close | **Day close** | 24h preview by payment; Close shift & print. |
| 6 | Tables | **Tables** | empty / occupied / bill; table orders sync; complete/cancel frees. |
| 7 | Modifiers | Guest tap burger / POS | Size/spice/add-ons on Classic Beef; kitchen + bill lines. |
| 8 | Receipts | Orders → Bill / Kitchen print | Browser print templates; tenant logo/name only. |
| 9 | Staff alerts | Any staff screen | “Enable order sound” then toast+beep on new guest orders. |
| 10 | Status msgs | Orders → Msg:* | Copy + WhatsApp share (EN/Roman Urdu mix). |
| 11 | EN + Roman Urdu | Guest menu top-right | EN / Roman Urdu toggle. |
| 12 | Export | Settings → Backup | Menu/Orders JSON+CSV (30d). |
| 13 | Login hygiene | Login + Home banner | Demo password note; Settings change password; `mustChangePassword` flag. |
| 14 | APK prep | `docs/APK-PATH.md` + `public/app-version.json` | Stub only; no store publish. |

## Deferred
- Full modifier editor UI in Menu admin (seeded modifiers work; add-item form doesn’t edit groups yet)
- Editable table map designer (8 demo tables seeded)
- Real ESC/POS / print-job queue (HTML print ready for later plug-in)
- Forced password wall before using app (banner + settings only)
