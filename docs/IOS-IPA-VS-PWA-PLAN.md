# iPhone IPA vs Profile vs Web install — plan (decide before apply)

**Status:** Plan only — apply later after you choose a path.  
**Companion:** `docs/IOS-PWA-SAFE-PLAN.md` (already shipped: Safari + Add to Home Screen).

---

## Short answer

| Question | Answer |
|---|---|
| Kya IPA Android APK jaisi WhatsApp pe bhej ke install hoti hai? | **Nahi** — normal iPhone pe free/open IPA install **nahi** milti |
| Kya “profile install” jaisa IPA lagti hai? | **Almost no** — configuration **profiles** (.mobileconfig) alag cheez hain (Wi‑Fi, MDM, VPN). IPA = app binary |
| Ab ORDO pe iPhone kaise chalta hai? | **Website / PWA** — Safari → Share → **Add to Home Screen** (Settings → Install on iPhone) |

---

## 1. Teen alag cheezein (mix mat karo)

### A) Configuration Profile (`.mobileconfig`)
- Settings → Profile Downloaded → Install  
- Use: Wi‑Fi, email, MDM enrollment, certificates  
- **Restaurant POS/Customer app nahi banati**  
- ORDO ke liye recommended path **nahi**

### B) IPA (iOS App archive)
- Android ke `.apk` ka cousin  
- Install ke liye Apple signing + trust chahiye  
- Public WhatsApp “bhejo aur install” **Store / TestFlight / Enterprise / computer sideload** ke baghair **kaam nahi karta** (iOS security)

### C) Web / PWA (ORDO abhi yeh use karta hai)
- Koi Apple Developer binary build zaroori nahi (v1)  
- Link: `tenant=CODE` locked — **merge nahi**  
- Home Screen pe icon (Safari → Add to Home Screen)  
- Logo/name Settings se live (in-app)

---

## 2. Agar future mein asli IPA chahiye — options

| Path | Kaun install kare | Cost / difficulty | Merge-safe? | Kab choose karein |
|---|---|---|---|---|
| **1. Add to Home Screen (PWA)** ✅ now | Customer/Staff Safari | Free, already live | Yes (`tenant=CODE`) | Default — abhi recommend |
| **2. Apple App Store** | Public download | Apple Developer (~$99/yr), review, per-app or one white-label | Yes if unique bundle id per kitchen **or** one app + code login | Scale / marketing |
| **3. TestFlight** | Invite testers | Same Apple account; 90-day builds | Yes | Soft launch / beta |
| **4. Apple Enterprise / MDM** | Company devices only | Enterprise program + legal entity; profiles push apps | Yes | Chains with managed iPhones |
| **5. Ad Hoc IPA** | Upto ~100 device UDIDs | Rebuild when new phone | Yes | Tiny staff set only |
| **6. Sideload (AltStore / Mac Apple ID)** | Tech users; expires ~7 days | Fragile, not world-pro for diners | Risky UX | **Avoid** for customers |

**World-pro recommendation:**  
- **Diners + most staff:** keep **PWA links** (current).  
- **Optional later:** one **Customer** + one **Staff** App Store app (tenant code / deep link) **or** per-restaurant Store listings if budget allows.  
- **Do not** promise WhatsApp IPA like Android APK without Enterprise/Store.

---

## 3. “Profile jaisi install” confusion

Kabhi MDM profile se **managed app** push hoti hai — user ko Profile + App dono dikhte hain. Yeh:

- Sirf **organization-owned / MDM-enrolled** phones pe  
- Har restaurant ke liye MDM setup heavy hai  
- Consumer customer phones pe practical nahi  

Is liye ORDO v1 = **PWA**, not MDM profiles.

---

## 4. Per-kitchen isolation (IPA hone pe bhi same rules)

Chahe PWA ho ya IPA:

1. Start URL / deep link mein `tenant=CODE`  
2. Bundle id strategy:  
   - **PWA:** alag Home Screen shortcuts per URL  
   - **IPA white-label:** `com.ordo.customer.{code}` jaisa Android  
   - **Single Store app:** user enters/scans code — still no cross-tenant API  
3. Admin Settings logo → in-app brand  
4. Kabhi Super HQ customer/staff shell mein nahi  

---

## 5. Apply checklist (jab aap bolo “apply”)

### Phase A — already done (verify after deploy)
- [x] Settings → Install on iPhone (Customer + Staff copy links)  
- [x] Dynamic manifest / Apple meta  
- [x] Locked customer shell  

### Phase B — only if you choose IPA later
- [ ] Apple Developer account  
- [ ] Capacitor iOS project (`mobile/ordo-guest` / `ordo-pos` → `npx cap add ios`)  
- [ ] Signing (Team ID, certificates, provisioning)  
- [ ] Build IPA / upload TestFlight or Store  
- [ ] Super upload slot for `.ipa` (like APK) **or** Store-only distribution  
- [ ] Docs for Admin: iPhone = TestFlight/Store link, not raw IPA WhatsApp  

### Phase C — never for diners
- [ ] Raw unsigned IPA WhatsApp  
- [ ] Random “profile install IPA” tutorials  

---

## 6. Decision for you

**Abhi (recommended):** iPhone = **Safari link → Add to Home Screen** (profile/IPA ki zaroorat nahi).  

**Baad mein IPA/App Store** tab apply karein jab:
- Apple Developer ready ho, aur  
- Aap TestFlight **ya** App Store path choose karo  

Jawab do: **PWA enough** hai, ya **TestFlight/Store IPA** ka Phase B start karna hai? Uske baad apply.
