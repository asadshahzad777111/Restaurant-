# ORDO Staff APK — Bluetooth thermal (AsFix kit)

Source kit: https://github.com/asadshahzad777111/asfix-gear/tree/cursor/thermal-print-kit-0711/thermal-print-kit

## What shipped
- Capacitor plugin: `mobile/ordo-pos/plugins/asfix-thermal-print` (Bluetooth SPP ESC/POS)
- Web bridge: `src/lib/thermal/nativePosPrint.ts` — Print pehle native BT try, phir HTML dialog
- Settings / **Printer** menu — tap Printer → pick → Print (AsFix POS style)
- POS Charge & print, Orders Print — native BT first, then HTML dialog

## Rebuild Staff APK (Windows — Android Studio)

```cmd
cd Desktop\Restaurant-\mobile\ordo-pos
npm install
cd plugins\asfix-thermal-print
npm install
npm run build
cd ..\..
npx cap sync android
```

Android Studio → Open `mobile\ordo-pos\android` → Build APK.  
Phir Super → Apps → us kitchen ka **Staff APK** upload.

## Use
1. Phone Bluetooth → printer pair  
2. Staff APK → **Printer** (sidebar) or POS top card → tap **Printer** → **Use this**  
3. Tap **Print** (test) or POS **Charge & print** / Orders **Print**

## Fallback
Agar native fail / no saved printer → pehle wala 58mm HTML print dialog.

## Isolation
Printer choice is **on-device** (localStorage). Receipt content always current kitchen branding/orders — no merge.
