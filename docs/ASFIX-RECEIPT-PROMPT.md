# AsFix 58mm receipt blueprint — paste this prompt

Use this with the AsFix / AsFix & Gear agent at [asfixgear.com](https://asfixgear.com) (or any other agent that can inspect that site). Goal: extract a **58mm thermal** receipt blueprint for ORDO, not a Windows printer driver.

---

## English (paste this)

You are extracting a **58mm thermal receipt blueprint** for ORDO restaurant POS. Do **not** invent Windows kernel drivers or vendor secrets. Return a practical spec we can map to ESC/POS and to an HTML slip (`width: 58mm`, Courier, dashed rules).

Please extract and write down, in this order:

1. **58mm layout**
   - Paper width: 58mm (typical printable ~32 columns / ~48mm content).
   - Header: shop name (uppercase, centered), optional address, optional phone.
   - Meta block: Bill #, date, time, service type (dining / pickup / delivery / counter + table), payment method.
   - Item lines: name on its own line; `qty x rate` left, line total right.
   - Modifiers and line notes indented under the item.
   - Totals: subtotal, packing, delivery, service, GST/tax, then **TOTAL** (currency + amount).
   - Footer block after a dashed rule.

2. **Logo**
   - Where the logo sits (centered, above shop name).
   - Max width as a % of 58mm (e.g. ~42% / ~90px equivalent).
   - Monochrome / dithered 1-bit guidance for thermal (ESC/POS `GS v 0` / raster bit image).
   - What happens if no logo is set (skip, do not print a broken box).

3. **Tick-on-print (logo / mark toggle)**
   - A **tick / checkbox**: print logo on this bill — yes/no.
   - If ticked, send logo raster then text. If unticked, text-only header.
   - Optional small printed tick/check near “paid” or “kitchen copy” if that exists on AsFix samples.
   - Kitchen ticket: **no prices**, no logo required, larger qty×item lines.

4. **Footer**
   - Centered “Thank you” / “Visit again”.
   - Restaurant-configurable footer line (English or Urdu / Roman Urdu).
   - Repeat shop phone under the footer if present.
   - Cut command after a few feed lines (`GS V`).

5. **ESC/POS flow (public commands only)**
   - Init (`ESC @`).
   - Optional logo: tick-on-print → raster image → feed.
   - Align center for header; left for items; emphasize TOTAL.
   - Code page / UTF-8 note for Urdu if the printer supports it; otherwise ASCII/Roman Urdu fallback.
   - Open cash drawer pulse only if the job is a paid counter bill (optional).
   - Feed + partial/full cut.
   - Return a **32-column plain-text** fallback identical in content to the 58mm HTML slip, for a local COM/TCP bridge (`127.0.0.1:9100`) when native USB is not used.

Output format:
- A layout diagram (ASCII) of the 58mm slip.
- A field list mapped to ORDO: `branding.name`, `branding.logoUrl`, `branding.receiptFooter`, `shop.address`, `shop.phone`, order number, lines, fees, TOTAL.
- An ordered ESC/POS command list (no proprietary SDK keys).
- Call out anything on asfixgear.com that is hardware-specific vs. layout-only.

ORDO already prints a browser 58mm HTML slip. We need this blueprint so native ESC/POS can match it.

---

## Roman Urdu (paste this — same request)

Aap AsFix / AsFix & Gear (asfixgear.com) se **58mm thermal receipt** ka blueprint nikaalein. Windows kernel driver ya secret keys mat likhein. ORDO restaurant POS ke liye practical spec chahiye — HTML slip (`58mm`, Courier, dashed lines) aur ESC/POS dono ke liye.

Is order mein extract karein:

1. **58mm layout** — paper 58mm; header (shop name, address, phone); bill #, date/time, service type, payment; items (`qty x rate` + amount); modifiers/notes; subtotal / packing / delivery / service / GST; **TOTAL**.
2. **Logo** — center, name ke upar; max width ~42% of 58mm; thermal 1-bit/raster; agar logo na ho to skip.
3. **Tick-on-print** — checkbox: is bill pe logo print ho ya nahi. Tick ho to pehle logo raster, phir text. Kitchen copy: prices nahi, logo zaroori nahi. Paid/kitchen ke paas chhota tick mark ho to woh bhi likhein.
4. **Footer** — “Thank you” / “Visit again”; restaurant ka custom footer (English ya Roman Urdu); phone; us ke baad paper cut.
5. **ESC/POS flow** — `ESC @`, optional logo, align, TOTAL bold, Urdu ke liye code page ya Roman Urdu fallback, feed + `GS V` cut. 32-column plain text fallback bhi do (local bridge `127.0.0.1:9100`).

Output: ASCII diagram, ORDO fields ki mapping, ESC/POS command list (public only), aur jo cheez hardware-specific ho woh alag se likhein.

---

ORDO mapping (for the other agent, do not skip):

| Slip field | ORDO source |
|---|---|
| Shop name | `tenant.branding.name` |
| Logo | `tenant.branding.logoUrl` (tick-on-print) |
| Address / phone | `tenant.shop.address`, `tenant.shop.phone` |
| Footer | `tenant.branding.receiptFooter` |
| Bill | `order.number` |
| Lines | `order.lines` (+ modifiers, `lineNote`) |
| Fees | `order.fees` (subtotal, packing, delivery, service, tax) |
| Total | `order.total` + `tenant.shop.currency` |
